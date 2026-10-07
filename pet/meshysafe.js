// 3D動畫生成規範 safety layer for rigged Meshy characters. Runs every frame AFTER the page has posed the skeleton and
// BEFORE the frame is drawn. Rotations are quaternions only (spec 2.1); vertex positions are never touched (1.3).
//  3.2  chain joints (spine, neck, tail, ears) <= 30 deg: the excess is handed on to the next joint down the chain, so
//       the overall shape is kept and the bend is shared by more bones
//  1.2  elbow / knee <= 0.8 x 150 deg = 120 deg
//  1.1  a bone turns at most 15 deg from one drawn frame to the next (no popping); a jump in the page's clock (seek /
//       move change while paused) snaps instead
//  1.4  body squash & stretch per axis within 0.92 - 1.08
export function installSafety(THREE, getModel, bones, rig, scene, opt = {}){
  const model = getModel(), D2R = Math.PI / 180;
  const CHAIN_MAX = (opt.chainMax ?? 30) * D2R, LIMB_MAX = (opt.limbMax ?? 120) * D2R, STEP_MAX = (opt.stepMax ?? 15) * D2R, S_MIN = 0.92, S_MAX = 1.08;
  // rest (bind) rotations
  const saved = Object.entries(bones).map(([k, b]) => [b, b.quaternion.clone(), b.position.clone()]);
  model.traverse(o => { if (o.isSkinnedMesh) o.skeleton.pose(); });
  const rest = new Map(Object.values(bones).map(b => [b, b.quaternion.clone()]));
  saved.forEach(([b, q, p]) => { b.quaternion.copy(q); b.position.copy(p); }); model.updateMatrixWorld(true);
  const has = n => bones[n] && rest.has(bones[n]);
  const chains = [['Spine', 'Spine1', 'Chest', 'Neck'], ['Tail1', 'Tail2', 'Tail3', 'Tail4', 'Tail5', 'Tail6'], ['EarL1', 'EarL2', 'EarL3'], ['EarR1', 'EarR2', 'EarR3'], ['HornL1', 'HornL2'], ['HornR1', 'HornR2']]
    .map(c => c.filter(has).map(n => bones[n])).filter(c => c.length);
  // order each chain root -> tip by depth in the hierarchy
  const depth = b => { let d = 0; for (let p = b; p; p = p.parent) d++; return d; };
  chains.forEach(c => c.sort((a, b) => depth(a) - depth(b)));
  const recv = new Map(); if (chains[0] && has('Head') && chains[0].includes(bones.Neck)) recv.set(chains[0], bones.Head);   // the head takes the neck's excess
  const limbs = ['LeftForeArm', 'RightForeArm', 'LeftLeg', 'RightLeg'].filter(has).map(n => bones[n]);
  const all = [...rest.keys()];
  const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), qd = new THREE.Quaternion(), qI = new THREE.Quaternion();
  const angleOf = q => 2 * Math.acos(Math.min(1, Math.abs(q.w)));
  // delta from rest in parent space: q = d * rest  ->  d = q * rest^-1
  const deltaOf = (b, out) => out.copy(b.quaternion).multiply(q1.copy(rest.get(b)).invert());
  const clampBone = (b, max) => { deltaOf(b, qd); const a = angleOf(qd); if (a <= max) return false; qd.slerp(qI, 1 - max / a); b.quaternion.copy(qd).multiply(rest.get(b)); return true; };
  const stats = { chain: 0, limb: 0, step: 0, scale: 0, arm: 0, ground: 0 };
  // 3.1 arm clearance: forearm / hand skin keeps 0.03 from the torso at the SIDES of the body (front contacts with props are left alone)
  const CLEAR = opt.armClear ?? 0.034, /* 0.03 + slack for skin sampling */ nameOf = new Map(Object.entries(bones).map(([k, b]) => [b, k]));
  const sides = []; const torsoS = [];
  model.traverse(o => { if (!o.isSkinnedMesh) return; const si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight, n = o.geometry.attributes.position.count;
    for (let i = 0; i < n; i += 2){ let best = -1, bw = 0; for (let k = 0; k < 4; k++){ const w = sw.getComponent(i, k); if (w > bw){ bw = w; best = si.getComponent(i, k); } }
      const nm = nameOf.get(o.skeleton.bones[best]) || ''; const m = /^(Left|Right)(ForeArm|Hand)/.exec(nm);
      if (m){ let sd = sides.find(x => x.side === m[1]); if (!sd){ sd = { side: m[1], pts: [], arm: bones[m[1] + 'Arm'], abd: 0 }; sides.push(sd); } sd.pts.push({ o, i }); }
      else if (/^(Hips|Spine|Spine1|Chest)$/.test(nm) && i % 4 === 0) torsoS.push({ o, i }); } });
  const footS = []; model.traverse(o => { if (!o.isSkinnedMesh) return; const si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight, n = o.geometry.attributes.position.count; for (let i = 0; i < n; i += 3){ let best = -1, bw = 0; for (let k = 0; k < 4; k++){ const w = sw.getComponent(i, k); if (w > bw){ bw = w; best = si.getComponent(i, k); } } if (/(Foot|Toe|Leg)/.test(nameOf.get(o.skeleton.bones[best]) || '')) footS.push({ o, i }); } });
  const charPos = (b, out) => { b.getWorldPosition(out); return rig.worldToLocal(out); };
  const vv = new THREE.Vector3(), rq = new THREE.Quaternion(), rqi = new THREE.Quaternion(), ZC = new THREE.Vector3(0, 0, 1), tmpA = new THREE.Vector3();
  const skin = (r, out) => { r.o.getVertexPosition(r.i, out); return out.applyMatrix4(r.o.matrixWorld); };
  // nearest torso skin within 0.1 (spatial hash rebuilt once per frame); farther counts as clear
  const CELL = 0.05; let grid = null; const gkey = (x, y, z) => (Math.floor(x / CELL) * 73856093) ^ (Math.floor(y / CELL) * 19349663) ^ (Math.floor(z / CELL) * 83492791);
  const buildGrid = T => { grid = new Map(); for (const t of T){ const k = gkey(t.x, t.y, t.z); let L = grid.get(k); if (!L){ L = []; grid.set(k, L); } L.push(t); } };
  const nearest = (sd) => { let best = 0.1; for (const r of sd.pts){ skin(r, vv); const cx = vv.x, cy = vv.y, cz = vv.z; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++){ const L = grid.get(gkey(cx + a * CELL, cy + b * CELL, cz + c * CELL)); if (L) for (const t of L){ const d = vv.distanceTo(t); if (d < best) best = d; } } } return { d: best }; };
  const abduct = (sd, ang) => { if (!sd.arm || !ang) return; sd.arm.parent.updateWorldMatrix(true, false); sd.arm.parent.getWorldQuaternion(pq); rig.getWorldQuaternion(rq); pq.premultiply(rq.clone().invert());
    const sgn = sd.side === 'Left' ? 1 : -1; const l = new THREE.Quaternion().setFromAxisAngle(ZC, sgn * ang); const loc = pq.clone().invert().multiply(l).multiply(pq); sd.arm.quaternion.premultiply(loc); sd.arm.updateMatrixWorld(true); };
  let prev = null, lastT = null; const snapNext = { v: true };
  const wq = new THREE.Quaternion(), pq = new THREE.Quaternion();
  const prevBR = scene.onBeforeRender;
  scene.onBeforeRender = function (...a){
    if (prevBR) prevBR.apply(this, a);
    if (!model.visible){ snapNext.v = true; return; }   // a hidden character (pages that swap models) is left alone
    model.updateMatrixWorld(true);
    // 3.2 chains: clamp each joint; the next joint keeps its world orientation, so it takes over the excess
    for (const c of chains){ for (let i = 0; i < c.length; i++){ const b = c[i], nx = c[i + 1] || recv.get(c) || null;
        if (nx) nx.getWorldQuaternion(wq);
        if (clampBone(b, CHAIN_MAX)){ stats.chain++; b.updateMatrixWorld(true); if (nx){ nx.parent.getWorldQuaternion(pq); nx.quaternion.copy(pq.invert().multiply(wq)); nx.updateMatrixWorld(true); } } } }
    // 3.1 arm clearance (solved per frame, eased in over time so it never pops)
    const CL = (typeof window !== 'undefined' && window.__armClear != null) ? window.__armClear : CLEAR;
    if (CL > 0 && sides.length){ rig.getWorldQuaternion(rqi); rqi.invert(); const T = torsoS.map(r => skin(r, new THREE.Vector3())); buildGrid(T);
      for (const sd of sides){ if (!sd.arm) continue; const L = 0.35 * (opt.scale || 1); let need = 0;
        const hand = bones[sd.side + 'Hand'] || bones[sd.side + 'ForeArm'], hp = charPos(hand, new THREE.Vector3()), cp = charPos(bones.Chest || bones.Spine1 || bones.Spine, new THREE.Vector3()), hip = charPos(bones.Hips || bones.Spine, new THREE.Vector3());
        const atSide = hp.y < cp.y;   // hand below the chest (arm down); arms reaching up are left as posed
        const n0 = nearest(sd); sd.last = [n0.d, atSide]; if (n0.d < CL && atSide){ // solve the abduction: try, measure, scale (three tries), at most 20 deg
          let lo = 0, hi = 0.35, best = 0.35; for (let it = 0; it < 4; it++){ const mid = it === 0 ? Math.min(0.35, (CL - n0.d) / L * 1.4 + 0.02) : (lo + hi) / 2; abduct(sd, mid); const d1 = nearest(sd).d; abduct(sd, -mid); if (d1 >= CL){ best = mid; hi = mid; } else lo = mid; } need = best; sd.last.push(need); }
        const tStep = snapNext.v ? 1 : 0.08; sd.abd += (need - sd.abd) * tStep; if (sd.abd > 1e-4){ abduct(sd, sd.abd); stats.arm++; } } }
    // 1.2 elbows / knees
    for (const b of limbs) if (clampBone(b, LIMB_MAX)) stats.limb++;
    // 1.1 per-frame step limit
    const t = opt.clock ? opt.clock() : null; const jump = t != null && lastT != null && Math.abs(t - lastT) > 0.1; lastT = t;
    if (prev && !snapNext.v && !jump){ for (const b of all){ const p = prev.get(b); const ang = 2 * Math.acos(Math.min(1, Math.abs(p.dot(b.quaternion)))); if (ang > STEP_MAX){ q2.copy(b.quaternion); b.quaternion.copy(p).slerp(q2, STEP_MAX / ang); stats.step++; } } }
    snapNext.v = false; prev = new Map(all.map(b => [b, b.quaternion.clone()]));
    // 3.1 ground: no skin sinks below the ground plane (y = 0 in the rig's parent); feet may touch, never pass through
    if (opt.ground !== false && footS.length){ let m = Infinity; for (const r of footS){ skin(r, vv); if (vv.y < m) m = vv.y; } const g = (opt.groundY ?? 0) - m; if (g > 0.002){ rig.position.y += g; rig.updateMatrixWorld(true); model.updateMatrixWorld(true); stats.ground = (stats.ground || 0) + 1; } }
    // 1.4 squash & stretch
    for (const ax of ['x', 'y', 'z']){ const v = rig.scale[ax]; const cl = Math.max(S_MIN, Math.min(S_MAX, v)); if (cl !== v){ rig.scale[ax] = cl; stats.scale++; } }
    rig.updateMatrixWorld(true); model.updateMatrixWorld(true);
  };
  return { stats, sides, snap(){ snapNext.v = true; } };
}
