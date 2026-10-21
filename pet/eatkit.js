// 餵食共用（2026-10-18 第 3 批）：少年、成年頁的「開心吃／最愛點心／搖頭不吃」。
// 食物 3D 是 Meshy 做的（./food/*.glb，每個約 1 MB）；寶寶頁有自己的一份（baby.html）。
// 每頁自己決定手和頭怎麼動；這裡管：載入食物、時間軸分段、食物大小（咬一口變小）、碎屑、愛心和星星。
export const FOOD = { bunny: ['hay', 'carrot_cake'], cow: ['corn', 'apple_pie'], puppy: ['bone', 'cheese_cake'], rex: ['meatball', 'spark'], mammoth: ['watermelon', 'mango_ice'], leopard: ['fish', 'sushi'], owl: ['gummy', 'pancake'], turtle: ['cucumber', 'pudding'], pangolin: ['antstick', 'eggtart'], penguin: ['sardine', 'soda'], bear: ['acorn', 'berryjelly'], sparky: ['cloudmallow', 'macaron'], magpie: ['papaya', 'pineapplecake'], dragon: ['sweetpotato', 'bubbletea'] };
export const WRONG = { bunny: 'bone', cow: 'meatball', puppy: 'corn', rex: 'hay', mammoth: 'chili', leopard: 'onion', owl: 'bittermelon', turtle: 'coffee', pangolin: 'chili', penguin: 'onion', bear: 'bittermelon', sparky: 'coffee', magpie: 'chili', dragon: 'onion' };   // 搖頭不吃：拿別人的日常食物示範
export const EAT_T = 6.0, SNACK_T = 7.0, REFUSE_T = 5.0;
export const isEat = m => m === 'eat' || m === 'snack' || m === 'refuse';
export const period = m => (m === 'snack' ? SNACK_T : m === 'refuse' ? REFUSE_T : EAT_T);

const clamp01 = x => Math.max(0, Math.min(1, x));
const ease = x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const span = (T, a, b) => clamp01((T - a) / (b - a));

// 時間軸：每段 0–1 的進度，頁面拿來決定手、頭、表情
export function phases(move, t){
  const T = t % period(move), P = { T };
  P.appear = span(T, 0, 0.5);
  if (move === 'refuse'){
    P.sniff = span(T, 0.5, 1.3); P.shake = span(T, 1.3, 2.9); P.push = span(T, 2.9, 3.7); P.back = span(T, 3.7, 4.6);
    P.sad = T > 1.3 && T < 4.0 ? 1 : 0;
    P.food = { s: ease(P.appear) * (T < 3.7 ? 1 : 0), a: T < 2.9 ? 1 : 1 - P.push, out: ease(P.push) };
    return P;
  }
  P.reach = span(T, 0.5, 1.1); P.lift = span(T, 1.1, 1.6); P.lower = span(T, 3.9, 4.4);
  // 三口：每口 0.75 秒，前 1/3 湊上去咬、後 2/3 嚼
  let bites = 0, lunge = 0, chew = 0;
  if (T >= 1.6 && T < 3.85){ const b = (T - 1.6) / 0.75, n = Math.floor(b), ph = b - n; bites = n + (ph >= 0.33 ? 1 : 0);
    lunge = ph < 0.33 ? ease(ph / 0.33) : 1 - ease((ph - 0.33) / 0.67); chew = ph >= 0.33 ? 1 : 0; }
  else if (T >= 3.85) bites = 3;
  P.bites = bites; P.lunge = lunge; P.chew = chew; P.biting = T >= 1.6 && T < 3.85;
  P.hold = T >= 0.5 && T < 4.4 ? Math.min(ease(P.reach), 1 - ease(P.lower)) : 0;   // 手抱著食物的程度
  P.happy = (T > 1.1 && T < 1.6) || T >= 3.9 || (P.biting && !chew) ? 1 : 0;
  P.yum = T >= 3.9;
  P.spin = move === 'snack' && T >= 4.6 && T < 5.8 ? ease(span(T, 4.6, 5.8)) : 0;
  P.hop = T >= 4.4 ? Math.abs(Math.sin(Math.PI * span(T, 4.4, period(move)) * (move === 'snack' ? 4 : 2))) : 0;
  P.food = { s: ease(P.appear) * [1, 0.72, 0.45, 0][bites], a: bites >= 3 ? 0 : 1, out: 0 };
  return P;
}

export function makeEat(THREE, GLTFLoader, scene, makeTex, spawn, fx){
  const cache = {}, food = new THREE.Group(); food.visible = false; scene.add(food);
  const crumbTex = makeTex(g => { g.beginPath(); g.arc(64, 64, 46, 0, Math.PI * 2); g.fillStyle = '#e9c27a'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.stroke(); });
  const heartTex = makeTex(g => { g.translate(64, 66); g.beginPath(); g.moveTo(0, 40);
    g.bezierCurveTo(-64, -4, -36, -56, 0, -24); g.bezierCurveTo(36, -56, 64, -4, 0, 40); g.closePath(); g.lineWidth = 12; g.strokeStyle = '#ffffff'; g.stroke(); g.fillStyle = '#ff6f8e'; g.fill(); });
  const starTex = makeTex(g => { g.translate(64, 64); g.beginPath(); for (let i = 0; i < 10; i++){ const r = i % 2 ? 22 : 54, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.lineWidth = 10; g.strokeStyle = '#ffffff'; g.stroke(); g.fillStyle = '#f5c24a'; g.fill(); });
  let want = null, size = 0.3, crumbs = 0, yumT = 0, pending = null;
  const done = new Set();   // 已經載入好的食物
  const nameFor = (move, pet) => !isEat(move) ? null : move === 'refuse' ? ((typeof window !== 'undefined' && window.__eatWrong) || WRONG[pet]) : FOOD[pet]?.[move === 'snack' ? 1 : 0];
  function load(name){
    if (!cache[name]) cache[name] = new Promise(ok0 => { const ok = w => { done.add(name); ok0(w); }; fetch(`./food/${name}.json`).then(r => r.json()).then(j => { const raw = atob(j.glb), u8 = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i); new GLTFLoader().parse(u8.buffer, './', g => {   // 食物模型包成 .json（base64 的 GLB）
      const o = g.scene, b = new THREE.Box3().setFromObject(o), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      o.position.sub(c); const w = new THREE.Group(); w.add(o); w.userData.k = 1 / Math.max(sz.x, sz.y, sz.z);
      o.traverse(m => { if (m.isMesh){ m.frustumCulled = false; m.material.transparent = true; } }); ok(w);
    }, () => ok(null)); }).catch(() => ok(null)); });
    return cache[name];
  }
  // 食物朝向身體那一面的「高度圖」：xy 分成 12×12 格，每格記食物最靠後（z 最小）的點。比外框準，玉米葉子、骨頭的凹處不會被當成實心
  const G = 12, gz = new Float32Array(G * G), _s = new THREE.Vector3(), _bx = new THREE.Box3();
  function surface(){
    const w = food.children[0]; if (!w) return null; food.updateMatrixWorld(true); _bx.setFromObject(food);
    const x0 = _bx.min.x, y0 = _bx.min.y, sx = (_bx.max.x - x0) / G || 1e-6, sy = (_bx.max.y - y0) / G || 1e-6; gz.fill(Infinity);
    w.traverse(m => { if (!m.isMesh) return; const P = m.geometry.attributes.position, st = Math.max(1, Math.floor(P.count / 4000));
      for (let i = 0; i < P.count; i += st){ _s.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld);
        const cx = Math.min(G - 1, Math.floor((_s.x - x0) / sx)), cy = Math.min(G - 1, Math.floor((_s.y - y0) / sy)), k = cy * G + cx; if (_s.z < gz[k]) gz[k] = _s.z; } });
    return { minZ(x, y){ if (x < x0 || y < y0 || x > _bx.max.x || y > _bx.max.y) return null;
      const cx = Math.min(G - 1, Math.floor((x - x0) / sx)), cy = Math.min(G - 1, Math.floor((y - y0) / sy));
      let z = Infinity; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++){ const X = cx + a, Y = cy + b; if (X >= 0 && Y >= 0 && X < G && Y < G) z = Math.min(z, gz[Y * G + X]); }   // 鄰格也算，邊緣保守一點
      return z === Infinity ? null : z; } };
  }
  const api = {
    food, surface,
    // 食物還沒載入好就先不開始動作（慢網路時不會「捧著空氣」）：回傳 true＝等一下，載好後自動再呼叫 again(move)
    wait(move, pet, again){
      pending = move; const n = nameFor(move, pet);
      if (!n || done.has(n)) return false;
      load(n).then(() => { if (pending === move) again(move); });
      return true;
    },
    // 先在背景載入（頁面載好後載自己的兩種；App 打開餵食時載清單上的其他食物）
    preload(names){ (names || []).filter(Boolean).reduce((p, n) => p.then(() => load(n)), Promise.resolve()); },
    // pet: bunny / cow / puppy / rex；s: 食物最長邊（公尺）
    async show(move, pet, s = 0.3){
      size = s; crumbs = 0; yumT = 0;
      // 搖頭不吃：App 會先把玩家拿給牠的食物放在 window.__eatWrong（沒有就用預設的別人食物）
      const name = nameFor(move, pet);
      want = name; while (food.children.length) food.remove(food.children[0]); food.visible = false;
      if (!name) return; const w = await load(name); if (want !== name || !w) return; food.add(w);
    },
    // 放好食物：pos 世界座標、k 大小（0–1）、a 透明度、spin 繞 y 轉
    place(pos, k, a = 1, spin = 0, tilt = 0.2){
      const w = food.children[0]; if (!w || k < 0.01 || a < 0.01){ food.visible = false; return; }
      food.visible = true; food.position.copy(pos); food.quaternion.setFromEuler(new THREE.Euler(tilt, spin, 0)); food.scale.setScalar(size * w.userData.k * k);
      w.traverse(m => { if (m.isMesh) m.material.opacity = a; });
    },
    // 咬一口就噴碎屑（時間經過就觸發，慢手機不會漏）
    bite(P, reduce){
      if (!P.bites){ crumbs = 0; return; }
      if (P.bites > crumbs && !reduce){ crumbs = P.bites;
        for (let i = 0; i < 6; i++){ const a = Math.random() * Math.PI * 2; spawn(crumbTex, food.position.clone(), new THREE.Vector3(Math.cos(a) * 0.5, 0.35 + Math.random() * 0.3, 0.25 + Math.random() * 0.2), 0.6, 0.06); fx[fx.length - 1].gravity = -3; } }
    },
    yum(P, move, at, dt, reduce){
      if (!P.yum || reduce) return; yumT -= dt; if (yumT > 0) return; yumT = move === 'snack' ? 0.22 : 0.35;
      const side = Math.random() < 0.5 ? -1 : 1;
      spawn(heartTex, at.clone().add(new THREE.Vector3(side * (0.4 + Math.random() * 0.15), 0.25 + Math.random() * 0.2, 0.2)), new THREE.Vector3(side * 0.08, 0.45, 0), 1.2, 0.22);
      if (move === 'snack') spawn(starTex, at.clone().add(new THREE.Vector3(-side * (0.45 + Math.random() * 0.2), 0.2 + Math.random() * 0.4, 0.2)), new THREE.Vector3(-side * 0.15, 0.5, 0), 1.0, 0.16);
    },
  };
  return api;
}

// ---------- 雙手捧食物（少年、成年共用）：手抱在食物兩側；食物跟著手，但每一格量身體（蒙皮後的實際位置），
// 跑進食物就往前推出去，所以手短的乳牛、小狗也不會把食物拉進身體 ----------
// o: { EATK, rig, model, skin(): SkinnedMesh, reach(side, target, w), grip(side, out), armRe: 手臂骨頭名稱, S: 模型縮放,
//      size: 食物大小, chestY, mouthY: 角色空間高度（公尺，腳在 0）, follow: 0–1 食物跟手的程度 }
export function makeHold(THREE, o){
  const v = new THREE.Vector3(), box = new THREE.Box3(), gl = new THREE.Vector3(), gr = new THREE.Vector3(), pos = new THREE.Vector3(), tmp = new THREE.Vector3();
  let M = null, idx = null;
  const cpt = (x, y, z, out = new THREE.Vector3()) => o.rig.localToWorld(out.set(x, y, z));
  const api = {
    get m(){ return M; }, pos,
    // 站好、手放下的時候量：嘴巴高度臉最前面、胸口最前面（角色空間）
    measure(){
      const sk = o.skin(); o.rig.updateMatrixWorld(true); o.model.updateMatrixWorld(true); sk.skeleton?.update();
      const P = sk.geometry.attributes.position, arm = armSet(sk); let fz = 0, cz = 0;
      for (let i = 0; i < P.count; i += 2){ if (armW(sk, i, arm) > 0.5) continue; sk.getVertexPosition(i, v); sk.localToWorld(v); o.rig.worldToLocal(v);
        if (Math.abs(v.x) < 0.16 && v.y > o.mouthY - 0.2 && v.y < o.mouthY + 0.06 && v.z > fz) fz = v.z;
        if (Math.abs(v.x) < 0.24 && v.y > o.chestY - 0.18 && v.y < o.chestY + 0.18 && v.z > cz) cz = v.z; }
      M = { face: fz, chest: cz }; idx = null; return M;
    },
    // 這一格食物要在哪（世界座標）：胸前 → 舉到嘴巴前；搖頭不吃時往前推走
    target(P, move){
      if (!M) api.measure(); const s = o.size;
      if (o.float && move === 'refuse'){ const u = ease(P.appear);
        return cpt(0.9 * (1 - u) + 0.7 * ease(P.food.out), o.mouthY + (o.floatY ?? -s * 0.55) + 0.22 * (1 - u) + 0.1 * Math.sin(Math.PI * u) + 0.12 * Math.sin(Math.PI * P.food.out), M.face + 0.06 + 0.6 * Math.sqrt(P.food.out), pos); }
      if (move === 'refuse') return cpt(0, o.chestY + 0.06 * Math.sin(Math.PI * P.food.out), M.chest + s / 2 + 0.06 + 0.55 * P.food.out, pos);
      if (o.float){   // 不用手：從側邊飛到嘴巴前面（雷克斯手短），咬的時候頭湊上去
        // 在嘴巴下方一點（嘴巴和表情不被擋住）；深度先放在臉前 6 公分，再由下面的 pushOut 推到剛好碰到
        const u = ease(P.appear), y = o.mouthY + (o.floatY ?? -s * 0.55), z = M.face + 0.06;
        return cpt(0.9 * (1 - u), y + 0.22 * (1 - u) + 0.1 * Math.sin(Math.PI * u), z, pos);
      }
      const k = ease(P.lift ?? 0) * (1 - ease(P.lower ?? 0));
      const y0 = o.chestY, z0 = M.chest + s / 2 + 0.06, y1 = o.mouthY - s * 0.3, z1 = M.face + s / 2 + 0.03;
      cpt(0, y0 + (y1 - y0) * k - (P.appear < 1 ? 0.12 * (1 - ease(P.appear)) : 0), z0 + (z1 - z0) * k, pos);
      return pos;
    },
    arms(P, move){
      if (o.float && move !== 'refuse') return;
      let w = P.hold || 0; const base = tmp.copy(api.target(P, move));
      if (move === 'refuse'){ w = Math.sin(Math.PI * Math.min(1, P.push * 1.25)); cpt(0, o.chestY, M.chest + o.size / 2 + 0.06 + 0.12 * P.food.out, base); }
      if (w <= 0.001) return;
      const side = cpt(1, 0, 0, gl).sub(cpt(0, 0, 0, gr)).normalize(), half = o.size / 2 + 0.05;
      o.reach('Left', base.clone().addScaledVector(side, half), w);
      o.reach('Right', base.clone().addScaledVector(side, -half), w);
    },
    // 放食物：跟著手（抱著的時候），再從身體推出去
    place(P, move, dt, head, reduce){
      const { EATK } = o; o.model.updateMatrixWorld(true);
      api.target(P, move);
      if (!o.float && move !== 'refuse' && P.hold > 0.5){ o.grip('Left', gl); o.grip('Right', gr); pos.lerp(gl.add(gr).multiplyScalar(0.5), (o.follow ?? 1) * Math.min(1, (P.hold - 0.5) / 0.5)); }
      const spin = move === 'refuse' ? P.T * 0.6 * (1 - P.food.out) : P.hold > 0 ? 0.6 : P.T * 0.8;
      pushOut(P.food.s, spin);
      EATK.place(pos, P.food.s, P.food.a, spin);
      if (move !== 'refuse'){ EATK.bite(P, reduce); EATK.yum(P, move, head, dt, reduce); }
    },
  };
  function armSet(sk){ if (!sk.skeleton) return new Set(); return new Set(sk.skeleton.bones.map((b, i) => o.armRe.test(b.name) ? i : -1).filter(i => i >= 0)); }
  function armW(sk, i, arm){ const SI = sk.geometry.attributes.skinIndex, SW = sk.geometry.attributes.skinWeight; if (!SI) return 0; let w = 0; for (let c = 0; c < 4; c++) if (arm.has(SI.getComponent(i, c))) w += SW.getComponent(i, c); return w; }
  function pushOut(k, spin){
    if (k < 0.01) return; const sk = o.skin();
    if (!idx){ idx = []; const P = sk.geometry.attributes.position, arm = armSet(sk), S = o.S || 1;
      for (let i = 0; i < P.count; i++){ if (armW(sk, i, arm) > 0.5) continue; const y = P.getY(i) * S; if (P.getZ(i) > -0.05 && y > o.chestY - 0.4 && y < o.mouthY + 0.4) idx.push(i); } }
    o.EATK.place(pos, k, 1, spin); const H = o.EATK.surface(); if (!H) return; sk.skeleton?.update();
    let push = 0;
    for (const i of idx){ sk.getVertexPosition(i, v); sk.localToWorld(v);
      const z = H.minZ(v.x, v.y); if (z === null) continue;
      const need = v.z + 0.006 - z; if (need > push) push = need; }
    pos.z += push;   // 角色大致面向 +z（轉身時只差一點角度）
  }
  return api;
}
