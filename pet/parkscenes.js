// Sparkee park backdrops: one hand-built, low-poly park scene per move.
// usage: const PARKS = makeParks(THREE, scene, 'teen-rabbit'); PARKS.show('rope');  PARKS.show(null) hides everything.
export function makeParks(THREE, scene, prefix = '') {
  const root = new THREE.Group(); root.name = 'parks'; scene.add(root);
  const TAU = Math.PI * 2, V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------- lights: remember the page's own lights so each park can tint them ----------
  let hemi = null, sun = null;
  scene.children.forEach(o => { if (o.isHemisphereLight && !hemi) hemi = o; if (o.isDirectionalLight && !sun) sun = o; });
  const base = { hI: hemi ? hemi.intensity : 2, hC: hemi ? hemi.color.clone() : null, hG: hemi ? hemi.groundColor.clone() : null,
                 sI: sun ? sun.intensity : 1.6, sC: sun ? sun.color.clone() : null };
  const LIGHT = {
    day:    { h: 1.0, s: 1.0, hc: 0xffffff, hg: 0x9fb59a, sc: 0xffffff },
    morning:{ h: 1.0, s: 1.0, hc: 0xfff6ea, hg: 0xa6bc9c, sc: 0xfff1dc },
    golden: { h: 1.0, s: 1.0, hc: 0xfff6ee, hg: 0xaaa890, sc: 0xffe8cc },
    dusk:   { h: 0.95, s: 0.8, hc: 0xffe4d8, hg: 0x8a7a8a, sc: 0xffb98a },
    night:  { h: 0.72, s: 0.5, hc: 0xc9d4ff, hg: 0x5a6280, sc: 0xb4c2ff },
  };
  function applyLight(name) {
    const L = LIGHT[name];
    if (hemi) { hemi.intensity = base.hI * (L ? L.h : 1); if (L) { hemi.color.set(L.hc); hemi.groundColor.set(L.hg); } else { hemi.color.copy(base.hC); hemi.groundColor.copy(base.hG); } }
    if (sun) { sun.intensity = base.sI * (L ? L.s : 1); if (L) sun.color.set(L.sc); else sun.color.copy(base.sC); }
  }

  // ---------- tiny geometry / material kit ----------
  const G = {
    box: new THREE.BoxGeometry(1, 1, 1), sph: new THREE.SphereGeometry(1, 16, 12), ico: new THREE.IcosahedronGeometry(1, 1),
    ico0: new THREE.IcosahedronGeometry(1, 0), cyl: new THREE.CylinderGeometry(1, 1, 1, 14), cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
    cone: new THREE.ConeGeometry(1, 1, 14), cone6: new THREE.ConeGeometry(1, 1, 6), torus: new THREE.TorusGeometry(1, 0.08, 8, 28, Math.PI),
    dodec: new THREE.DodecahedronGeometry(1, 0), plane: new THREE.PlaneGeometry(1, 1), circle: new THREE.CircleGeometry(1, 24),
  };
  const mats = new Map();
  function mat(c, o = {}) {
    const k = c + '|' + JSON.stringify(o);
    if (!mats.has(k)) {
      const basic = o.glow; const op = { color: c, ...o }; delete op.glow;
      mats.set(k, basic ? new THREE.MeshBasicMaterial(op) : new THREE.MeshLambertMaterial(op));
    }
    return mats.get(k);
  }
  function add(p, geo, c, pos = [0, 0, 0], s = [1, 1, 1], r = null, o) {
    const m = new THREE.Mesh(geo, c && c.isMaterial ? c : mat(c, o));
    m.position.set(pos[0], pos[1], pos[2]);
    if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(s[0], s[1], s[2]);
    if (r) m.rotation.set(r[0] || 0, r[1] || 0, r[2] || 0);
    p.add(m); return m;
  }
  const _up = V(0, 1, 0);
  function beam(p, a, b, r, c, geo = G.cyl, o) {           // a cylinder from point a to point b
    const A = V(...a), B = V(...b), d = B.clone().sub(A), L = d.length();
    const m = add(p, geo, c, [0, 0, 0], [r, L, r], null, o);
    m.position.copy(A).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(_up, d.normalize()); return m;
  }
  function sag(a, b, n, s) { const out = []; for (let i = 0; i <= n; i++) { const t = i / n; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - s * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]); } return out; }
  function rope(p, pts, r, c) { for (let i = 0; i < pts.length - 1; i++) beam(p, pts[i], pts[i + 1], r, c); }
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function hashStr(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
    const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  const FONT = '"Noto Sans TC","Noto Sans CJK TC","PingFang TC","Microsoft JhengHei",sans-serif';
  function signTex(text, bg, fg, w = 512, h = 192, size = 92) {
    return canvasTex(w, h, (x) => {
      x.fillStyle = bg; x.beginPath(); x.roundRect(6, 6, w - 12, h - 12, 28); x.fill();
      x.lineWidth = 8; x.strokeStyle = 'rgba(255,255,255,0.75)'; x.stroke();
      x.fillStyle = fg; x.font = `900 ${size}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      let s = size; while (x.measureText(text).width > w - 50 && s > 20) { s -= 4; x.font = `900 ${s}px ${FONT}`; }
      x.fillText(text, w / 2, h / 2 + 4);
    });
  }
  function board(p, text, bg, fg, pos, w, h, rotY = 0) {     // a two-sided sign board
    const t = signTex(text, bg, fg); const m = new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
    const b = add(p, G.plane, m, pos, [w, h, 1], [0, rotY, 0]); return b;
  }

  // ---------- scene registry ----------
  const scenes = {}, built = {};
  let active = null, activeKey = null;
  const clock = { t: 0, last: performance.now() / 1000 };

  // ---------- ground: big soft disc + painted 20 m square that fades into it ----------
  const GS = 20, GPX = 2048, PPM = GPX / GS;               // pixels per metre
  const gx = x => (x + GS / 2) * PPM, gz = z => (z + GS / 2) * PPM;
  function paintGround(spec, r) {
    return canvasTex(GPX, GPX, (x) => {
      x.fillStyle = spec.base; x.fillRect(0, 0, GPX, GPX);
      // blotches + blade specks so the grass is not flat
      const sp = spec.specks || ['rgba(255,255,255,0.06)', 'rgba(0,40,0,0.07)'];
      for (let i = 0; i < 260; i++) { x.fillStyle = sp[i % sp.length]; x.beginPath(); x.ellipse(r() * GPX, r() * GPX, 20 + r() * 70, 14 + r() * 40, r() * 3, 0, TAU); x.fill(); }
      for (let i = 0; i < 9000; i++) { x.strokeStyle = i % 3 ? 'rgba(20,70,20,0.16)' : 'rgba(255,255,230,0.14)'; x.lineWidth = 2; const px = r() * GPX, py = r() * GPX; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 4, py - 6 - r() * 6); x.stroke(); }
      (spec.decals || []).forEach(d => DECAL[d.type](x, d, r));
      // fade the square into the outer disc colour
      const g = x.createRadialGradient(GPX / 2, GPX / 2, PPM * 7.2, GPX / 2, GPX / 2, PPM * 9.8);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, spec.base); x.fillStyle = g; x.fillRect(0, 0, GPX, GPX);
    });
  }
  function pathLine(x, pts, w, col, edge) {
    x.lineCap = 'round'; x.lineJoin = 'round';
    const draw = (lw, c) => { x.strokeStyle = c; x.lineWidth = lw * PPM; x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(gx(p[0]), gz(p[1])) : x.moveTo(gx(p[0]), gz(p[1]))); x.stroke(); };
    if (edge) draw(w + 0.12, edge); draw(w, col);
  }
  const DECAL = {
    path(x, d, r) { pathLine(x, d.pts, d.w || 0.8, d.color || '#d9c7a0', d.edge || 'rgba(120,100,70,0.35)');
      if (d.gravel) { for (let i = 0; i < 2600; i++) { const k = Math.floor(r() * (d.pts.length - 1)), t = r(); const a = d.pts[k], b = d.pts[k + 1]; const px = a[0] + (b[0] - a[0]) * t + (r() - 0.5) * (d.w || 0.8) * 0.9, pz = a[1] + (b[1] - a[1]) * t + (r() - 0.5) * (d.w || 0.8) * 0.9; x.fillStyle = d.gravel[i % d.gravel.length]; x.beginPath(); x.arc(gx(px), gz(pz), 2 + r() * 4, 0, TAU); x.fill(); } } },
    stepping(x, d, r) { d.pts.forEach(p => { x.fillStyle = 'rgba(80,80,70,0.25)'; x.beginPath(); x.ellipse(gx(p[0]) + 4, gz(p[1]) + 5, 0.24 * PPM, 0.17 * PPM, 0.3, 0, TAU); x.fill(); x.fillStyle = d.color || '#cfcabb'; x.beginPath(); x.ellipse(gx(p[0]), gz(p[1]), 0.23 * PPM, 0.16 * PPM, r() * 3, 0, TAU); x.fill(); }); },
    ellipse(x, d) { x.fillStyle = d.edge || 'rgba(0,0,0,0)'; if (d.edge) { x.beginPath(); x.ellipse(gx(d.x), gz(d.z), (d.rx + 0.1) * PPM, (d.rz + 0.1) * PPM, d.rot || 0, 0, TAU); x.fill(); }
      x.fillStyle = d.color; x.beginPath(); x.ellipse(gx(d.x), gz(d.z), d.rx * PPM, d.rz * PPM, d.rot || 0, 0, TAU); x.fill(); },
    water(x, d, r) {
      x.fillStyle = d.bank || '#8b7a5a'; x.beginPath(); x.ellipse(gx(d.x), gz(d.z), (d.rx + 0.16) * PPM, (d.rz + 0.16) * PPM, 0, 0, TAU); x.fill();
      const g = x.createRadialGradient(gx(d.x), gz(d.z), 0, gx(d.x), gz(d.z), d.rx * PPM);
      g.addColorStop(0, d.deep || '#4fa3c9'); g.addColorStop(1, d.shallow || '#8fd0e6'); x.fillStyle = g;
      x.beginPath(); x.ellipse(gx(d.x), gz(d.z), d.rx * PPM, d.rz * PPM, 0, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.45)'; x.lineWidth = 3;
      for (let i = 0; i < 26; i++) { const a = r() * TAU, k = 0.2 + r() * 0.7; const px = gx(d.x + Math.cos(a) * d.rx * k), pz = gz(d.z + Math.sin(a) * d.rz * k); x.beginPath(); x.moveTo(px - 14, pz); x.quadraticCurveTo(px, pz - 5, px + 14, pz); x.stroke(); }
    },
    river(x, d, r) {
      pathLine(x, d.pts, (d.w || 1.2) + 0.3, d.bank || '#9c8a62');
      pathLine(x, d.pts, d.w || 1.2, d.color || '#6fbbe0');
      x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 3;
      for (let i = 0; i < 70; i++) { const k = Math.floor(r() * (d.pts.length - 1)), t = r(); const a = d.pts[k], b = d.pts[k + 1]; const px = a[0] + (b[0] - a[0]) * t, pz = a[1] + (b[1] - a[1]) * t + (r() - 0.5) * (d.w || 1.2) * 0.6; x.beginPath(); x.moveTo(gx(px) - 16, gz(pz)); x.quadraticCurveTo(gx(px), gz(pz) - 5, gx(px) + 16, gz(pz)); x.stroke(); }
    },
    rect(x, d) { x.save(); x.translate(gx(d.x), gz(d.z)); x.rotate(d.rot || 0); if (d.edge) { x.fillStyle = d.edge; x.fillRect(-(d.w / 2 + 0.08) * PPM, -(d.d / 2 + 0.08) * PPM, (d.w + 0.16) * PPM, (d.d + 0.16) * PPM); } x.fillStyle = d.color; x.fillRect(-d.w / 2 * PPM, -d.d / 2 * PPM, d.w * PPM, d.d * PPM); x.restore(); },
    tiles(x, d, r) {           // round plaza of tiles: rings of alternating stones
      for (let k = d.rings; k >= 1; k--) { const rr = d.r * k / d.rings; x.fillStyle = d.colors[k % d.colors.length]; x.beginPath(); x.arc(gx(d.x), gz(d.z), rr * PPM, 0, TAU); x.fill(); }
      x.strokeStyle = d.grout || 'rgba(120,100,80,0.35)'; x.lineWidth = 3;
      for (let k = 1; k <= d.rings; k++) { const rr = d.r * k / d.rings; x.beginPath(); x.arc(gx(d.x), gz(d.z), rr * PPM, 0, TAU); x.stroke();
        const n = 6 + k * 5; for (let i = 0; i < n; i++) { const a = i / n * TAU + k; x.beginPath(); x.moveTo(gx(d.x + Math.cos(a) * d.r * (k - 1) / d.rings), gz(d.z + Math.sin(a) * d.r * (k - 1) / d.rings)); x.lineTo(gx(d.x + Math.cos(a) * rr), gz(d.z + Math.sin(a) * rr)); x.stroke(); } }
      if (d.star) { x.fillStyle = d.star; x.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, rr = (i % 2 ? 0.18 : 0.42) * d.r; x.lineTo(gx(d.x + Math.cos(a) * rr), gz(d.z + Math.sin(a) * rr)); } x.fill(); }
    },
    grid(x, d) {               // square paving
      x.save(); x.translate(gx(d.x), gz(d.z)); x.rotate(d.rot || 0);
      const n = Math.round(d.w / d.cell), m = Math.round(d.d / d.cell);
      for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { x.fillStyle = d.colors[(i + j * (d.shift || 1)) % d.colors.length]; x.fillRect((-d.w / 2 + i * d.cell) * PPM + 1.5, (-d.d / 2 + j * d.cell) * PPM + 1.5, d.cell * PPM - 3, d.cell * PPM - 3); }
      x.restore();
    },
    track(x, d) {              // running track: lanes along local x, centred at (cx,cz), rotated by rot
      const lanes = d.lanes || 4, lw = (d.lane || 0.5) * PPM, L = d.len * PPM, W = lanes * lw;
      x.save(); x.translate(gx(d.cx), gz(d.cz)); x.rotate(d.rot || 0);
      x.fillStyle = d.color || '#d9694f'; x.fillRect(-L / 2, -W / 2, L, W);
      x.strokeStyle = '#fff'; x.lineWidth = 5; for (let i = 0; i <= lanes; i++) { x.beginPath(); x.moveTo(-L / 2, -W / 2 + i * lw); x.lineTo(L / 2, -W / 2 + i * lw); x.stroke(); }
      if (d.finish != null) { for (let i = 0; i < lanes * 4; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#222' : '#fff'; x.fillRect(d.finish * PPM + j * lw / 4, -W / 2 + i * lw / 4, lw / 4, lw / 4); } }
      if (d.nums != null) { x.fillStyle = '#fff'; x.font = `900 ${0.3 * PPM}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; for (let i = 0; i < lanes; i++) { x.save(); x.translate(d.nums * PPM, -W / 2 + (i + 0.5) * lw); x.rotate(-(d.rot || 0)); x.fillText(String(i + 1), 0, 0); x.restore(); } }
      x.restore();
    },
    hopscotch(x, d) {
      const s = d.s * PPM, cells = [[0, 0], [0, 1], [-0.5, 2], [0.5, 2], [0, 3], [-0.5, 4], [0.5, 4], [0, 5]];
      x.save(); x.translate(gx(d.x), gz(d.z)); x.rotate(d.rot || 0);
      x.lineWidth = 7; x.strokeStyle = '#fffaf0'; x.font = `900 ${s * 0.55}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      cells.forEach((c, i) => { x.fillStyle = d.colors[i % d.colors.length]; x.fillRect(c[0] * s - s / 2, -c[1] * s - s / 2, s, s); x.strokeRect(c[0] * s - s / 2, -c[1] * s - s / 2, s, s); x.fillStyle = '#fffaf0'; x.fillText(String(i + 1), c[0] * s, -c[1] * s); });
      x.beginPath(); x.arc(0, -6 * s + s * 0.1, s * 0.62, Math.PI, 0); x.stroke(); x.restore();
    },
    court(x, d) {              // painted game court lines (circle + lines)
      x.fillStyle = d.color; x.fillRect(gx(d.x - d.w / 2), gz(d.z - d.d / 2), d.w * PPM, d.d * PPM);
      x.strokeStyle = d.line || '#fff'; x.lineWidth = 6; x.strokeRect(gx(d.x - d.w / 2) + 10, gz(d.z - d.d / 2) + 10, d.w * PPM - 20, d.d * PPM - 20);
      if (d.mid) { x.beginPath(); x.moveTo(gx(d.x), gz(d.z - d.d / 2) + 10); x.lineTo(gx(d.x), gz(d.z + d.d / 2) - 10); x.stroke(); x.beginPath(); x.arc(gx(d.x), gz(d.z), 0.9 * PPM, 0, TAU); x.stroke(); }
      if (d.dots) { d.dots.forEach((p, i) => { x.fillStyle = d.dotCols[i % d.dotCols.length]; x.beginPath(); x.arc(gx(p[0]), gz(p[1]), 0.22 * PPM, 0, TAU); x.fill(); }); }
    },
    stripes(x, d) {            // mown lawn stripes
      for (let i = 0; i < GS / d.w; i++) if (i % 2) { x.fillStyle = d.color; x.fillRect(0, i * d.w * PPM, GPX, d.w * PPM); }
    },
    dots(x, d, r) {            // tiny flower dots painted in the grass
      for (let i = 0; i < d.n; i++) { const px = d.x0 + r() * (d.x1 - d.x0), pz = d.z0 + r() * (d.z1 - d.z0); x.fillStyle = d.colors[i % d.colors.length]; x.beginPath(); x.arc(gx(px), gz(pz), (d.size || 0.035) * PPM * (0.7 + r() * 0.6), 0, TAU); x.fill(); }
    },
    clover(x, d, r) {
      for (let i = 0; i < d.n; i++) { const px = (r() - 0.5) * 16, pz = (r() - 0.5) * 16; const cx = gx(px), cz = gz(pz), s = 5 + r() * 4;
        x.fillStyle = i % 9 ? 'rgba(70,140,60,0.55)' : 'rgba(255,255,255,0.9)';
        for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + r(); x.beginPath(); x.arc(cx + Math.cos(a) * s, cz + Math.sin(a) * s, s * 0.8, 0, TAU); x.fill(); } }
    },
    rows(x, d) {               // ploughed soil rows
      x.save(); x.translate(gx(d.x), gz(d.z)); x.rotate(d.rot || 0);
      x.fillStyle = d.soil || '#8a6446'; x.fillRect(-d.w / 2 * PPM, -d.d / 2 * PPM, d.w * PPM, d.d * PPM);
      x.fillStyle = d.ridge || '#a07a58'; const n = Math.floor(d.d / d.gap); for (let i = 0; i < n; i++) x.fillRect(-d.w / 2 * PPM, (-d.d / 2 + (i + 0.25) * d.gap) * PPM, d.w * PPM, d.gap * 0.45 * PPM);
      x.restore();
    },
    clock(x, d) {              // flower clock face
      const R = d.r * PPM; x.fillStyle = '#7e5a3c'; x.beginPath(); x.arc(gx(d.x), gz(d.z), R + 12, 0, TAU); x.fill();
      const cols = d.colors; for (let i = 0; i < 12; i++) { x.fillStyle = cols[i % cols.length]; x.beginPath(); x.moveTo(gx(d.x), gz(d.z)); x.arc(gx(d.x), gz(d.z), R, i / 12 * TAU, (i + 1) / 12 * TAU); x.fill(); }
      x.fillStyle = '#9bd17f'; x.beginPath(); x.arc(gx(d.x), gz(d.z), R * 0.62, 0, TAU); x.fill();
      x.fillStyle = '#fff'; x.font = `900 ${0.32 * PPM}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      [12, 3, 6, 9].forEach((n, i) => { const a = -Math.PI / 2 + i * Math.PI / 2; x.fillText(String(n), gx(d.x) + Math.cos(a) * R * 0.8, gz(d.z) + Math.sin(a) * R * 0.8); });
    },
    shadowSpot(x, d) { const g = x.createRadialGradient(gx(d.x), gz(d.z), 0, gx(d.x), gz(d.z), d.r * PPM); g.addColorStop(0, 'rgba(20,50,20,0.38)'); g.addColorStop(1, 'rgba(20,50,20,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(gx(d.x), gz(d.z), d.r * PPM, d.r * PPM * (d.k || 0.8), 0, 0, TAU); x.fill(); },
  };

  // ---------- sky: vertical gradient as the background + matching fog ----------
  function skyTex(stops) { return canvasTex(4, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); x.fillStyle = g; x.fillRect(0, 0, w, h); }); }

  // ---------- components ----------
  const LEAF = {
    round: [0x6fbf5a, 0x5aa94b, 0x86cc66], deep: [0x3f8f4a, 0x4e9c55, 0x357d41], cherry: [0xf7b6cc, 0xf39dbb, 0xfbd0de],
    autumn: [0xe8893a, 0xd9622b, 0xf2b33d], ginkgo: [0xf3cf4a, 0xe8bd33, 0xf8dc6c], mint: [0x8fd49a, 0x77c486, 0xa6dfae],
    night: [0x2f6b4f, 0x3b7a5a, 0x285c45], dusk: [0x7a9a52, 0x6b8a4a, 0x8aa85c], lime: [0x9ccf4f, 0x8bc240, 0xb0db62],
  };
  const sways = [];
  function tree(p, x, z, kind = 'round', s = 1, leaf) {
    const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
    const pal = LEAF[leaf || (kind === 'pine' ? 'deep' : kind)] || LEAF.round;
    if (kind === 'pine') {
      add(g, G.cyl, 0x7a5636, [0, 0.3 * s, 0], [0.08 * s, 0.6 * s, 0.08 * s]);
      [[0.62, 0.9, 0.75], [0.5, 0.8, 1.25], [0.36, 0.7, 1.7]].forEach((c, i) => add(g, G.cone6, pal[i % 3], [0, c[2] * s, 0], [c[0] * s, c[1] * s, c[0] * s], [0, i, 0], { flatShading: true }));
    } else if (kind === 'poplar') {
      add(g, G.cyl, 0x7a5636, [0, 0.35 * s, 0], [0.06 * s, 0.7 * s, 0.06 * s]);
      add(g, G.ico, pal[0], [0, 1.5 * s, 0], [0.42 * s, 1.0 * s, 0.42 * s], null, { flatShading: true });
    } else {
      const h = (kind === 'cherry' ? 0.8 : 0.95) * s;
      add(g, G.cyl, kind === 'birch' ? 0xefeae0 : 0x8a6240, [0, h / 2, 0], [0.08 * s, h, 0.08 * s]);
      if (kind === 'cherry' || kind === 'big') { beam(g, [0, h * 0.8, 0], [0.35 * s, h * 1.25, 0.05 * s], 0.045 * s, 0x7a5232); beam(g, [0, h * 0.8, 0], [-0.32 * s, h * 1.2, -0.06 * s], 0.045 * s, 0x7a5232); }
      const crown = new THREE.Group(); crown.position.y = h; g.add(crown);
      const blobs = kind === 'big' ? [[0, 0.75, 0, 0.85], [0.6, 0.55, 0.1, 0.6], [-0.6, 0.55, -0.1, 0.62], [0.1, 1.2, -0.1, 0.6], [0, 0.6, 0.45, 0.5]]
        : [[0, 0.55, 0, 0.55], [0.32, 0.4, 0.08, 0.38], [-0.3, 0.42, -0.06, 0.4], [0.05, 0.85, -0.05, 0.38]];
      blobs.forEach((b, i) => add(crown, G.ico, pal[i % 3], [b[0] * s, b[1] * s, b[2] * s], b[3] * s, [i, i * 2, 0], { flatShading: true }));
      sways.push({ o: crown, a: 0.025, f: 0.6 + (x * 7 % 1) * 0.4, ph: x + z });
    }
    g.userData.solid = true; return g;
  }
  function bush(p, x, z, s = 1, col = 0x5cae4f, flowers) {
    const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
    add(g, G.ico, col, [0, 0.18 * s, 0], [0.32 * s, 0.24 * s, 0.28 * s], [0, x, 0], { flatShading: true });
    add(g, G.ico, col, [0.2 * s, 0.13 * s, 0.06 * s], [0.2 * s, 0.16 * s, 0.18 * s], null, { flatShading: true });
    if (flowers) for (let i = 0; i < 7; i++) { const a = i * 2.4; add(g, G.sph, flowers[i % flowers.length], [Math.cos(a) * 0.24 * s, (0.26 + (i % 3) * 0.05) * s, Math.sin(a) * 0.2 * s], 0.035 * s); }
    g.userData.solid = true; return g;
  }
  function rock(p, x, z, s = 0.2, col = 0xa9a49a) { const m = add(p, G.dodec, col, [x, s * 0.4, z], [s, s * 0.7, s * 0.85], [x, z, 0], { flatShading: true }); m.userData.solid = true; return m; }
  // instanced flowers / tufts in a rectangle (skip a circle around the actor)
  function field(p, o) {
    const r = o.r || rng(7), n = o.n, H = o.h || 0.08, S = o.size || 0.03, keep = o.keep ?? 2.3;
    const pos = []; let guard = 0;
    while (pos.length < n && guard++ < n * 20) { const x = o.x0 + r() * (o.x1 - o.x0), z = o.z0 + r() * (o.z1 - o.z0); if (Math.hypot(x, z) < keep) continue; if (o.skip && o.skip(x, z)) continue; pos.push([x, z]); }
    const g = new THREE.Group(); p.add(g);
    if (o.stem !== false) { const st = new THREE.InstancedMesh(G.cyl6, mat(o.stemCol || 0x4f9a46), pos.length); const m4 = new THREE.Matrix4();
      pos.forEach((q, i) => { const hh = H * (0.7 + r() * 0.6); m4.compose(V(q[0], hh / 2, q[1]), new THREE.Quaternion(), V(0.006, hh, 0.006)); st.setMatrixAt(i, m4); q.push(hh); }); g.add(st); }
    else pos.forEach(q => q.push(H));
    const hd = new THREE.InstancedMesh(o.geo || G.sph, mat(0xffffff, o.flat ? { flatShading: true } : {}), pos.length); const m4 = new THREE.Matrix4(), c = new THREE.Color();
    pos.forEach((q, i) => { const sc = S * (0.75 + r() * 0.5); const sy = o.sy || 1; m4.compose(V(q[0], q[2] + sc * 0.3 * sy, q[1]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 6, 0)), V(sc, sc * sy, sc)); hd.setMatrixAt(i, m4); hd.setColorAt(i, c.set(o.colors[i % o.colors.length])); });
    g.add(hd); return g;
  }
  function tufts(p, r, col = 0x4f9a46, n = 260, keep = 2.4, skip) {
    return field(p, { r, n, x0: -9, x1: 9, z0: -9, z1: 9, keep, skip, stem: false, geo: G.cone6, size: 0.045, sy: 2.4, h: 0, colors: [col, col, 0x62ad55], flat: true });
  }
  function fence(p, a, b, style = 'picket', col = 0xf3ead8, h = 0.5) {
    const g = new THREE.Group(); p.add(g); const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    const n = Math.max(2, Math.round(L / (style === 'picket' ? 0.2 : 0.9)));
    for (let i = 0; i <= n; i++) { const t = i / n, x = a[0] + dx * t, z = a[1] + dz * t;
      if (style === 'picket') { add(g, G.box, col, [x, h * 0.45, z], [0.07, h * 0.9, 0.03], [0, -Math.atan2(dz, dx), 0]); add(g, G.cone6, col, [x, h * 0.95, z], [0.05, 0.1, 0.03], [0, -Math.atan2(dz, dx), 0]); }
      else add(g, G.cyl6, col, [x, h / 2, z], [0.05, h, 0.05]); }
    const rails = style === 'rope' ? [h * 0.85] : style === 'picket' ? [h * 0.3, h * 0.7] : [h * 0.45, h * 0.85];
    rails.forEach(y => { if (style === 'rope') rope(g, sag([a[0], y, a[1]], [b[0], y, b[1]], 8, 0.06), 0.012, 0xc9a26b); else beam(g, [a[0], y, a[1]], [b[0], y, b[1]], 0.025, col, G.cyl6); });
    g.userData.solid = true; return g;
  }
  function bench(p, x, z, ry = 0, col = 0xb5773f) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
    for (let i = 0; i < 3; i++) add(g, G.box, col, [0, 0.42, -0.1 + i * 0.1], [1.2, 0.04, 0.08]);
    for (let i = 0; i < 2; i++) add(g, G.box, col, [0, 0.62 + i * 0.13, -0.2], [1.2, 0.08, 0.03], [0.15, 0, 0]);
    [-0.5, 0.5].forEach(sx => { add(g, G.box, 0x3d4a52, [sx, 0.21, 0], [0.05, 0.42, 0.34]); add(g, G.box, 0x3d4a52, [sx, 0.55, -0.21], [0.05, 0.5, 0.04], [0.15, 0, 0]); });
    g.userData.solid = true; return g;
  }
  const glowers = [];
  function lamp(p, x, z, on = false, col = 0x34424a) {
    const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
    add(g, G.cyl, col, [0, 0.05, 0], [0.12, 0.1, 0.12]); add(g, G.cyl, col, [0, 1.0, 0], [0.035, 2.0, 0.035]);
    add(g, G.cone6, col, [0, 2.25, 0], [0.2, 0.16, 0.2]);
    add(g, G.sph, on ? 0xfff2c0 : 0xf4f0e0, [0, 2.1, 0], 0.11, null, on ? { glow: true } : {});
    if (on) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffd98a, transparent: true, depthWrite: false, opacity: 0.8 })); s.position.set(0, 2.1, 0); s.scale.setScalar(1.1); g.add(s); glowers.push(s); }
    g.userData.solid = true; return g;
  }
  let _glow = null;
  function glowTex() { return _glow || (_glow = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); })); }
  function slide(p, x, z, ry = 0, col = 0xff8a3d, deck = 0x4aa3df) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
    [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]].forEach(q => add(g, G.cyl, deck, [q[0], 0.6, q[1]], [0.04, 1.2, 0.04]));
    add(g, G.box, 0xf6c445, [0, 0.95, 0], [0.7, 0.06, 0.7]); add(g, G.cone, 0xe8584a, [0, 1.45, 0], [0.52, 0.45, 0.52], [0, Math.PI / 4, 0]);
    const sl = add(g, G.box, col, [0, 0.52, 0.95], [0.46, 0.04, 1.4], [0.62, 0, 0]);
    [-0.24, 0.24].forEach(sx => add(g, G.box, col, [sx, 0.58, 0.95], [0.04, 0.1, 1.4], [0.62, 0, 0]));
    for (let i = 0; i < 5; i++) add(g, G.box, 0xf6c445, [0, 0.16 + i * 0.17, -0.42 - i * 0.04], [0.5, 0.035, 0.08]);
    [-0.25, 0.25].forEach(sx => beam(g, [sx, 0, -0.62], [sx, 1.0, -0.38], 0.03, deck));
    g.userData.solid = true; return g;
  }
  function swings(p, x, z, ry = 0, cols = [0xe8584a, 0x4aa3df]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
    [-0.9, 0.9].forEach(sx => { beam(g, [sx, 0, -0.45], [sx, 1.7, 0], 0.04, 0x5b6d78); beam(g, [sx, 0, 0.45], [sx, 1.7, 0], 0.04, 0x5b6d78); });
    beam(g, [-0.95, 1.7, 0], [0.95, 1.7, 0], 0.045, 0x5b6d78);
    [-0.45, 0.45].forEach((sx, i) => { const s = new THREE.Group(); s.position.set(sx, 1.7, 0); g.add(s);
      beam(s, [-0.15, 0, 0], [-0.15, -1.25, 0], 0.01, 0x777777); beam(s, [0.15, 0, 0], [0.15, -1.25, 0], 0.01, 0x777777);
      add(s, G.box, cols[i % cols.length], [0, -1.27, 0], [0.38, 0.04, 0.16]); sways.push({ o: s, a: 0.18, f: 0.9, ph: i * 1.7, axis: 'x' }); });
    g.userData.solid = true; return g;
  }
  function springRider(p, x, z, ry = 0, col = 0xf6c445, kind = 'duck') {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
    add(g, G.cyl, 0x666666, [0, 0.02, 0], [0.2, 0.04, 0.2]);
    for (let i = 0; i < 6; i++) add(g, G.torus, 0x9a9a9a, [0, 0.06 + i * 0.05, 0], [0.07, 0.07, 0.3], [Math.PI / 2, 0, i]);
    const b = new THREE.Group(); b.position.y = 0.36; g.add(b);
    add(b, G.sph, col, [0, 0.12, 0], [0.18, 0.15, 0.3]);
    add(b, G.sph, col, [0, 0.33, 0.22], 0.13);
    if (kind === 'duck') add(b, G.cone, 0xff8a3d, [0, 0.31, 0.38], [0.05, 0.1, 0.05], [Math.PI / 2, 0, 0]);
    else { add(b, G.cone, col, [0.07, 0.48, 0.2], [0.035, 0.14, 0.035]); add(b, G.cone, col, [-0.07, 0.48, 0.2], [0.035, 0.14, 0.035]); add(b, G.sph, 0xffffff, [0, 0.3, 0.33], 0.04); }
    add(b, G.sph, 0x222222, [0.07, 0.37, 0.33], 0.02); add(b, G.sph, 0x222222, [-0.07, 0.37, 0.33], 0.02);
    beam(b, [-0.12, 0.38, 0.28], [0.12, 0.38, 0.28], 0.015, 0x444444);
    sways.push({ o: b, a: 0.12, f: 1.4, ph: x, axis: 'x' });
    g.userData.solid = true; return g;
  }
  function seesaw(p, x, z, ry = 0, col = 0x7cc45a) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
    add(g, G.cone6, 0xe8584a, [0, 0.16, 0], [0.16, 0.32, 0.16]);
    const b = new THREE.Group(); b.position.y = 0.32; g.add(b); add(b, G.box, col, [0, 0, 0], [2.0, 0.05, 0.22]);
    [-0.85, 0.85].forEach(sx => { add(b, G.box, 0xf6c445, [sx, 0.05, 0], [0.3, 0.05, 0.24]); beam(b, [sx * 0.86, 0.05, -0.1], [sx * 0.86, 0.22, -0.1], 0.015, 0x444444); beam(b, [sx * 0.86, 0.22, -0.1], [sx * 0.86, 0.22, 0.1], 0.015, 0x444444); });
    sways.push({ o: b, a: 0.16, f: 0.7, ph: z, axis: 'z' }); g.userData.solid = true; return g;
  }
  function sandbox(p, x, z, w = 1.6, d = 1.2, toys = true) {
    const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
    [[0, -d / 2, w, 0.1], [0, d / 2, w, 0.1], [-w / 2, 0, 0.1, d], [w / 2, 0, 0.1, d]].forEach(b => add(g, G.box, 0xc9894a, [b[0], 0.07, b[1]], [b[2], 0.14, b[3]]));
    add(g, G.box, 0xf0d9a4, [0, 0.03, 0], [w - 0.1, 0.06, d - 0.1]);
    add(g, G.sph, 0xead09a, [-w * 0.18, 0.05, -d * 0.1], [0.28, 0.12, 0.22]);
    if (toys) { add(g, G.cyl, 0xe8584a, [w * 0.2, 0.11, 0.05], [0.08, 0.14, 0.08]); add(g, G.cyl, 0x4aa3df, [w * 0.28, 0.08, -d * 0.2], [0.06, 0.1, 0.06]); beam(g, [-w * 0.1, 0.06, d * 0.22], [w * 0.05, 0.18, d * 0.12], 0.012, 0xf6c445); add(g, G.box, 0xf6c445, [-w * 0.12, 0.06, d * 0.24], [0.08, 0.02, 0.1]); }
    g.userData.solid = true; return g;
  }
  const ducks = [];
  function duck(p, x, z, col = 0xffffff, s = 1, swim) {
    const g = new THREE.Group(); g.position.set(x, 0.02, z); g.scale.setScalar(s); p.add(g);
    add(g, G.sph, col, [0, 0.08, 0], [0.12, 0.08, 0.17]); add(g, G.sph, col, [0, 0.19, 0.11], 0.065);
    add(g, G.cone, 0xff9b2f, [0, 0.18, 0.19], [0.025, 0.07, 0.02], [Math.PI / 2, 0, 0]);
    add(g, G.sph, 0x222222, [0.04, 0.21, 0.15], 0.012); add(g, G.sph, 0x222222, [-0.04, 0.21, 0.15], 0.012);
    add(g, G.cone, col, [0, 0.12, -0.16], [0.05, 0.09, 0.05], [-1.0, 0, 0]);
    if (swim) ducks.push({ o: g, ...swim }); g.userData.solid = true; return g;
  }
  function lily(p, x, z, s = 0.16, flower) { add(p, G.circle, 0x4f9a46, [x, 0.012, z], [s, s, s], [-Math.PI / 2, 0, 0]); if (flower) add(p, G.sph, flower, [x, 0.04, z], [0.04, 0.03, 0.04]); }
  function reeds(p, x, z, n = 6) { const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g); for (let i = 0; i < n; i++) { const a = i * 2.3, r = 0.1 + (i % 3) * 0.06, h = 0.5 + (i % 4) * 0.12; beam(g, [Math.cos(a) * r, 0, Math.sin(a) * r], [Math.cos(a) * r * 1.4, h, Math.sin(a) * r * 1.4], 0.01, 0x6f9a3f); if (i % 2) add(g, G.cyl, 0x7a4b2a, [Math.cos(a) * r * 1.38, h - 0.06, Math.sin(a) * r * 1.38], [0.022, 0.12, 0.022]); } g.userData.solid = true; return g; }
  const drops = [];
  function fountain(p, x, z, s = 1, col = 0xe9e3d6) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); p.add(g);
    add(g, G.cyl, col, [0, 0.16, 0], [1.0, 0.32, 1.0]); add(g, G.cyl, 0x7cc8e8, [0, 0.31, 0], [0.92, 0.02, 0.92]);
    add(g, G.cyl, col, [0, 0.6, 0], [0.13, 0.7, 0.13]); add(g, G.cyl, col, [0, 0.95, 0], [0.45, 0.08, 0.45]); add(g, G.cyl, 0x7cc8e8, [0, 0.99, 0], [0.4, 0.02, 0.4]);
    add(g, G.cyl, col, [0, 1.15, 0], [0.06, 0.32, 0.06]); add(g, G.sph, col, [0, 1.33, 0], 0.08);
    const dm = mat(0xbfe9ff, { transparent: true, opacity: 0.8 });
    for (let i = 0; i < 30; i++) { const d = add(g, G.sph, dm, [0, 1.35, 0], 0.022); drops.push({ o: d, ph: i / 30, a: i * 2.4, r0: i % 2 ? 0.42 : 0.9, top: i % 2 ? 1.35 : 0.98 }); }
    g.userData.solid = true; return g;
  }
  function gazebo(p, x, z, s = 1, roof = 0xc0564a, lanterns) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); p.add(g);
    add(g, G.cyl6, 0xd9c9a8, [0, 0.06, 0], [1.1, 0.12, 1.1]);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; add(g, G.cyl, 0xf3ead8, [Math.cos(a), 0.9, Math.sin(a)], [0.05, 1.6, 0.05]); if (i !== 1) beam(g, [Math.cos(a), 0.45, Math.sin(a)], [Math.cos(a + TAU / 6), 0.45, Math.sin(a + TAU / 6)], 0.03, 0xf3ead8); }
    add(g, G.cone6, roof, [0, 2.0, 0], [1.35, 0.75, 1.35], null, { flatShading: true }); add(g, G.sph, 0xf6c445, [0, 2.42, 0], 0.07);
    if (lanterns) for (let i = 0; i < 6; i++) { const a = (i + 0.5) / 6 * TAU; const l = add(g, G.sph, lanterns[i % lanterns.length], [Math.cos(a) * 0.95, 1.5, Math.sin(a) * 0.95], [0.08, 0.1, 0.08], null, { glow: true }); }
    g.userData.solid = true; return g;
  }
  function bridge(p, x, z, ry = 0, len = 2.0, col = 0xb5773f) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
    const n = 12; for (let i = 0; i <= n; i++) { const t = i / n, xx = -len / 2 + len * t, y = 0.06 + Math.sin(t * Math.PI) * 0.35; add(g, G.box, col, [xx, y, 0], [len / n * 0.95, 0.05, 0.7], [0, 0, -Math.cos(t * Math.PI) * 0.5]); }
    [-0.36, 0.36].forEach(zz => { const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([-len / 2 + len * t, 0.5 + Math.sin(t * Math.PI) * 0.35, zz]); add(g, G.cyl6, col, [-len / 2 + len * t, 0.28 + Math.sin(t * Math.PI) * 0.35, zz], [0.025, 0.45, 0.025]); } rope(g, pts, 0.025, 0xd99a5a); });
    g.userData.solid = true; return g;
  }
  function picnicTable(p, x, z, ry = 0, col = 0xb5773f) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
    add(g, G.box, col, [0, 0.72, 0], [1.4, 0.05, 0.7]); [-0.55, 0.55].forEach(zz => add(g, G.box, col, [0, 0.42, zz], [1.4, 0.04, 0.25]));
    [-0.55, 0.55].forEach(sx => { beam(g, [sx, 0, -0.6], [sx, 0.72, 0.1], 0.03, col, G.cyl6); beam(g, [sx, 0, 0.6], [sx, 0.72, -0.1], 0.03, col, G.cyl6); });
    g.userData.solid = true; return g;
  }
  function blanket(p, x, z, w, d, ry, c1, c2) {
    const t = canvasTex(128, 128, (c) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? c1 : c2; c.fillRect(i * 16, j * 16, 16, 16); } });
    const m = add(p, G.plane, new THREE.MeshLambertMaterial({ map: t }), [x, 0.012, z], [w, d, 1], [-Math.PI / 2, 0, ry]); return m;
  }
  function basket(p, x, z) { const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g); add(g, G.box, 0xc9894a, [0, 0.1, 0], [0.34, 0.2, 0.24]); add(g, G.torus, 0x9a6a3a, [0, 0.2, 0], [0.16, 0.16, 0.5]); add(g, G.sph, 0xe8584a, [0.07, 0.22, 0.03], 0.05); add(g, G.sph, 0xf6c445, [-0.06, 0.22, -0.02], 0.045); g.userData.solid = true; return g; }
  function umbrella(p, x, z, col = 0xe8584a, col2 = 0xffffff, table = true) {
    const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
    add(g, G.cyl, 0xdddddd, [0, 1.0, 0], [0.025, 2.0, 0.025]);
    for (let i = 0; i < 8; i++) { const seg = new THREE.ConeGeometry(0.9, 0.35, 8, 1, true, i / 8 * TAU, TAU / 8); add(g, seg, i % 2 ? col : col2, [0, 2.0, 0], 1, null, { side: THREE.DoubleSide }); }
    if (table) { add(g, G.cyl, 0xffffff, [0, 0.7, 0], [0.45, 0.04, 0.45]); add(g, G.cyl, 0xbbbbbb, [0, 0.35, 0], [0.04, 0.7, 0.04]); [0, 1, 2].forEach(i => { const a = i / 3 * TAU + 0.4; const c = new THREE.Group(); c.position.set(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7); c.rotation.y = -a + Math.PI / 2; g.add(c); add(c, G.box, col2 === 0xffffff ? col : col2, [0, 0.42, 0], [0.32, 0.04, 0.32]); add(c, G.box, col2 === 0xffffff ? col : col2, [0, 0.62, 0.15], [0.32, 0.36, 0.03]); [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]].forEach(q => add(c, G.cyl6, 0x777777, [q[0], 0.21, q[1]], [0.015, 0.42, 0.015])); }); }
    g.userData.solid = true; return g;
  }
  const kites = [];
  function kite(p, x, y, z, c1, c2, anchor) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const shape = new THREE.Shape(); shape.moveTo(0, 0.45); shape.lineTo(0.3, 0); shape.lineTo(0, -0.55); shape.lineTo(-0.3, 0); shape.closePath();
    add(g, new THREE.ShapeGeometry(shape), c1, [0, 0, 0], 1, null, { side: THREE.DoubleSide });
    const s2 = new THREE.Shape(); s2.moveTo(0, 0.45); s2.lineTo(0.3, 0); s2.lineTo(0, 0); s2.closePath(); add(g, new THREE.ShapeGeometry(s2), c2, [0, 0, 0.002], 1, null, { side: THREE.DoubleSide });
    const tail = new THREE.Group(); tail.position.y = -0.55; g.add(tail);
    for (let i = 0; i < 6; i++) add(tail, G.box, i % 2 ? c2 : c1, [Math.sin(i) * 0.05, -0.12 - i * 0.14, 0], [0.09, 0.05, 0.01], [0, 0, 0.5 * (i % 2 ? 1 : -1)]);
    if (anchor) beam(p, [x, y - 0.5, z], anchor, 0.004, 0xffffff);
    kites.push({ o: g, ph: x + y, base: [x, y, z] }); return g;
  }
  function goal(p, x, z, ry = 0, w = 2.4, h = 1.2) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
    const c = 0xffffff; beam(g, [-w / 2, 0, 0], [-w / 2, h, 0], 0.04, c); beam(g, [w / 2, 0, 0], [w / 2, h, 0], 0.04, c); beam(g, [-w / 2, h, 0], [w / 2, h, 0], 0.04, c);
    beam(g, [-w / 2, h, 0], [-w / 2, 0, -0.8], 0.02, c); beam(g, [w / 2, h, 0], [w / 2, 0, -0.8], 0.02, c); beam(g, [-w / 2, 0, -0.8], [w / 2, 0, -0.8], 0.02, c);
    const net = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.55 });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, Math.hypot(h, 0.8), 12, 6), net); back.position.set(0, h / 2, -0.4); back.rotation.x = -Math.atan2(0.8, h) ; g.add(back);
    g.userData.solid = true; return g;
  }
  function flag(p, x, z, col = 0xf6c445, h = 1.0) { const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g); add(g, G.cyl6, 0xffffff, [0, h / 2, 0], [0.015, h, 0.015]); const f = add(g, G.box, col, [0.13, h - 0.1, 0], [0.26, 0.18, 0.01]); sways.push({ o: f, a: 0.25, f: 2.2, ph: x, axis: 'y' }); g.userData.solid = true; return g; }
  function bunting(p, a, b, cols, s = 0.4) {
    const pts = sag(a, b, 14, s); const g = new THREE.Group(); p.add(g); rope(g, pts, 0.008, 0xffffff);
    const tri = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-0.09, 0, 0, 0.09, 0, 0, 0, -0.2, 0], 3)); tri.computeVertexNormals();
    for (let i = 1; i < pts.length - 1; i++) { const m = add(g, tri, cols[i % cols.length], pts[i], 1, null, { side: THREE.DoubleSide }); m.lookAt(m.position.x, m.position.y, m.position.z + 1); }
    return g;
  }
  function stringLights(p, pts, cols, s = 0.25) {
    const g = new THREE.Group(); p.add(g);
    for (let k = 0; k < pts.length - 1; k++) { const seg = sag(pts[k], pts[k + 1], 10, s); rope(g, seg, 0.007, 0x333333); seg.slice(1, -1).forEach((q, i) => { const b = add(g, G.sph, cols[(i + k) % cols.length], [q[0], q[1] - 0.05, q[2]], [0.04, 0.055, 0.04], null, { glow: true }); twinkles.push({ o: b, ph: i * 1.3 + k }); }); }
    return g;
  }
  const twinkles = [];
  function pole(p, x, z, h = 2.4, col = 0x6b5a48) { const m = add(p, G.cyl6, col, [x, h / 2, z], [0.04, h, 0.04]); m.userData.solid = true; return m; }
  function tent(p, x, z, ry = 0, col = 0xf28c3a, col2 = 0xf6c445) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
    const sh = new THREE.Shape(); sh.moveTo(-0.75, 0); sh.lineTo(0, 1.05); sh.lineTo(0.75, 0); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 1.5, bevelEnabled: false }); geo.translate(0, 0, -0.75);
    add(g, geo, col, [0, 0, 0], 1, null, { flatShading: true });
    const door = new THREE.Shape(); door.moveTo(-0.3, 0); door.lineTo(0, 0.6); door.lineTo(0.3, 0); door.closePath();
    add(g, new THREE.ShapeGeometry(door), 0x5a3a28, [0, 0.01, 0.755]); add(g, new THREE.ShapeGeometry(door), col2, [0.12, 0.01, 0.76], [0.4, 1, 1]);
    beam(g, [0, 1.05, 0.8], [0, 1.3, 0.8], 0.012, 0x777777); add(g, G.box, col2, [0.08, 1.24, 0.8], [0.16, 0.09, 0.01]);
    g.userData.solid = true; return g;
  }
  const flames = [];
  function campfire(p, x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; rock(g, Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.09, 0x8f8a80); }
    for (let i = 0; i < 3; i++) beam(g, [Math.cos(i * 2.1) * 0.22, 0.03, Math.sin(i * 2.1) * 0.22], [-Math.cos(i * 2.1) * 0.22, 0.08, -Math.sin(i * 2.1) * 0.22], 0.035, 0x6b4428);
    [[0xffb43a, 0.14, 0.38], [0xff7a2a, 0.1, 0.3], [0xfff0a0, 0.06, 0.22]].forEach((f, i) => { const m = add(g, G.cone6, f[0], [0, 0.08 + f[2] / 2, 0], [f[1], f[2], f[1]], null, { glow: true }); flames.push({ o: m, ph: i, h: f[2] }); });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff9a40, transparent: true, depthWrite: false, opacity: 0.7 })); s.position.y = 0.25; s.scale.setScalar(1.3); g.add(s);
    g.userData.solid = true; return g;
  }
  function telescope(p, x, z, ry = 0) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); [0, 1, 2].forEach(i => { const a = i / 3 * TAU; beam(g, [Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25], [0, 0.8, 0], 0.015, 0x444444); }); beam(g, [0, 0.82, -0.25], [0, 1.25, 0.25], 0.06, 0xf3ead8); add(g, G.cyl, 0x334455, [0, 1.25, 0.26], [0.065, 0.04, 0.065], [0.85, 0, 0]); g.userData.solid = true; return g; }
  const blades = [];
  function windmill(p, x, z, ry = 0, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.scale.setScalar(s); p.add(g);
    add(g, G.cyl6, 0xf3ead8, [0, 1.2, 0], [0.45, 2.4, 0.45]); add(g, G.cone6, 0xc0564a, [0, 2.65, 0], [0.55, 0.6, 0.55]);
    add(g, G.box, 0x7a5636, [0, 0.35, 0.39], [0.3, 0.5, 0.06]); add(g, G.box, 0x9bd1e8, [0, 1.5, 0.4], [0.18, 0.2, 0.04]);
    const hub = new THREE.Group(); hub.position.set(0, 2.25, 0.5); g.add(hub); add(hub, G.sph, 0x7a5636, [0, 0, 0], 0.08);
    for (let i = 0; i < 4; i++) { const b = new THREE.Group(); b.rotation.z = i * Math.PI / 2; hub.add(b); add(b, G.box, 0x8a6240, [0, 0.6, 0], [0.04, 1.2, 0.03]); add(b, G.box, 0xfaf3e6, [0.1, 0.7, 0], [0.18, 0.9, 0.015]); }
    blades.push({ o: hub, sp: 0.6 }); g.userData.solid = true; return g;
  }
  function barn(p, x, z, ry = 0, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.scale.setScalar(s); p.add(g);
    add(g, G.box, 0xc0473d, [0, 0.7, 0], [2.0, 1.4, 1.6]);
    const sh = new THREE.Shape(); sh.moveTo(-1.1, 0); sh.lineTo(-0.7, 0.5); sh.lineTo(0, 0.75); sh.lineTo(0.7, 0.5); sh.lineTo(1.1, 0); sh.closePath();
    const rg = new THREE.ExtrudeGeometry(sh, { depth: 1.8, bevelEnabled: false }); rg.translate(0, 1.4, -0.9); add(g, rg, 0x7a3a34, [0, 0, 0], 1, null, { flatShading: true });
    add(g, G.box, 0xffffff, [0, 0.5, 0.81], [0.8, 1.0, 0.02]); add(g, G.box, 0xc0473d, [0, 0.5, 0.82], [0.68, 0.88, 0.02]);
    beam(g, [-0.34, 0.06, 0.835], [0.34, 0.94, 0.835], 0.025, 0xffffff, G.box); beam(g, [0.34, 0.06, 0.835], [-0.34, 0.94, 0.835], 0.025, 0xffffff, G.box);
    add(g, G.box, 0xffffff, [0, 1.65, 0.81], [0.36, 0.3, 0.02]); add(g, G.box, 0x5a3a28, [0, 1.65, 0.82], [0.28, 0.22, 0.02]);
    g.userData.solid = true; return g;
  }
  function hay(p, x, z, ry = 0) { const m = add(p, G.cyl, 0xe9c66a, [x, 0.28, z], [0.3, 0.6, 0.3], [Math.PI / 2, ry, 0], { flatShading: true }); m.userData.solid = true; add(p, G.cyl, 0xd8b052, [x + Math.sin(ry) * 0.301, 0.28, z + Math.cos(ry) * 0.301], [0.24, 0.002, 0.24], [Math.PI / 2, ry, 0]); return m; }
  function sheep(p, x, z, ry = 0, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.scale.setScalar(s); p.add(g);
    for (let i = 0; i < 7; i++) add(g, G.ico, 0xfaf7ef, [Math.cos(i) * 0.12, 0.34 + (i % 2) * 0.06, Math.sin(i * 1.7) * 0.15], 0.14, null, { flatShading: true });
    add(g, G.sph, 0x3a3330, [0, 0.38, 0.26], [0.09, 0.1, 0.11]); add(g, G.sph, 0x3a3330, [0.09, 0.42, 0.24], [0.05, 0.02, 0.03]); add(g, G.sph, 0x3a3330, [-0.09, 0.42, 0.24], [0.05, 0.02, 0.03]);
    [[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1]].forEach(q => add(g, G.cyl6, 0x3a3330, [q[0], 0.12, q[1]], [0.025, 0.24, 0.025]));
    g.userData.solid = true; return g;
  }
  const hoppers = [];
  function chick(p, x, z, ry = 0, hop = true) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); add(g, G.sph, 0xffd84a, [0, 0.07, 0], 0.07); add(g, G.sph, 0xffd84a, [0, 0.15, 0.04], 0.045); add(g, G.cone, 0xff9b2f, [0, 0.15, 0.09], [0.015, 0.035, 0.015], [Math.PI / 2, 0, 0]); add(g, G.sph, 0x222222, [0.022, 0.17, 0.075], 0.008); add(g, G.sph, 0x222222, [-0.022, 0.17, 0.075], 0.008); if (hop) hoppers.push({ o: g, ph: x * 3 + z, h: 0.05 }); g.userData.solid = true; return g; }
  function trough(p, x, z, ry = 0) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); add(g, G.box, 0x9a6a3a, [0, 0.2, 0], [1.0, 0.22, 0.34]); add(g, G.box, 0xd8b052, [0, 0.3, 0], [0.9, 0.04, 0.26]); [-0.4, 0.4].forEach(sx => add(g, G.box, 0x7a5636, [sx, 0.08, 0], [0.06, 0.16, 0.4])); g.userData.solid = true; return g; }
  function cropRows(p, o) {      // instanced crop rows: sunflower / lavender / rapeseed / carrot / cabbage / tulip
    const r = o.r || rng(11), pos = [];
    for (let z = o.z0; z <= o.z1; z += o.gap) for (let x = o.x0; x <= o.x1; x += o.step) { const xx = x + (r() - 0.5) * o.step * 0.4, zz = z + (r() - 0.5) * o.gap * 0.15; if (o.skip && o.skip(xx, zz)) continue; if (Math.hypot(xx, zz) < (o.keep ?? 2.3)) continue; pos.push([xx, zz]); }
    const g = new THREE.Group(); p.add(g); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); const n = pos.length;
    const inst = (geo, col, fn, o2) => { const im = new THREE.InstancedMesh(geo, mat(col, o2 || {}), n); pos.forEach((pp, i) => { const res = fn(pp, i); m4.compose(V(...res[0]), res[2] || q.identity(), V(...res[1])); im.setMatrixAt(i, m4); if (res[3]) im.setColorAt(i, c.set(res[3])); }); g.add(im); return im; };
    const H = o.h || 1;
    if (o.kind === 'sunflower') {
      inst(G.cyl6, 0x5f9a3c, (pp) => [[pp[0], 0.45 * H, pp[1]], [0.025, 0.9 * H, 0.025]]);
      inst(G.sph, 0x6faa48, (pp) => [[pp[0] + 0.06, 0.45 * H, pp[1]], [0.12, 0.02, 0.07]]);
      inst(G.cyl, 0xffffff, (pp, i) => [[pp[0], 0.95 * H, pp[1] + 0.03], [0.17, 0.03, 0.17], new THREE.Quaternion().setFromEuler(new THREE.Euler(1.25, 0, 0)), i % 5 ? 0xf8c62c : 0xf5b21c]);
      inst(G.cyl, 0x6b3e1e, (pp) => [[pp[0], 0.955 * H, pp[1] + 0.05], [0.08, 0.03, 0.08], new THREE.Quaternion().setFromEuler(new THREE.Euler(1.25, 0, 0))]);
    } else if (o.kind === 'lavender') {
      inst(G.ico, 0x6f8f5a, (pp) => [[pp[0], 0.13, pp[1]], [0.2, 0.15, 0.2]], { flatShading: true });
      inst(G.cone6, 0xffffff, (pp, i) => [[pp[0], 0.34, pp[1]], [0.17, 0.3, 0.17], null, [0x9b7fd1, 0x8a6cc4, 0xb39ae0][i % 3]], { flatShading: true });
    } else if (o.kind === 'rapeseed') {
      inst(G.ico, 0x7fae3c, (pp) => [[pp[0], 0.16, pp[1]], [0.2, 0.18, 0.2]], { flatShading: true });
      inst(G.ico, 0xffffff, (pp, i) => [[pp[0], 0.38, pp[1]], [0.17, 0.12, 0.17], null, [0xf8dc2c, 0xf4cf1a, 0xfbe65a][i % 3]], { flatShading: true });
    } else if (o.kind === 'carrot') {
      inst(G.cone6, 0xff8a2a, (pp) => [[pp[0], 0.03, pp[1]], [0.05, 0.08, 0.05]]);
      inst(G.cone6, 0x5aa94b, (pp) => [[pp[0] + 0.02, 0.14, pp[1]], [0.05, 0.18, 0.05], new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.3))]);
      inst(G.cone6, 0x6fbf5a, (pp) => [[pp[0] - 0.02, 0.13, pp[1]], [0.04, 0.16, 0.04], new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.35))]);
    } else if (o.kind === 'cabbage') {
      inst(G.ico, 0xffffff, (pp, i) => [[pp[0], 0.09, pp[1]], [0.13, 0.1, 0.13], null, [0x8fcf6a, 0x7cc45a, 0xb3dd7f][i % 3]], { flatShading: true });
    } else if (o.kind === 'tulip') {
      inst(G.cyl6, 0x4f9a46, (pp) => [[pp[0], 0.13, pp[1]], [0.012, 0.26, 0.012]]);
      inst(G.sph, 0xffffff, (pp, i) => [[pp[0], 0.28, pp[1]], [0.045, 0.065, 0.045], null, o.colors[i % o.colors.length]]);
    } else if (o.kind === 'daisy') {
      inst(G.cyl6, 0x4f9a46, (pp) => [[pp[0], 0.07, pp[1]], [0.008, 0.14, 0.008]]);
      inst(G.cyl, 0xffffff, (pp, i) => [[pp[0], 0.145, pp[1]], [0.05, 0.01, 0.05], null, o.colors ? o.colors[i % o.colors.length] : 0xffffff]);
      inst(G.sph, 0xf6c445, (pp) => [[pp[0], 0.152, pp[1]], [0.018, 0.01, 0.018]]);
    } else if (o.kind === 'tea') {
      inst(G.ico, 0xffffff, (pp, i) => [[pp[0], 0.22, pp[1]], [o.step * 0.62, 0.24, o.gap * 0.42], null, [0x4f9a46, 0x5aa94b][i % 2]], { flatShading: true });
    }
    return g;
  }
  function bamboo(p, x, z, n = 9, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g); const r = rng(hashStr('b' + x + z));
    for (let i = 0; i < n; i++) { const px = (r() - 0.5) * 0.9 * s, pz = (r() - 0.5) * 0.7 * s, h = (2.6 + r() * 1.4) * s, lean = (r() - 0.5) * 0.12;
      const st = new THREE.Group(); st.position.set(px, 0, pz); st.rotation.z = lean; g.add(st);
      for (let k = 0; k < 6; k++) { add(st, G.cyl6, 0x7fb04a, [0, (k + 0.5) * h / 6, 0], [0.035, h / 6 - 0.01, 0.035]); add(st, G.cyl6, 0x5f8f3a, [0, (k + 1) * h / 6, 0], [0.04, 0.02, 0.04]); }
      for (let k = 0; k < 5; k++) { const a = r() * TAU; add(st, G.cone6, k % 2 ? 0x6fae45 : 0x5f9e3c, [Math.cos(a) * 0.14, h * (0.55 + k * 0.1), Math.sin(a) * 0.14], [0.05, 0.3, 0.012], [Math.PI / 2 - 0.3, a, 0]); }
      sways.push({ o: st, a: 0.02, f: 0.5 + r() * 0.3, ph: r() * 6, axis: 'x' }); }
    g.userData.solid = true; return g;
  }
  function doghouse(p, x, z, ry = 0, col = 0xd9643a, name = 'SPARKEE') {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
    add(g, G.box, 0xf3d9a8, [0, 0.35, 0], [0.9, 0.7, 1.0]);
    const sh = new THREE.Shape(); sh.moveTo(-0.55, 0); sh.lineTo(0, 0.42); sh.lineTo(0.55, 0); sh.closePath(); const rg = new THREE.ExtrudeGeometry(sh, { depth: 1.1, bevelEnabled: false }); rg.translate(0, 0.7, -0.55); add(g, rg, col, [0, 0, 0], 1, null, { flatShading: true });
    const door = new THREE.Shape(); door.moveTo(-0.2, 0); door.lineTo(-0.2, 0.32); door.absarc(0, 0.32, 0.2, Math.PI, 0, true); door.lineTo(0.2, 0); door.closePath(); add(g, new THREE.ShapeGeometry(door), 0x3a2a20, [0, 0, 0.505]);
    board(g, name, '#ffffff', '#c0473d', [0, 0.8, 0.555], 0.42, 0.14);
    add(g, G.cyl, 0x4aa3df, [0.62, 0.05, 0.45], [0.13, 0.08, 0.13]); add(g, G.cyl, 0x9bd8f0, [0.62, 0.09, 0.45], [0.11, 0.01, 0.11]);
    g.userData.solid = true; return g;
  }
  function hydrant(p, x, z, col = 0xe8484a) { const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g); add(g, G.cyl, col, [0, 0.22, 0], [0.09, 0.44, 0.09]); add(g, G.sph, col, [0, 0.45, 0], [0.1, 0.07, 0.1]); add(g, G.cyl, col, [0, 0.3, 0], [0.04, 0.26, 0.04], [0, 0, Math.PI / 2]); add(g, G.cyl, 0xf6c445, [0, 0.52, 0], [0.03, 0.05, 0.03]); g.userData.solid = true; return g; }
  function hurdle(p, x, z, ry = 0, h = 0.3, col = 0xf6c445) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); [-0.4, 0.4].forEach(sx => { add(g, G.cyl6, 0xffffff, [sx, h / 2 + 0.05, 0], [0.025, h + 0.1, 0.025]); add(g, G.box, 0xffffff, [sx, 0.01, 0], [0.04, 0.02, 0.3]); }); add(g, G.cyl6, col, [0, h, 0], [0.025, 0.8, 0.025], [0, 0, Math.PI / 2]); g.userData.solid = true; return g; }
  function weave(p, x, z, ry = 0, n = 6) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); for (let i = 0; i < n; i++) add(g, G.cyl6, i % 2 ? 0xe8584a : 0xffffff, [i * 0.35 - (n - 1) * 0.175, 0.4, 0], [0.018, 0.8, 0.018]); add(g, G.box, 0x777777, [0, 0.01, 0], [n * 0.35, 0.02, 0.04]); g.userData.solid = true; return g; }
  function tunnel(p, x, z, ry = 0, col = 0x4aa3df) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); add(g, new THREE.CylinderGeometry(0.32, 0.32, 1.6, 20, 6, true), col, [0, 0.32, 0], 1, [0, 0, Math.PI / 2], { side: THREE.DoubleSide }); for (let i = 0; i < 7; i++) add(g, new THREE.TorusGeometry(0.325, 0.012, 6, 24), 0xffffff, [-0.75 + i * 0.25, 0.32, 0], 1, [0, Math.PI / 2, 0]); g.userData.solid = true; return g; }
  function library(p, x, z, ry = 0, col = 0x4aa3df) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
    add(g, G.box, 0x7a5636, [0, 0.5, 0], [0.08, 1.0, 0.08]); add(g, G.box, col, [0, 1.25, 0], [0.6, 0.5, 0.38]);
    const sh = new THREE.Shape(); sh.moveTo(-0.38, 0); sh.lineTo(0, 0.24); sh.lineTo(0.38, 0); sh.closePath(); const rg = new THREE.ExtrudeGeometry(sh, { depth: 0.46, bevelEnabled: false }); rg.translate(0, 1.5, -0.23); add(g, rg, 0xc0564a, [0, 0, 0], 1);
    const bc = [0xe8584a, 0xf6c445, 0x7cc45a, 0xffffff, 0x9b7fd1, 0xff8a3d]; for (let i = 0; i < 9; i++) add(g, G.box, bc[i % bc.length], [-0.22 + i * 0.055, 1.2 + (i % 2) * 0.01, 0.1], [0.045, 0.2 + (i % 3) * 0.03, 0.14]);
    add(g, G.box, mat(0xcfe9f5, { transparent: true, opacity: 0.35 }), [0, 1.25, 0.195], [0.54, 0.42, 0.01]);
    board(g, '小小圖書館', '#fff7e6', '#3c6e47', [0, 0.85, 0.06], 0.5, 0.16);
    g.userData.solid = true; return g;
  }
  function stage(p, x, z, w = 3.2, curtain = 0xc0392b, deck = 0x8a5a3a) {
    const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
    add(g, G.box, deck, [0, 0.22, 0], [w, 0.44, 1.4]); for (let i = 0; i < 3; i++) add(g, G.box, 0xa87048, [0, 0.07 + i * 0.07, 0.75 + i * -0.0], [w * 0.4, 0.14 + i * 0.14, 0.1 + 0.0]);
    [-w / 2, w / 2].forEach(sx => add(g, G.box, 0xf3ead8, [sx, 1.55, -0.5], [0.16, 2.3, 0.16]));
    add(g, G.box, 0xf3ead8, [0, 2.7, -0.5], [w + 0.16, 0.24, 0.2]);
    const cm = mat(curtain, { flatShading: true }); add(g, G.box, mat(curtain), [0, 1.56, -0.66], [w, 2.25, 0.04]); const nc = Math.ceil((w - 0.2) / 0.17); for (let i = 0; i <= nc; i++) add(g, G.cyl6, cm, [-w / 2 + 0.1 + i * (w - 0.2) / nc, 1.56, -0.6], [0.11, 2.25, 0.07]);
    for (let i = 0; i < 9; i++) add(g, G.sph, curtain, [-w / 2 + 0.15 + i * (w - 0.3) / 8, 2.52, -0.42], [0.2, 0.12, 0.08]);
    g.userData.solid = true; return g;
  }
  function bleachers(p, x, z, ry = 0, w = 2.4, cols = [0x4aa3df, 0xe8584a, 0xf6c445]) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); for (let i = 0; i < 3; i++) { add(g, G.box, 0xb9c2c8, [0, 0.15 + i * 0.3, -i * 0.4], [w, 0.3 + i * 0.6, 0.4].map((v, k) => k === 1 ? 0.3 : v)); add(g, G.box, cols[i % cols.length], [0, 0.32 + i * 0.3, -i * 0.4], [w, 0.04, 0.38]); [-w / 2 + 0.1, w / 2 - 0.1].forEach(sx => add(g, G.box, 0x8a949c, [sx, (0.3 + i * 0.3) / 2, -i * 0.4], [0.06, 0.3 + i * 0.3, 0.38])); } g.userData.solid = true; return g; }
  function arch(p, x, z, text, cols = [0xe8584a, 0xf6c445, 0x4aa3df], w = 3.0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
    [-w / 2, w / 2].forEach((sx, i) => { add(g, G.cyl, cols[i % cols.length], [sx, 1.1, 0], [0.13, 2.2, 0.13]); add(g, G.sph, cols[2], [sx, 2.3, 0], 0.17); });
    const t = new THREE.Mesh(new THREE.TorusGeometry(w / 2, 0.1, 10, 30, Math.PI), mat(cols[1])); t.position.set(0, 2.2, 0); g.add(t);
    board(g, text, '#fff7e6', '#e8584a', [0, 2.35, 0.12], 1.9, 0.6);
    for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI; add(g, G.sph, cols[i % 3], [Math.cos(a) * w / 2, 2.2 + Math.sin(a) * w / 2, 0], 0.11); }
    g.userData.solid = true; return g;
  }
  function blockToy(p, x, z, ry, kind, col, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.scale.setScalar(s); p.add(g);
    if (kind === 'cube') add(g, G.box, col, [0, 0.25, 0], [0.5, 0.5, 0.5]);
    else if (kind === 'cyl') add(g, G.cyl, col, [0, 0.35, 0], [0.22, 0.7, 0.22]);
    else if (kind === 'tri') { const sh = new THREE.Shape(); sh.moveTo(-0.3, 0); sh.lineTo(0, 0.5); sh.lineTo(0.3, 0); sh.closePath(); const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false }); geo.translate(0, 0, -0.2); add(g, geo, col); }
    else if (kind === 'arch') { add(g, G.box, col, [-0.3, 0.25, 0], [0.18, 0.5, 0.4]); add(g, G.box, col, [0.3, 0.25, 0], [0.18, 0.5, 0.4]); add(g, G.box, col, [0, 0.58, 0], [0.78, 0.16, 0.4]); }
    g.userData.solid = true; return g;
  }
  function fitness(p, x, z, ry = 0, kind = 'bars') {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
    if (kind === 'bars') { [0, 1, 2].forEach(i => { const h = 1.2 + i * 0.35, xx = -0.7 + i * 0.7; beam(g, [xx - 0.35, 0, 0], [xx - 0.35, h, 0], 0.035, 0x2f7fbf); beam(g, [xx + 0.35, 0, 0], [xx + 0.35, h, 0], 0.035, 0x2f7fbf); beam(g, [xx - 0.35, h, 0], [xx + 0.35, h, 0], 0.025, 0xf6c445); }); }
    else if (kind === 'stepper') { add(g, G.box, 0x7cc45a, [0, 0.6, -0.1], [0.12, 1.2, 0.12]); beam(g, [-0.25, 1.1, -0.1], [0.25, 1.1, -0.1], 0.025, 0xf6c445); [-0.18, 0.18].forEach(sx => { add(g, G.box, 0xe8584a, [sx, 0.25, 0.15], [0.18, 0.04, 0.26]); beam(g, [sx, 0.25, 0.05], [sx * 0.5, 0.55, -0.1], 0.02, 0x7cc45a); }); }
    else if (kind === 'beam') { [-0.8, 0.8].forEach(sx => add(g, G.box, 0x9a6a3a, [sx, 0.12, 0], [0.12, 0.24, 0.3])); add(g, G.box, 0xc9894a, [0, 0.27, 0], [2.0, 0.08, 0.14]); }
    else if (kind === 'wheel') { add(g, G.box, 0x2f7fbf, [0, 0.65, -0.05], [0.1, 1.3, 0.1]); const w = add(g, new THREE.TorusGeometry(0.32, 0.03, 8, 24), 0xe8584a, [0, 1.15, 0.05]); add(g, G.cyl, 0xf6c445, [0, 1.15, 0.05], [0.05, 0.08, 0.05], [Math.PI / 2, 0, 0]); blades.push({ o: w, sp: 0.4 }); }
    g.userData.solid = true; return g;
  }
  function scarecrow(p, x, z, ry = 0) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); add(g, G.cyl6, 0x8a6240, [0, 0.7, 0], [0.03, 1.4, 0.03]); beam(g, [-0.45, 1.05, 0], [0.45, 1.05, 0], 0.025, 0x8a6240); add(g, G.box, 0x4aa3df, [0, 0.95, 0], [0.4, 0.38, 0.18]); add(g, G.sph, 0xf3d9a8, [0, 1.32, 0], 0.15); add(g, G.cyl, 0xd8b052, [0, 1.44, 0], [0.26, 0.02, 0.26]); add(g, G.cone, 0xd8b052, [0, 1.53, 0], [0.13, 0.18, 0.13]); add(g, G.sph, 0x222222, [0.05, 1.35, 0.13], 0.018); add(g, G.sph, 0x222222, [-0.05, 1.35, 0.13], 0.018); add(g, G.box, 0xe8584a, [0, 1.17, 0.05], [0.3, 0.06, 0.12]); g.userData.solid = true; return g; }
  function raisedBed(p, x, z, w, d, ry, kind, colors) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); add(g, G.box, 0xa87048, [0, 0.12, 0], [w, 0.24, d]); add(g, G.box, 0x6b4a32, [0, 0.245, 0], [w - 0.08, 0.01, d - 0.08]); cropRows(g, { kind, x0: -w / 2 + 0.15, x1: w / 2 - 0.1, z0: -d / 2 + 0.15, z1: d / 2 - 0.1, step: 0.22, gap: 0.24, keep: -1, colors, r: rng(hashStr(kind + x)) }).position.y = 0.24; g.userData.solid = true; return g; }
  function kiosk(p, x, z, ry = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
    add(g, G.box, 0xfff3e0, [0, 0.55, 0], [1.6, 1.1, 0.9]); add(g, G.box, 0xf5a3c0, [0, 1.12, 0.05], [1.7, 0.06, 1.0]);
    for (let i = 0; i < 8; i++) add(g, G.box, i % 2 ? 0xffffff : 0xf27aa6, [-0.75 + i * 0.214, 1.7, 0.42], [0.214, 0.06, 0.5], [0.45, 0, 0]);
    [-0.75, 0.75].forEach(sx => add(g, G.cyl6, 0xffffff, [sx, 1.45, 0.4], [0.03, 0.66, 0.03]));
    add(g, G.box, 0xfff3e0, [0, 1.7, -0.3], [1.6, 0.6, 0.06]);
    const c = new THREE.Group(); c.position.set(0, 2.15, 0); g.add(c); add(c, G.cone, 0xe6b46a, [0, 0, 0], [0.16, 0.38, 0.16], [Math.PI, 0, 0]); add(c, G.sph, 0xffc2d6, [0, 0.22, 0], 0.17); add(c, G.sph, 0xfff5e0, [0, 0.38, 0], 0.13); add(c, G.sph, 0xe8484a, [0, 0.52, 0], 0.04);
    board(g, '冰淇淋', '#f27aa6', '#ffffff', [0, 0.65, 0.46], 0.9, 0.3);
    g.userData.solid = true; return g;
  }
  function roseArch(p, x, z, ry = 0, cols = [0xe84a6a, 0xf7a8c0, 0xffffff]) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); [-0.7, 0.7].forEach(sx => add(g, G.box, 0xffffff, [sx, 0.9, 0], [0.06, 1.8, 0.06])); const t = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 8, 20, Math.PI), mat(0xffffff)); t.position.y = 1.8; g.add(t); for (let i = 0; i < 26; i++) { const k = i / 25, ang = k * Math.PI; const pos = k < 0.18 ? [-0.7, 0.3 + k / 0.18 * 1.5, 0] : k > 0.82 ? [0.7, 0.3 + (1 - k) / 0.18 * 1.5, 0] : [Math.cos(Math.PI - (k - 0.18) / 0.64 * Math.PI) * 0.7, 1.8 + Math.sin((k - 0.18) / 0.64 * Math.PI) * 0.7, 0]; add(g, G.ico, 0x4f9a46, [pos[0], pos[1], (i % 2 - 0.5) * 0.08], 0.09, null, { flatShading: true }); add(g, G.sph, cols[i % cols.length], [pos[0] + 0.03, pos[1] + 0.03, 0.08 * (i % 2 ? 1 : -1)], 0.065); } g.userData.solid = true; return g; }
  function signpost(p, x, z, ry, labels) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); add(g, G.box, 0x8a6240, [0, 0.8, 0], [0.07, 1.6, 0.07]); labels.forEach((l, i) => { const b = board(g, l[0], l[1], '#ffffff', [0.25 * (i % 2 ? -1 : 1), 1.4 - i * 0.26, 0.05], 0.6, 0.2, 0); b.rotation.y = (i % 2 ? -0.2 : 0.2); }); g.userData.solid = true; return g; }
  function hills(p, r, cols, n = 9, rad = [17, 24], hgt = [2, 4.5], arc = [0, TAU]) {
    for (let i = 0; i < n; i++) { const a = arc[0] + (arc[1] - arc[0]) * (i + r() * 0.6) / n, R = rad[0] + r() * (rad[1] - rad[0]), h = hgt[0] + r() * (hgt[1] - hgt[0]);
      add(p, G.sph, cols[i % cols.length], [Math.sin(a) * R, -h * 0.25, -Math.cos(a) * R], [h * 2.4 + r() * 3, h, h * 1.6], null, { flatShading: false }); }
  }
  function treeRing(p, r, kinds, n = 26, rad = [10.5, 15], leaf) {
    for (let i = 0; i < n; i++) { const a = (i + r() * 0.8) / n * TAU, R = rad[0] + r() * (rad[1] - rad[0]); tree(p, Math.sin(a) * R, -Math.cos(a) * R, kinds[i % kinds.length], 1.1 + r() * 0.7, leaf && leaf[i % leaf.length]); }
  }
  const drifters = [];
  function clouds(p, r, n = 6, col = 0xffffff, y = [7, 10]) {
    for (let i = 0; i < n; i++) { const g = new THREE.Group(); const a = -0.9 + r() * 1.8, R = 22 + r() * 6; g.position.set(Math.sin(a) * R, y[0] + r() * (y[1] - y[0]), -Math.cos(a) * R); p.add(g);
      for (let k = 0; k < 5; k++) add(g, G.sph, col, [(k - 2) * 0.9 + r() * 0.3, (k % 2) * 0.35 + (k === 2 ? 0.5 : 0), r() * 0.3], [1 + r() * 0.5, 0.75 + r() * 0.3, 0.7], null, { fog: false });
      drifters.push({ o: g, sp: 0.05 + r() * 0.06, x0: g.position.x }); }
  }
  function stars(p, r, n = 260) {
    const pos = []; for (let i = 0; i < n; i++) { const a = r() * TAU, e = 0.08 + r() * 1.2, R = 32; pos.push(Math.cos(e) * Math.sin(a) * R, Math.sin(e) * R, -Math.cos(e) * Math.cos(a) * R); }
    const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const pm = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xfff8e0, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9 })); p.add(pm); return pm;
  }
  function moon(p, x, y, z, s = 1.3, col = 0xfff4c8) { add(p, G.sph, col, [x, y, z], s, null, { glow: true, fog: false }); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, depthWrite: false, opacity: 0.55, fog: false })); sp.position.set(x, y, z); sp.scale.setScalar(s * 6); p.add(sp); }
  function sunDisc(p, x, y, z, s = 2.2, col = 0xffc070) { add(p, G.sph, col, [x, y, z], s, null, { glow: true, fog: false }); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, depthWrite: false, opacity: 0.6, fog: false })); sp.position.set(x, y, z); sp.scale.setScalar(s * 7); p.add(sp); }
  const fireflies = [];
  function fireflyCloud(p, r, n = 30, col = 0xfff08a, box = [-6, 6, 0.3, 2.2, -7, -2]) { for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, depthWrite: false, opacity: 0.9 })); s.scale.setScalar(0.14); s.position.set(box[0] + r() * (box[1] - box[0]), box[2] + r() * (box[3] - box[2]), box[4] + r() * (box[5] - box[4])); p.add(s); fireflies.push({ o: s, ph: r() * 6, b: s.position.clone() }); } }
  const petals = [];
  function petalFall(p, r, n = 40, col = 0xf9c3d5, box = [-5, 5, 0, 3.4, -6, -1.5]) { const geo = new THREE.CircleGeometry(0.035, 5); for (let i = 0; i < n; i++) { const m = add(p, geo, col, [box[0] + r() * (box[1] - box[0]), box[2] + r() * (box[3] - box[2]), box[4] + r() * (box[5] - box[4])], 1, [r() * 3, r() * 3, 0], { side: THREE.DoubleSide }); petals.push({ o: m, sp: 0.2 + r() * 0.2, ph: r() * 6, top: box[3], bot: box[2], x0: m.position.x }); } }
  const birds = [];
  function birdFlock(p, r, n = 3, col = 0x3a3a48) { for (let i = 0; i < n; i++) { const g = new THREE.Group(); p.add(g); const w1 = add(g, G.box, col, [0.12, 0, 0], [0.24, 0.015, 0.07]); const w2 = add(g, G.box, col, [-0.12, 0, 0], [0.24, 0.015, 0.07]); birds.push({ o: g, w1, w2, ph: r() * 6, R: 6 + r() * 3, y: 4 + r() * 1.5, z: -9 - r() * 3, sp: 0.08 + r() * 0.05 }); } }
  function balloonBunch(p, x, z, cols) { const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g); cols.forEach((c, i) => { const a = i * 2.3, top = [Math.cos(a) * 0.18, 1.7 + (i % 3) * 0.15, Math.sin(a) * 0.12]; beam(g, [0, 0.9, 0], top, 0.004, 0xffffff); add(g, G.sph, c, top, [0.14, 0.17, 0.14]); }); add(g, G.box, 0x7a5636, [0, 0.45, 0], [0.05, 0.9, 0.05]); sways.push({ o: g, a: 0.04, f: 0.8, ph: x, axis: 'z' }); g.userData.solid = true; return g; }
  function lantern(p, x, y, z, col = 0xff6a3a) { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); add(g, G.sph, col, [0, 0, 0], [0.13, 0.16, 0.13], null, { glow: true }); add(g, G.cyl, 0x332a20, [0, 0.16, 0], [0.06, 0.03, 0.06]); add(g, G.cyl, 0x332a20, [0, -0.16, 0], [0.06, 0.03, 0.06]); twinkles.push({ o: g.children[0], ph: x + z, soft: true }); return g; }
  function mushroomHouse(p, x, z, s = 1, cap = 0xe8484a) { const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); p.add(g); add(g, G.cyl, 0xfff3e0, [0, 0.35, 0], [0.32, 0.7, 0.32]); add(g, G.sph, cap, [0, 0.75, 0], [0.62, 0.42, 0.62]); for (let i = 0; i < 7; i++) { const a = i * 0.9; add(g, G.sph, 0xffffff, [Math.cos(a) * 0.4, 0.9 + (i % 2) * 0.1, Math.sin(a) * 0.4], 0.07); } add(g, G.box, 0x8a6240, [0, 0.22, 0.31], [0.2, 0.34, 0.03]); add(g, G.sph, 0x9bd1e8, [0.18, 0.5, 0.29], [0.07, 0.07, 0.02]); g.userData.solid = true; return g; }
  function boardwalk(p, x0, x1, z, w = 0.9, h = 0.12) { const g = new THREE.Group(); p.add(g); const n = Math.round((x1 - x0) / 0.16); for (let i = 0; i < n; i++) add(g, G.box, i % 2 ? 0xb07a48 : 0xa36f40, [x0 + (i + 0.5) * (x1 - x0) / n, h, z], [(x1 - x0) / n * 0.92, 0.04, w]); for (let x = x0; x <= x1 + 0.01; x += 0.8) { [-1, 1].forEach(k => { add(g, G.cyl6, 0x8a5a36, [x, (h + 0.5) / 2, z + k * w / 2], [0.035, h + 0.5, 0.035]); }); } [-1, 1].forEach(k => beam(g, [x0, h + 0.45, z + k * w / 2], [x1, h + 0.45, z + k * w / 2], 0.025, 0x8a5a36, G.cyl6)); g.userData.solid = true; return g; }
  function boat(p, x, z, ry = 0, col = 0xffffff, col2 = 0xe8584a) { const g = new THREE.Group(); g.position.set(x, 0.02, z); g.rotation.y = ry; p.add(g); add(g, G.sph, col, [0, 0.12, 0], [0.42, 0.16, 0.22]); add(g, G.sph, col2, [0, 0.16, 0], [0.38, 0.06, 0.19]); add(g, G.sph, col, [0.05, 0.36, 0], [0.18, 0.12, 0.16]); add(g, G.sph, 0x222222, [0.2, 0.4, 0.1], 0.02); add(g, G.cone, 0xf6c445, [0.27, 0.36, 0], [0.03, 0.08, 0.03], [0, 0, -Math.PI / 2]); ducks.push({ o: g, bob: true, ph: x }); g.userData.solid = true; return g; }
  function musicNotes(p, r, n = 6, box = [-3, 3, 1.8, 3.2, -4, -2.5]) { for (let i = 0; i < n; i++) { const g = new THREE.Group(); g.position.set(box[0] + r() * (box[1] - box[0]), box[2] + r() * (box[3] - box[2]), box[4] + r() * (box[5] - box[4])); p.add(g); const c = [0xe8584a, 0x4aa3df, 0xf6c445, 0x9b7fd1][i % 4]; add(g, G.sph, c, [0, 0, 0], [0.07, 0.055, 0.04]); add(g, G.box, c, [0.06, 0.15, 0], [0.018, 0.3, 0.018]); add(g, G.box, c, [0.11, 0.28, 0], [0.1, 0.03, 0.018], [0, 0, -0.4]); fireflies.push({ o: g, ph: r() * 6, b: g.position.clone(), big: true }); } }

  // ---------- shared backdrop: tree ring, far hills, sky dressing, grass tufts ----------
  function std(g, r, o = {}) {
    treeRing(g, r, o.ring || ['round', 'pine'], o.ringN ?? 24, o.ringR || [10.5, 15], o.ringLeaf);
    hills(g, r, o.hills || [0x8cc77a, 0x7ab86a, 0x9ed38a], o.hillN || 9, o.hillR || [17, 24], o.hillH || [2, 4.5]);
    if (o.night) { stars(g, r, o.starN || 260); if (o.moon !== false) moon(g, ...(o.moon || [-7, 10, -24])); }
    else if (o.cloudN !== 0) clouds(g, r, o.cloudN || 5, o.cloudCol || 0xffffff);
    if (o.sun) sunDisc(g, ...o.sun);
    if (o.tuftN !== 0) tufts(g, r, o.tuft || 0x4f9a46, o.tuftN || 220, 2.4, o.skip);
  }
  const SKY = {
    day: ['#6fb6ee', '#a9d8f5', '#e6f4fb'], bright: ['#4aa3ea', '#8fcaf2', '#dff1fb'], morning: ['#8ec5f0', '#cfe6f6', '#fdf3e2'],
    golden: ['#7aa7d9', '#f6c99a', '#fde3b8'], sunset: ['#5b6fb5', '#e9908a', '#fbcf8f'], dusk: ['#3f4f8f', '#a77aa8', '#f2b48e'],
    lavender: ['#4b4f9a', '#b48cc4', '#f6c3b4'], night: ['#0d1638', '#22336a', '#4a5a8c'], deepNight: ['#070d26', '#141f4a', '#2c3a6c'],
    teal: ['#5fb0d8', '#a8dbe8', '#eaf7f2'], warm: ['#79b4e6', '#bcdcf2', '#fff1d6'],
  };
  const keep = (R) => (x, z) => Math.hypot(x, z) < R;
  const behindOnly = (x, z) => z > -2.2 && Math.abs(x) < 3.2;

  // ====================== BABY · 兔子 ======================
  scenes['baby-bunny:idle'] = { name: '苜蓿草地', light: 'morning', sky: SKY.morning,
    ground: { base: '#8fcf78', decals: [{ type: 'clover', n: 1500 }, { type: 'dots', n: 260, x0: -8, x1: 8, z0: -8, z1: 3, colors: ['#ffffff', '#ffd7e6', '#fff4b0'] }] },
    build(g, r) { std(g, r, { ring: ['round', 'round', 'poplar'], ringLeaf: ['mint', 'round'] });
      fence(g, [-4.2, -2.9], [-0.7, -3.1], 'picket'); fence(g, [0.7, -3.1], [4.2, -2.9], 'picket');
      tree(g, -3.3, -3.9, 'round', 1.3, 'mint'); tree(g, 3.6, -4.4, 'round', 1.5);
      const mound = add(g, G.sph, 0x9b7a55, [1.7, 0, -2.3], [0.42, 0.2, 0.36]); mound.userData.solid = true; add(g, G.circle, 0x3a2a1c, [1.7, 0.12, -2.0], [0.13, 0.1, 1], [-0.5, 0, 0]);
      field(g, { r, n: 220, x0: -7, x1: 7, z0: -7, z1: -2.3, colors: [0xffffff, 0xffffff, 0xf9d2e2], size: 0.03, h: 0.07 });
      bush(g, -2.4, -2.6, 0.9, 0x6cbf5a, [0xffffff, 0xf9d2e2]); bush(g, 2.9, -2.4, 0.8, 0x6cbf5a, [0xffffff]);
      for (let i = 0; i < 4; i++) rock(g, -1.2 + i * 0.6, -3.5 - (i % 2) * 0.2, 0.12);
    } };
  scenes['baby-bunny:binky'] = { name: '彈跳遊戲區', light: 'day', sky: SKY.bright,
    ground: { base: '#86c96f', decals: [{ type: 'court', x: 0, z: -3.3, w: 7.5, d: 2.6, color: '#f2a65a', line: '#fff3d6', dots: [[-2.6, -3.0], [-1.3, -3.6], [0, -3.0], [1.3, -3.6], [2.6, -3.0]], dotCols: ['#4aa3df', '#e8584a', '#7cc45a', '#f6c445', '#9b7fd1'] }] },
    build(g, r) { std(g, r, { ring: ['round', 'poplar'], hills: [0x93cf7f, 0x80c06c] });
      springRider(g, -2.0, -2.9, 0.3, 0xf7a8c0, 'bunny'); springRider(g, 2.1, -3.0, -0.3, 0xf6c445, 'duck'); springRider(g, 3.3, -3.8, -0.5, 0x7cc45a, 'bunny');
      seesaw(g, -0.3, -4.0, 0.05, 0x4aa3df);
      [[-3.6, -3.4, 0xe8584a], [3.9, -2.6, 0x4aa3df]].forEach(q => { const d = add(g, new THREE.SphereGeometry(1, 20, 10, 0, TAU, 0, Math.PI / 2), q[2], [q[0], 0, q[1]], [0.6, 0.42, 0.6]); d.userData.solid = true; add(g, G.torus, 0xffffff, [q[0], 0.02, q[1]], [0.6, 0.6, 0.6], [-Math.PI / 2, 0, 0]); });
      balloonBunch(g, -4.4, -4.6, [0xe8584a, 0xf6c445, 0x4aa3df, 0xf7a8c0, 0x7cc45a]);
      tree(g, 4.8, -5.2, 'round', 1.4); tree(g, -5.4, -5.4, 'poplar', 1.3, 'lime');
    } };
  scenes['baby-bunny:pet'] = { name: '胡蘿蔔菜園', light: 'day', sky: SKY.warm,
    ground: { base: '#8cc96e', decals: [{ type: 'rows', x: 0, z: -4.0, w: 7.4, d: 2.6, gap: 0.42, rot: 0 }, { type: 'path', pts: [[-6, -2.45], [6, -2.45]], w: 0.5, color: '#d8c49a' }] },
    build(g, r) { std(g, r, { ring: ['round', 'poplar', 'round'], hills: [0x9ed38a, 0x8cc77a] });
      cropRows(g, { kind: 'carrot', x0: -3.4, x1: 3.4, z0: -5.0, z1: -2.95, step: 0.28, gap: 0.42, r });
      scarecrow(g, 2.7, -3.9, -0.3); fence(g, [-3.8, -5.5], [3.8, -5.5], 'ranch', 0xb5773f, 0.6);
      signpost(g, -3.0, -2.3, 0.4, [['胡蘿蔔田', '#e8843a'], ['小菜園', '#5aa94b']]);
      add(g, G.cyl, 0x8fb8c8, [-2.2, 0.12, -2.25], [0.11, 0.22, 0.11]).userData.solid = true; beam(g, [-2.1, 0.18, -2.25], [-1.92, 0.3, -2.25], 0.018, 0x8fb8c8);
      cropRows(g, { kind: 'sunflower', x0: -6.4, x1: -4.6, z0: -5, z1: -1.2, step: 0.5, gap: 0.6, r, h: 0.9 }); cropRows(g, { kind: 'sunflower', x0: 4.6, x1: 6.4, z0: -5, z1: -1.2, step: 0.5, gap: 0.6, r, h: 0.9 });
    } };
  scenes['baby-bunny:sleep'] = { name: '大樹樹蔭・夕陽', light: 'dusk', sky: SKY.sunset,
    ground: { base: '#83b35f', specks: ['rgba(255,200,120,0.08)', 'rgba(0,40,0,0.08)'], decals: [{ type: 'shadowSpot', x: -0.4, z: -1.6, r: 3.2, k: 0.7 }, { type: 'dots', n: 160, x0: -7, x1: 7, z0: -7, z1: -2, colors: ['#ffe7a8', '#ffffff'] }] },
    build(g, r) { std(g, r, { ring: ['round', 'big'], ringLeaf: ['dusk'], hills: [0x9b7fa8, 0x8a6f9a, 0xa98aaa], sun: [7, 2.4, -26, 2.4, 0xffb060], cloudN: 4, cloudCol: 0xffd2c0, tuft: 0x5f8f42 });
      tree(g, -1.6, -3.0, 'big', 1.7, 'dusk'); bush(g, 2.4, -2.8, 1.0, 0x6f9a4f); bush(g, -3.6, -2.2, 0.9, 0x6f9a4f);
      fireflyCloud(g, r, 22, 0xffe88a, [-4, 4, 0.4, 2.0, -5, -2.4]); birdFlock(g, r, 3);
      for (let i = 0; i < 3; i++) rock(g, 1.2 + i * 0.5, -3.6, 0.14, 0xb0a090);
    } };
  scenes['baby-bunny:sig'] = { name: '碎石小徑', light: 'day', sky: SKY.day,
    ground: { base: '#89c56d', decals: [{ type: 'path', pts: [[-9, 1.2], [-4, 0.6], [-1.5, 0.1], [1.5, -0.2], [4, -0.9], [9, -1.6]], w: 1.3, color: '#cdbb98', gravel: ['#b5a582', '#e1d4b6', '#9d8f74'] }, { type: 'stepping', pts: [[2.2, -2.2], [2.6, -2.9], [2.9, -3.6], [3.4, -4.3]] }] },
    build(g, r) { std(g, r, { ring: ['round', 'pine', 'poplar'] });
      lamp(g, -2.6, -1.4); lamp(g, 3.6, -2.4);
      signpost(g, 1.4, -2.2, -0.3, [['廁所 →', '#4aa3df'], ['← 遊樂場', '#e8584a']]);
      bush(g, -1.2, -2.4, 1.0, 0x5cae4f, [0xffd84a, 0xffffff]); bush(g, -4.2, -1.8, 1.0, 0x5cae4f, [0xe8584a]); bush(g, 0.4, -2.7, 0.8, 0x5cae4f, [0xf7a8c0]);
      tree(g, -3.2, -3.8, 'round', 1.4); tree(g, 0.2, -5.0, 'pine', 1.3); tree(g, 4.9, -4.0, 'round', 1.3, 'lime');
      field(g, { r, n: 140, x0: -7, x1: 7, z0: -6, z1: -2.2, colors: [0xffd84a, 0xffffff, 0xe8584a], size: 0.03 });
    } };

  // ====================== BABY · 乳牛 ======================
  scenes['baby-cow:idle'] = { name: '牧場草原', light: 'morning', sky: SKY.day,
    ground: { base: '#93cc72', decals: [{ type: 'dots', n: 200, x0: -8, x1: 8, z0: -8, z1: 2, colors: ['#ffffff', '#fff2a0'] }] },
    build(g, r) { std(g, r, { ring: ['poplar', 'round'], ringN: 16, hills: [0x8fcf6f, 0x7fbf60, 0xa2d880], hillR: [13, 20], hillH: [1.5, 3.5] });
      fence(g, [-5, -3.0], [-1.5, -3.4], 'ranch', 0xb5773f, 0.7); fence(g, [-1.5, -3.4], [2.2, -3.3], 'ranch', 0xb5773f, 0.7); fence(g, [2.2, -3.3], [5, -2.6], 'ranch', 0xb5773f, 0.7);
      hay(g, 2.7, -4.1, 0.4); hay(g, 3.4, -3.9, 1.2); hay(g, -2.6, -4.3, 0.2);
      barn(g, -3.6, -6.6, 0.35, 1.1); tree(g, 4.6, -5.6, 'poplar', 1.4); tree(g, 0.8, -6.4, 'round', 1.5);
      add(g, G.cyl6, 0x8a6240, [-1.3, 0.6, -3.5], [0.05, 1.2, 0.05]).userData.solid = true; board(g, '牧場', '#ffffff', '#3a7a3a', [-1.3, 1.15, -3.42], 0.6, 0.24);
    } };
  scenes['baby-cow:binky'] = { name: '向日葵花田', light: 'golden', sky: SKY.bright,
    ground: { base: '#8fc464', decals: [{ type: 'path', pts: [[0, -2.0], [0.4, -4], [-0.2, -7]], w: 0.7, color: '#d9c38f' }] },
    build(g, r) { std(g, r, { ring: ['round'], ringN: 14, hills: [0x9ccf6a, 0xb0d870], cloudN: 4 });
      cropRows(g, { kind: 'sunflower', x0: -6.5, x1: 6.5, z0: -7, z1: -2.5, step: 0.45, gap: 0.55, r, h: 1.05, skip: (x, z) => Math.abs(x - 0.15) < 0.55 && z < -2 });
      cropRows(g, { kind: 'sunflower', x0: -6.5, x1: -3.2, z0: -2.4, z1: 1.2, step: 0.45, gap: 0.55, r, h: 0.9 }); cropRows(g, { kind: 'sunflower', x0: 3.2, x1: 6.5, z0: -2.4, z1: 1.2, step: 0.45, gap: 0.55, r, h: 0.9 });
      board(g, '向日葵花田', '#f8c62c', '#6b3e1e', [-0.75, 0.75, -2.3], 0.9, 0.3, 0.2); add(g, G.box, 0x8a6240, [-0.75, 0.32, -2.32], [0.05, 0.64, 0.05]).userData.solid = true;
      birdFlock(g, r, 2);
    } };
  scenes['baby-cow:pet'] = { name: '可愛動物區', light: 'day', sky: SKY.warm,
    ground: { base: '#8bc66d', decals: [{ type: 'ellipse', x: 0, z: -3.8, rx: 3.8, rz: 1.5, color: '#c9b27d', edge: 'rgba(110,90,60,0.3)' }] },
    build(g, r) { std(g, r, { ring: ['round', 'poplar'] });
      fence(g, [-3.9, -2.4], [-0.6, -2.4], 'picket', 0xffffff, 0.45); fence(g, [0.6, -2.4], [3.9, -2.4], 'picket', 0xffffff, 0.45); fence(g, [-3.9, -2.4], [-3.9, -5.3], 'picket', 0xffffff, 0.45); fence(g, [3.9, -2.4], [3.9, -5.3], 'picket', 0xffffff, 0.45);
      sheep(g, -2.2, -3.6, 0.6); sheep(g, 1.9, -4.4, -0.8, 0.9); sheep(g, -0.8, -4.7, 0.2, 0.8);
      [[0.6, -3.1], [0.9, -3.3], [1.2, -3.0], [-1.6, -3.0]].forEach(q => chick(g, q[0], q[1], r() * 6));
      trough(g, 2.6, -3.0, 0.2); hay(g, -3.2, -4.6, 0.6);
      const sg = new THREE.Group(); sg.position.set(-0.95, 0, -2.25); g.add(sg); add(sg, G.box, 0x8a6240, [-0.4, 0.45, 0], [0.05, 0.9, 0.05]); add(sg, G.box, 0x8a6240, [0.4, 0.45, 0], [0.05, 0.9, 0.05]); board(sg, '可愛動物區', '#fff7e6', '#c0473d', [0, 0.82, 0.03], 0.9, 0.28); sg.userData.solid = true;
      barn(g, 3.0, -6.6, -0.3, 0.9);
    } };
  scenes['baby-cow:sleep'] = { name: '風車山坡・夜', light: 'night', sky: SKY.night,
    ground: { base: '#4f7a55', specks: ['rgba(160,190,255,0.06)', 'rgba(0,20,0,0.1)'], decals: [] },
    build(g, r) { std(g, r, { night: true, ring: ['round', 'pine'], ringLeaf: ['night'], hills: [0x3b5a52, 0x2f4b48, 0x45665a], tuft: 0x3f6a48, moon: [5, 9, -24, 1.5] });
      const hill = add(g, G.sph, 0x5a8a5e, [1.8, -0.9, -7.2], [3.4, 1.6, 2.6]); hill.userData.solid = true;
      windmill(g, 1.8, -7.0, -0.15, 1.0).position.y = 0.6;
      fireflyCloud(g, r, 34, 0xfff2a0, [-4.5, 4.5, 0.3, 2.2, -5.5, -2.2]);
      fence(g, [-4.5, -3.6], [-1.0, -3.8], 'ranch', 0x7a6a58, 0.6); hay(g, -2.6, -4.6, 0.3);
      lamp(g, -3.4, -2.9, true);
    } };
  scenes['baby-cow:sig'] = { name: '綠草坡', light: 'day', sky: SKY.teal,
    ground: { base: '#93cf72', decals: [{ type: 'dots', n: 300, x0: -8, x1: 8, z0: -8, z1: 4, colors: ['#ffffff', '#ffe46a'] }] },
    build(g, r) { std(g, r, { ring: ['poplar'], ringN: 12, hills: [0x8fd06f, 0x7fc464, 0xa5dc86], hillR: [9, 16], hillH: [1.2, 2.6], hillN: 12 });
      [[-3.8, -4.4, 2.6, 0.9], [3.6, -5.0, 3.0, 1.1], [0.2, -6.6, 3.4, 1.0]].forEach(q => { const h = add(g, G.sph, 0x8fcb6e, [q[0], -q[3] * 0.25, q[1]], [q[2], q[3], q[2] * 0.7]); h.userData.solid = true; });
      field(g, { r, n: 200, x0: -7, x1: 7, z0: -7, z1: -2.3, colors: [0xffffff, 0xf4f4f4], size: 0.045, h: 0.16 });
      field(g, { r, n: 120, x0: -7, x1: 7, z0: -6, z1: -2.3, colors: [0xffe14a], size: 0.03, h: 0.06 });
      tree(g, -4.0, -4.5, 'poplar', 1.2).position.y = 0.6; tree(g, 3.0, -5.4, 'round', 1.2).position.y = 0.75;
      kite(g, -1.8, 3.4, -7, 0xe8584a, 0xf6c445, [-1.2, 0, -4.5]);
    } };

  // ====================== BABY · 小狗 ======================
  scenes['baby-puppy:idle'] = { name: '狗狗公園', light: 'day', sky: SKY.day,
    ground: { base: '#88c46c', decals: [{ type: 'path', pts: [[-9, -2.8], [-3, -2.6], [3, -2.8], [9, -2.5]], w: 0.6, color: '#d8c8a8' }] },
    build(g, r) { std(g, r, { ring: ['round', 'pine'] });
      const sg = new THREE.Group(); sg.position.set(-2.35, 0, -3.6); sg.rotation.y = 0.25; g.add(sg); [-0.75, 0.75].forEach(sx => add(sg, G.box, 0x8a6240, [sx, 0.6, 0], [0.08, 1.2, 0.08])); board(sg, '汪汪公園', '#f6c445', '#5a3a28', [0, 1.1, 0.05], 1.4, 0.45); sg.userData.solid = true;
      hydrant(g, 1.6, -2.5); fence(g, [-1.0, -3.9], [4.8, -3.9], 'ranch', 0x9aa6ad, 0.55); fence(g, [-4.8, -3.9], [-3.0, -3.9], "ranch", 0x9aa6ad, 0.55);
      [[1.6, -2.6], [-1.9, -2.5], [2.8, -3.0]].forEach(q => add(g, G.sph, 0xd8f04a, [q[0], 0.05, q[1]], 0.05));
      const bowl = add(g, G.cyl, 0x4aa3df, [-2.4, 0.05, -2.3], [0.16, 0.1, 0.16]); bowl.userData.solid = true; add(g, G.cyl, 0x9bd8f0, [-2.4, 0.1, -2.3], [0.14, 0.01, 0.14]);
      tree(g, -3.2, -4.6, 'round', 1.4); tree(g, 3.3, -4.8, 'round', 1.5, 'lime'); bench(g, 0.6, -4.5, 0);
    } };
  scenes['baby-puppy:binky'] = { name: '敏捷障礙場', light: 'day', sky: SKY.bright,
    ground: { base: '#83c56a', decals: [{ type: 'rect', x: 0, z: -3.6, w: 8, d: 2.8, color: '#d8c08e', edge: 'rgba(255,255,255,0.8)' }, { type: 'stripes', w: 1.0, color: 'rgba(255,255,255,0.05)' }] },
    build(g, r) { std(g, r, { ring: ['pine', 'round'] });
      hurdle(g, -2.6, -2.9, 0.2, 0.28, 0xe8584a); hurdle(g, -1.2, -3.0, 0, 0.36, 0xf6c445); hurdle(g, 2.6, -2.9, -0.2, 0.28, 0x4aa3df);
      weave(g, 0.6, -4.2, 0, 7); tunnel(g, -2.4, -4.4, 0.2, 0x7cc45a);
      flag(g, -3.9, -2.4, 0xe8584a); flag(g, 3.9, -2.4, 0x4aa3df); flag(g, -3.9, -4.8, 0xf6c445); flag(g, 3.9, -4.8, 0x7cc45a);
      const plat = add(g, G.box, 0x4aa3df, [2.8, 0.18, -4.2], [0.8, 0.36, 0.8]); plat.userData.solid = true; beam(g, [2.4, 0, -4.2], [2.0, 0.36, -4.2], 0.02, 0x4aa3df, G.cyl6);
    } };
  scenes['baby-puppy:pet'] = { name: '長椅角落', light: 'golden', sky: SKY.golden,
    ground: { base: '#87bf68', decals: [{ type: 'grid', x: 0, z: -3.0, w: 4.4, d: 1.6, cell: 0.4, colors: ['#d8cbb5', '#cbbca3', '#e2d6c1'] }] },
    build(g, r) { std(g, r, { ring: ['round', 'round', 'pine'], cloudCol: 0xfff0e0 });
      bench(g, -0.3, -3.1, 0); lamp(g, 1.4, -3.2, false);
      [[-2.0, -2.7, 0xe8584a], [1.9, -2.6, 0xf7a8c0]].forEach(q => { const pg = new THREE.Group(); pg.position.set(q[0], 0, q[1]); g.add(pg); add(pg, G.cyl, 0xc9734a, [0, 0.18, 0], [0.22, 0.36, 0.22]); bush(pg, 0, 0, 0.7, 0x5cae4f, [q[2], 0xffffff]).position.y = 0.3; pg.userData.solid = true; });
      for (let i = 0; i < 12; i++) bush(g, -3.6 + i * 0.65, -4.2, 0.9, 0x4f9a46);
      tree(g, -3.4, -5.4, 'round', 1.6); tree(g, 3.6, -5.2, 'autumn', 1.4);
    } };
  scenes['baby-puppy:sleep'] = { name: '狗屋之夜', light: 'night', sky: SKY.deepNight,
    ground: { base: '#4c7556', specks: ['rgba(160,190,255,0.06)', 'rgba(0,20,0,0.1)'], decals: [{ type: 'stepping', pts: [[-1.0, -2.0], [-1.4, -2.4]], color: '#9fa3a8' }] },
    build(g, r) { std(g, r, { night: true, ring: ['round', 'pine'], ringLeaf: ['night'], hills: [0x2f4b48, 0x3b5a52], tuft: 0x3f6a48, moon: [6, 8.5, -22, 1.6] });
      doghouse(g, -2.0, -2.9, 0.45, 0x3f7fc0, 'SPARKEE'); lamp(g, 2.4, -3.0, true);
      fireflyCloud(g, r, 26, 0xfff2a0, [-4, 4, 0.3, 1.8, -5, -2.4]);
      fence(g, [-4.6, -4.0], [4.6, -4.2], 'picket', 0xc8c6d8, 0.5); tree(g, 3.6, -5.0, 'round', 1.4, 'night');
    } };
  scenes['baby-puppy:sig'] = { name: '圓形廣場', light: 'day', sky: SKY.day,
    ground: { base: '#86c36b', decals: [{ type: 'tiles', x: 0, z: 0, r: 2.5, rings: 5, colors: ['#e9dcc4', '#d8c7a8'], star: '#f6c445' }] },
    build(g, r) { std(g, r, { ring: ['round', 'pine'] });
      for (let i = 0; i < 5; i++) { const a = Math.PI + (i - 2) * 0.42; bench(g, Math.sin(a) * 3.3, Math.cos(a) * 3.3, a); }
      for (let i = 0; i < 18; i++) { const a = Math.PI * 0.5 + i / 17 * Math.PI; bush(g, Math.sin(a) * 4.4, Math.cos(a) * 4.4, 0.9, 0x4f9a46, i % 3 ? null : [0xe8584a, 0xffffff]); }
      lamp(g, -2.4, -2.6); lamp(g, 2.4, -2.6); tree(g, 0, -5.6, 'big', 1.2);
    } };

  // ====================== TEEN · 兔子 ======================
  scenes['teen-rabbit:idle'] = { name: '遊樂場入口拱門', light: 'day', sky: SKY.bright,
    ground: { base: '#87c76c', decals: [{ type: 'path', pts: [[0, 3], [0, -8]], w: 1.8, color: '#e6d6b4', edge: 'rgba(150,120,80,0.35)' }] },
    build(g, r) { std(g, r, { ring: ['round', 'poplar'] });
      arch(g, 0, -3.4, 'Sparkee 遊樂場', [0xe8584a, 0xf6c445, 0x4aa3df], 3.2);
      balloonBunch(g, -2.4, -3.0, [0xe8584a, 0xf6c445, 0x4aa3df, 0xf7a8c0]); balloonBunch(g, 2.5, -3.1, [0x7cc45a, 0x9b7fd1, 0xf6c445]);
      bunting(g, [-1.6, 2.1, -3.4], [-4.2, 1.6, -4.4], [0xe8584a, 0xf6c445, 0x4aa3df, 0x7cc45a]); bunting(g, [1.6, 2.1, -3.4], [4.2, 1.6, -4.4], [0xe8584a, 0xf6c445, 0x4aa3df, 0x7cc45a]);
      cropRows(g, { kind: 'tulip', x0: -4.4, x1: -1.3, z0: -2.6, z1: -1.6, step: 0.22, gap: 0.3, r, colors: [0xe8484a, 0xf6c445, 0xf7a8c0] }); cropRows(g, { kind: 'tulip', x0: 1.3, x1: 4.4, z0: -2.6, z1: -1.6, step: 0.22, gap: 0.3, r, colors: [0xe8484a, 0xf6c445, 0xf7a8c0] });
      slide(g, -3.6, -6.0, 0.4); swings(g, 3.8, -6.2, -0.3);
    } };
  scenes['teen-rabbit:rope'] = { name: '跳格子操場', light: 'day', sky: SKY.day,
    ground: { base: '#86c46b', decals: [{ type: 'court', x: 0, z: -2.2, w: 9, d: 6.5, color: '#7fb3c9', line: '#f4f8fb' }, { type: 'hopscotch', x: -2.6, z: -2.2, s: 0.42, colors: ['#f6c445', '#e8584a', '#7cc45a', '#9b7fd1'], rot: 0 }, { type: 'hopscotch', x: 2.8, z: -2.0, s: 0.42, colors: ['#f7a8c0', '#4aa3df', '#f6c445', '#7cc45a'], rot: 0.15 }] },
    build(g, r) { std(g, r, { ring: ['round', 'poplar'] });
      const hoop = new THREE.Group(); hoop.position.set(0.6, 0, -5.4); g.add(hoop); add(hoop, G.cyl, 0x5b6d78, [0, 1.3, 0], [0.06, 2.6, 0.06]); add(hoop, G.box, 0xffffff, [0, 2.6, 0.25], [1.0, 0.65, 0.05]); add(hoop, G.box, 0xe8584a, [0, 2.48, 0.28], [0.36, 0.26, 0.01]); add(hoop, new THREE.TorusGeometry(0.2, 0.02, 6, 20), 0xe8584a, [0, 2.4, 0.5], 1, [Math.PI / 2, 0, 0]); hoop.userData.solid = true;
      for (let i = 0; i < 12; i++) bush(g, -5 + i * 0.9, -5.9, 0.8, 0x4f9a46);
      [[-1.2, -4.6, 0xe8584a], [3.6, -4.2, 0x4aa3df]].forEach(q => add(g, G.sph, q[2], [q[0], 0.11, q[1]], 0.11).userData.solid = true);
      tree(g, -4.8, -3.8, 'round', 1.5); tree(g, 5.0, -3.2, 'round', 1.4, 'lime');
    } };
  scenes['teen-rabbit:jacks'] = { name: '健身器材區', light: 'morning', sky: SKY.morning,
    ground: { base: '#8ac86e', decals: [{ type: 'rect', x: 0, z: -3.6, w: 8.5, d: 3, color: '#5fa86a', edge: '#e8e2cf' }, { type: 'dots', n: 900, x0: -4.2, x1: 4.2, z0: -5, z1: -2.2, colors: ['#4f975a', '#6cb877'], size: 0.02 }] },
    build(g, r) { std(g, r, { ring: ['round', 'pine'] });
      fitness(g, -2.4, -4.0, 0.15, 'bars'); fitness(g, 2.6, -3.0, -0.4, 'stepper'); fitness(g, 1.2, -4.4, 0, 'wheel'); fitness(g, -0.6, -3.0, 0, 'beam');
      signpost(g, 3.9, -4.4, -0.3, [['健身區', '#2f7fbf'], ['伸展 10 分', '#5aa94b']]);
      tree(g, -4.6, -5.4, 'round', 1.5); tree(g, 4.8, -6.0, 'pine', 1.4); bench(g, -4.2, -2.4, 0.9);
    } };
  scenes['teen-rabbit:cheer'] = { name: '跑道終點線', light: 'day', sky: SKY.bright,
    ground: { base: '#85c56a', decals: [{ type: 'track', cx: 0, cz: 0, len: 20, rot: Math.PI / 2, lanes: 4, lane: 0.6, finish: -2.45, nums: 3.2 }] },
    build(g, r) { std(g, r, { ring: ['poplar', 'round'] });
      const fb = new THREE.Group(); fb.position.set(0, 0, -2.45); g.add(fb); [-1.32, 1.32].forEach(sx => { add(fb, G.cyl, 0xffffff, [sx, 0.6, 0], [0.04, 1.2, 0.04]); add(fb, G.sph, 0xe8584a, [sx, 1.22, 0], 0.06); }); beam(fb, [-1.3, 1.0, 0], [1.3, 1.0, 0], 0.012, 0xe8584a, G.box); fb.userData.solid = true;
      const fs = new THREE.Group(); fs.position.set(-2.4, 0, -2.7); fs.rotation.y = 0.25; g.add(fs); [-0.55, 0.55].forEach(sx => add(fs, G.box, 0x8a949c, [sx, 0.7, 0], [0.06, 1.4, 0.06])); board(fs, '終點 FINISH', '#e8584a', '#ffffff', [0, 1.25, 0.04], 1.3, 0.42); fs.userData.solid = true;
      bleachers(g, -3.6, -4.2, Math.PI / 2, 3.0); bleachers(g, 3.6, -4.2, -Math.PI / 2, 3.0, [0xf6c445, 0x7cc45a, 0x4aa3df]);
      flag(g, -2.6, -2.2, 0xe8584a, 1.2); flag(g, 2.6, -2.2, 0x4aa3df, 1.2);
      bunting(g, [-5, 2.0, -5.2], [5, 2.0, -5.2], [0xe8584a, 0xffffff, 0x4aa3df, 0xf6c445], 0.5);
    } };
  scenes['teen-rabbit:sleep'] = { name: '櫻花樹下・黃昏', light: 'dusk', sky: SKY.dusk,
    ground: { base: '#86ad66', decals: [{ type: 'dots', n: 700, x0: -8, x1: 8, z0: -8, z1: 3, colors: ['#f9c3d5', '#fbd8e3', '#f39dbb'], size: 0.03 }] },
    build(g, r) { std(g, r, { ring: ['cherry', 'round'], ringLeaf: ['cherry', 'dusk'], hills: [0x9b7fa8, 0xa98aaa], cloudCol: 0xffd2dc, tuft: 0x5f8f42 });
      tree(g, -2.4, -3.0, 'cherry', 1.6); tree(g, 2.6, -3.6, 'cherry', 1.8); tree(g, 0.2, -5.2, 'cherry', 1.5);
      petalFall(g, r, 60, 0xf9c3d5, [-4.5, 4.5, 0, 3.4, -5, -1.6]);
      [[-1.2, -2.5], [1.3, -2.6]].forEach(q => { const lg = new THREE.Group(); lg.position.set(q[0], 0, q[1]); g.add(lg); add(lg, G.box, 0x9a9488, [0, 0.25, 0], [0.12, 0.5, 0.12]); add(lg, G.box, 0xb0aa9c, [0, 0.55, 0], [0.26, 0.04, 0.26]); add(lg, G.box, 0xffd27a, [0, 0.66, 0], [0.16, 0.18, 0.16], null, { glow: true }); add(lg, G.cone6, 0x9a9488, [0, 0.84, 0], [0.22, 0.18, 0.22]); lg.userData.solid = true; });
    } };

  // ====================== TEEN · 乳牛 ======================
  scenes['teen-cow:idle'] = { name: '花鐘廣場', light: 'day', sky: SKY.day,
    ground: { base: '#88c66d', decals: [{ type: 'tiles', x: 0, z: -3.9, r: 2.2, rings: 3, colors: ['#e2d3b8', '#d1bf9f'] }, { type: 'clock', x: 0, z: -3.9, r: 1.5, colors: ['#e84a6a', '#f6c445', '#ffffff', '#9b7fd1', '#ff8a3d', '#f7a8c0'] }] },
    build(g, r) { std(g, r, { ring: ['round', 'poplar'] });
      const hands = new THREE.Group(); hands.position.set(0, 0.06, -3.9); g.add(hands); add(hands, G.cyl, 0x333333, [0, 0.02, 0], [0.08, 0.06, 0.08]);
      const hh = new THREE.Group(); hands.add(hh); add(hh, G.box, 0x333333, [0, 0.02, -0.4], [0.07, 0.03, 0.8]); const mh = new THREE.Group(); hands.add(mh); add(mh, G.box, 0x333333, [0, 0.04, -0.6], [0.05, 0.03, 1.2]);
      blades.push({ o: mh, sp: -0.3, axis: 'y' }); blades.push({ o: hh, sp: -0.025, axis: 'y' });
      bench(g, -3.2, -3.4, 0.6); bench(g, 3.2, -3.4, -0.6); lamp(g, -2.4, -5.6); lamp(g, 2.4, -5.6);
      cropRows(g, { kind: 'tulip', x0: -5.4, x1: -3.6, z0: -2.4, z1: -1, step: 0.22, gap: 0.28, r, colors: [0xe84a6a, 0xffffff] }); cropRows(g, { kind: 'tulip', x0: 3.6, x1: 5.4, z0: -2.4, z1: -1, step: 0.22, gap: 0.28, r, colors: [0xf6c445, 0x9b7fd1] });
      tree(g, -4.2, -6.2, 'round', 1.4); tree(g, 4.2, -6.4, 'round', 1.5, 'lime');
    } };
  scenes['teen-cow:milk'] = { name: '野餐區', light: 'golden', sky: SKY.warm,
    ground: { base: '#8dc76c', decals: [{ type: 'dots', n: 260, x0: -8, x1: 8, z0: -8, z1: 2, colors: ['#ffffff', '#ffe46a', '#f9c3d5'] }] },
    build(g, r) { std(g, r, { ring: ['round', 'big'] });
      picnicTable(g, -3.0, -3.2, 0.25); blanket(g, 2.2, -3.0, 1.6, 1.2, 0.2, '#e8584a', '#ffffff'); basket(g, 2.0, -3.1);
      add(g, G.cyl, 0xffffff, [2.6, 0.08, -2.8], [0.05, 0.16, 0.05]).userData.solid = true; add(g, G.sph, 0xf6c445, [2.4, 0.04, -3.4], [0.09, 0.04, 0.09]);
      umbrella(g, 3.9, -4.4, 0x4aa3df, 0xffffff, false); tree(g, -1.0, -5.4, 'big', 1.3);
      blanket(g, -1.0, -3.0, 1.0, 0.8, -0.3, '#4aa3df', '#ffffff');
    } };
  scenes['teen-cow:kick'] = { name: '足球場', light: 'day', sky: SKY.bright,
    ground: { base: '#6fbf5e', decals: [{ type: 'stripes', w: 1.1, color: 'rgba(255,255,255,0.08)' }, { type: 'court', x: 0, z: -1.5, w: 13, d: 8, color: 'rgba(0,0,0,0)', line: '#ffffff', mid: true }] },
    build(g, r) { std(g, r, { ring: ['poplar', 'round'], ringN: 18 });
      goal(g, 0, -5.4, 0, 2.6, 1.25); flag(g, -6.2, -5.2, 0xe8584a, 0.9); flag(g, 6.2, -5.2, 0xe8584a, 0.9);
      bleachers(g, -4.4, -7.0, 0.15, 3.2, [0x4aa3df, 0xffffff, 0x4aa3df]); bleachers(g, 4.4, -7.0, -0.15, 3.2, [0xe8584a, 0xffffff, 0xe8584a]);
      [[-2.6, -3.0], [-2.2, -3.4], [2.4, -3.1]].forEach(q => { const c = add(g, G.cone, 0xff8a2a, [q[0], 0.12, q[1]], [0.08, 0.24, 0.08]); c.userData.solid = true; });
      const sb = new THREE.Group(); sb.position.set(3.4, 0, -4.6); g.add(sb); add(sb, G.box, 0x333333, [-0.5, 0.6, 0], [0.06, 1.2, 0.06]); add(sb, G.box, 0x333333, [0.5, 0.6, 0], [0.06, 1.2, 0.06]); board(sb, '乳牛隊 1 : 0', '#223344', '#ffd84a', [0, 1.35, 0.04], 1.3, 0.45); sb.userData.solid = true;
    } };
  scenes['teen-cow:charge'] = { name: '積木遊戲區', light: 'day', sky: SKY.day,
    ground: { base: '#89c66c', decals: [{ type: 'grid', x: 0, z: -3.6, w: 8.8, d: 2.8, cell: 0.7, colors: ['#ff9f8f', '#ffd36a', '#8fc4f0', '#a6dfb5', '#cdb5f5'], shift: 2 }] },
    build(g, r) { std(g, r, { ring: ['round', 'poplar'] });
      const C = [0xff7a6b, 0xf5c24a, 0x5fa8e8, 0x6cc48b, 0xb48ef0, 0xff9fc4];
      [[-3.4, -3.2, 'arch', 0], [-2.2, -4.2, 'cube', 1], [-2.2, -4.2, 'cube', 2, 0.5], [-1.0, -3.4, 'cyl', 3], [1.3, -4.4, 'tri', 4], [2.4, -3.3, 'cube', 5], [2.5, -3.3, 'tri', 0, 0.5], [3.6, -4.0, 'cyl', 1], [0.1, -4.6, 'arch', 2]].forEach((q, i) => { const b = blockToy(g, q[0], q[1], r() - 0.5, q[2], C[q[3]], 1.2); if (q[4]) b.position.y = q[4] * 1.2; });
      const tw = new THREE.Group(); tw.position.set(-4.4, 0, -5.4); g.add(tw); for (let i = 0; i < 4; i++) add(tw, G.box, C[i], [0, 0.25 + i * 0.5, 0], [0.5, 0.5, 0.5], [0, i * 0.3, 0]); tw.userData.solid = true;
      tree(g, 4.8, -5.6, 'round', 1.5); tree(g, -5.6, -3.2, 'round', 1.3, 'lime');
    } };
  scenes['teen-cow:sleep'] = { name: '湖畔涼亭・夜', light: 'night', sky: SKY.night,
    ground: { base: '#4c7556', specks: ['rgba(160,190,255,0.06)', 'rgba(0,20,0,0.1)'], decals: [{ type: 'water', x: 2.6, z: -5.2, rx: 3.2, rz: 1.6, deep: '#1f3f6a', shallow: '#3c6a8f', bank: '#3d4a3a' }, { type: 'path', pts: [[-2.4, -3.4], [-1.2, -1.8], [1.0, 0.4]], w: 0.6, color: '#8f8a80' }] },
    build(g, r) { std(g, r, { night: true, ring: ['round', 'pine'], ringLeaf: ['night'], hills: [0x2f4b48, 0x3b5a52], tuft: 0x3f6a48, moon: [4, 9, -24, 1.4] });
      gazebo(g, -2.6, -3.8, 1.05, 0x9a3f3a, [0xffb04a, 0xff7a4a]);
      stringLights(g, [[-1.6, 1.9, -3.2], [1.0, 2.0, -3.0], [3.4, 1.8, -3.3]], [0xffd27a, 0xff9f6a, 0xfff0b0]); pole(g, 1.0, -3.0, 2.0); pole(g, 3.4, -3.3, 1.8);
      fireflyCloud(g, r, 30, 0xfff2a0, [-1, 6, 0.3, 1.6, -6.5, -3.2]); reeds(g, 0.2, -4.4, 7); reeds(g, 5.2, -4.2, 6);
      for (let i = 0; i < 4; i++) lily(g, 1.4 + i * 0.9, -5.6 + (i % 2) * 0.5, 0.18, i % 2 ? 0xf7a8c0 : null);
    } };

  // ====================== TEEN · 小狗 ======================
  scenes['teen-puppy:idle'] = { name: '溜滑梯遊樂場', light: 'day', sky: SKY.bright,
    ground: { base: '#87c66b', decals: [{ type: 'rect', x: 0, z: -3.8, w: 9, d: 3.2, color: '#e88e6a', edge: '#f4e6d0' }, { type: 'dots', n: 800, x0: -4.4, x1: 4.4, z0: -5.3, z1: -2.3, colors: ['#d97a58', '#f2a685'], size: 0.02 }] },
    build(g, r) { std(g, r, { ring: ['round', 'poplar'] });
      slide(g, -2.6, -3.9, 0.55, 0xff8a3d, 0x4aa3df); swings(g, 2.8, -4.0, -0.25, [0xf6c445, 0x7cc45a]); springRider(g, 0.4, -4.4, 0, 0xf7a8c0, 'bunny');
      tree(g, -4.8, -5.2, 'round', 1.5); tree(g, 5.0, -5.6, 'round', 1.4, 'lime'); bench(g, -4.6, -2.2, 1.2);
    } };
  scenes['teen-puppy:catch'] = { name: '大草坪放風箏', light: 'day', sky: SKY.teal,
    ground: { base: '#80c964', decals: [{ type: 'stripes', w: 1.4, color: 'rgba(255,255,255,0.07)' }, { type: 'dots', n: 180, x0: -8, x1: 8, z0: -8, z1: 4, colors: ['#ffffff', '#ffe46a'] }] },
    build(g, r) { std(g, r, { ring: ['round', 'poplar'], ringN: 18, cloudN: 7 });
      kite(g, -2.6, 2.9, -7, 0xe8584a, 0xf6c445, [-2.2, 0, -5.4]); kite(g, 1.4, 3.4, -9, 0x4aa3df, 0xffffff, [1.8, 0, -6.8]); kite(g, 3.6, 2.6, -6.5, 0x9b7fd1, 0xf7a8c0, [3.4, 0, -4.8]);
      blanket(g, -4.0, -3.0, 1.3, 1.0, 0.3, '#f6c445', '#ffffff'); basket(g, -3.8, -3.1);
      tree(g, -5.4, -5.2, 'round', 1.5); tree(g, 5.6, -3.0, 'round', 1.3);
    } };
  scenes['teen-puppy:dance'] = { name: '露天舞台', light: 'golden', sky: SKY.golden,
    ground: { base: '#86c06a', decals: [{ type: 'rect', x: 0, z: -1.0, w: 4.6, d: 3.6, color: '#c49a6c', edge: '#8a6a48' }, { type: 'grid', x: 0, z: -1.0, w: 4.4, d: 3.4, cell: 0.55, colors: ['#c9a074', '#bb9064'] }] },
    build(g, r) { std(g, r, { ring: ['round', 'pine'], cloudCol: 0xfff0e0 });
      stage(g, 0, -4.4, 3.8, 0x7a3fb0, 0x8a5a3a);
      [[-2.7, -3.4], [2.7, -3.4]].forEach(q => { const sp = new THREE.Group(); sp.position.set(q[0], 0, q[1]); g.add(sp); add(sp, G.box, 0x222222, [0, 0.45, 0], [0.5, 0.9, 0.42]); add(sp, G.cyl, 0x555555, [0, 0.62, 0.215], [0.15, 0.02, 0.15], [Math.PI / 2, 0, 0]); add(sp, G.cyl, 0x555555, [0, 0.25, 0.215], [0.09, 0.02, 0.09], [Math.PI / 2, 0, 0]); sp.userData.solid = true; });
      bunting(g, [-2.0, 3.0, -4.9], [2.0, 3.0, -4.9], [0xe8584a, 0xf6c445, 0x4aa3df, 0x7cc45a, 0xf7a8c0], 0.3);
      stringLights(g, [[-3.6, 2.4, -2.6], [-1.9, 3.0, -4.4]], [0xffd27a, 0xff7ab0, 0x8fd0ff]); stringLights(g, [[3.6, 2.4, -2.6], [1.9, 3.0, -4.4]], [0xffd27a, 0xff7ab0, 0x8fd0ff]); pole(g, -3.6, -2.6, 2.4); pole(g, 3.6, -2.6, 2.4);
      musicNotes(g, r, 7, [-2.4, 2.4, 2.0, 3.0, -4.0, -3.2]);
    } };
  scenes['teen-puppy:dig'] = { name: '沙坑', light: 'day', sky: SKY.warm,
    ground: { base: '#8bc66e', decals: [{ type: 'ellipse', x: 0, z: -0.3, rx: 3.1, rz: 2.5, color: '#f0d9a4', edge: '#c9894a' }, { type: 'dots', n: 900, x0: -2.9, x1: 2.9, z0: -2.6, z1: 2.0, colors: ['#e6cc92', '#f7e6bc'], size: 0.02 }] },
    build(g, r) { std(g, r, { ring: ['round', 'poplar'] });
      const ca = new THREE.Group(); ca.position.set(-1.9, 0, -2.0); g.add(ca); add(ca, G.cyl, 0xe6c88a, [0, 0.15, 0], [0.32, 0.3, 0.32]); [[0.22, 0], [-0.22, 0], [0, 0.22], [0, -0.22]].forEach(q => { add(ca, G.cyl, 0xe6c88a, [q[0], 0.4, q[1]], [0.09, 0.22, 0.09]); add(ca, G.cone, 0xe6c88a, [q[0], 0.58, q[1]], [0.1, 0.14, 0.1]); }); add(ca, G.cyl6, 0xffffff, [0, 0.5, 0], [0.01, 0.4, 0.01]); add(ca, G.box, 0xe8584a, [0.07, 0.65, 0], [0.13, 0.08, 0.005]); ca.userData.solid = true;
      add(g, G.cyl, 0xe8584a, [1.9, 0.12, -1.9], [0.12, 0.24, 0.1]).userData.solid = true; add(g, G.cyl, 0x4aa3df, [2.3, 0.08, -2.2], [0.09, 0.16, 0.09]).userData.solid = true; add(g, G.box, 0xf6c445, [2.1, 0.02, -1.6], [0.12, 0.03, 0.2], [0, 0.6, 0]);
      umbrella(g, 3.6, -2.4, 0xf6c445, 0xe8584a, false); for (let i = 0; i < 14; i++) { const a = Math.PI * 0.62 + i / 13 * Math.PI * 0.76; rock(g, Math.sin(a) * 3.35, Math.cos(a) * 2.75 - 0.3, 0.13, 0xc9894a); }
      tree(g, -4.4, -4.6, 'round', 1.5); tree(g, 4.4, -5.0, 'poplar', 1.4);
    } };
  scenes['teen-puppy:sleep'] = { name: '竹林小徑・夜', light: 'night', sky: SKY.deepNight,
    ground: { base: '#4a7052', specks: ['rgba(160,190,255,0.05)', 'rgba(0,20,0,0.1)'], decals: [{ type: 'stepping', pts: [[-3.5, -2.0], [-2.9, -2.4], [-2.2, -2.7], [-1.5, -3.0], [-0.7, -3.2], [0.1, -3.3], [0.9, -3.2], [1.7, -3.0], [2.4, -2.7], [3.1, -2.3]], color: '#8f939a' }] },
    build(g, r) { std(g, r, { night: true, ring: ['pine'], ringLeaf: ['night'], hills: [0x2f4b48, 0x283f3e], tuft: 0x3f6a48, moon: [-4, 9.5, -24, 1.5] });
      bamboo(g, -3.6, -3.6, 11, 1); bamboo(g, -1.6, -4.6, 9, 0.95); bamboo(g, 1.0, -4.8, 10, 1.05); bamboo(g, 3.4, -3.8, 11, 1); bamboo(g, 5.2, -2.4, 8, 0.9); bamboo(g, -5.4, -1.8, 8, 0.9);
      const lg = new THREE.Group(); lg.position.set(2.2, 0, -2.0); g.add(lg); add(lg, G.box, 0x8a857a, [0, 0.3, 0], [0.14, 0.6, 0.14]); add(lg, G.box, 0x9a9488, [0, 0.64, 0], [0.32, 0.06, 0.32]); add(lg, G.box, 0xffd27a, [0, 0.78, 0], [0.2, 0.22, 0.2], null, { glow: true }); add(lg, G.cone6, 0x8a857a, [0, 1.0, 0], [0.28, 0.22, 0.28]); lg.userData.solid = true;
      fireflyCloud(g, r, 34, 0xd8ff9a, [-5, 5, 0.3, 2.4, -5.5, -2.2]);
    } };

  // ====================== ADULT · 乳牛 ======================
  scenes['adult-cow:idle'] = { name: '湖畔木棧道', light: 'morning', sky: SKY.teal,
    ground: { base: '#89c46c', decals: [{ type: 'water', x: 0.8, z: -4.9, rx: 5.2, rz: 2.3, deep: '#3f8fbf', shallow: '#86c9e2', bank: '#a58e66' }] },
    build(g, r) { std(g, r, { ring: ['round', 'poplar'], hills: [0x7fae9a, 0x8fbfa8, 0x6f9e8a] });
      const pier = new THREE.Group(); pier.position.set(-2.6, 0, -2.3); pier.rotation.y = Math.PI / 2; g.add(pier); boardwalk(pier, 0, 4.2, 0, 1.0, 0.1); pier.userData.solid = true;
      lamp(g, -3.5, -2.2, false, 0x4a5a52).scale.setScalar(0.85);
      duck(g, 0, -4.6, 0xffffff, 1.2, { cx: 0.8, cz: -4.7, R: 1.2, sp: 0.25 }); duck(g, 0, -4.6, 0xf6d55a, 0.6, { cx: 0.8, cz: -4.7, R: 1.2, sp: 0.25, lag: 0.4 }); duck(g, 1.6, -5.4, 0x8a6a48, 1.1, { cx: 2.6, cz: -5.6, R: 0.7, sp: -0.3 }); boat(g, 4.0, -5.4, 0.6);
      reeds(g, 5.4, -3.4, 8); reeds(g, -0.9, -2.9, 6); for (let i = 0; i < 6; i++) lily(g, -1.0 + i * 1.0, -6.0 + (i % 2) * 0.5, 0.2, i % 3 ? null : 0xffffff);
      tree(g, -5.4, -3.0, 'round', 1.6); tree(g, 5.8, -6.8, 'poplar', 1.6); bench(g, 3.6, -2.2, -0.2);
    } };
  scenes['adult-cow:uke'] = { name: '音樂草坪', light: 'golden', sky: SKY.golden,
    ground: { base: '#89c26a', decals: [{ type: 'dots', n: 300, x0: -8, x1: 8, z0: -8, z1: 3, colors: ['#ffffff', '#ffe46a', '#f9c3d5'] }] },
    build(g, r) { std(g, r, { ring: ['round', 'pine'], cloudCol: 0xfff0e0 });
      pole(g, -3.4, -3.4, 2.6); pole(g, 0.6, -4.4, 2.8); pole(g, 3.8, -3.0, 2.6);
      stringLights(g, [[-3.4, 2.6, -3.4], [0.6, 2.8, -4.4], [3.8, 2.6, -3.0]], [0xffd27a, 0xff9f6a, 0x8fd0ff, 0xff7ab0], 0.35);
      musicNotes(g, r, 6, [-1.0, 3.6, 2.0, 3.2, -4.6, -3.2]);
      blanket(g, 3.4, -1.0, 1.2, 0.9, -0.4, '#9b7fd1', '#ffffff'); blanket(g, -3.8, -0.6, 1.1, 0.9, 0.3, '#7cc45a', '#ffffff');
      bunting(g, [-3.4, 2.4, -3.4], [-5.6, 2.0, -1.6], [0xe8584a, 0xf6c445, 0x4aa3df]);
    } };
  scenes['adult-cow:cart'] = { name: '冰淇淋廣場', light: 'day', sky: SKY.bright,
    ground: { base: '#88c56c', decals: [{ type: 'grid', x: 0, z: 0, w: 9, d: 7, cell: 0.6, colors: ['#f4e3d0', '#f9d6de', '#e8dccb'], shift: 1 }] },
    build(g, r) { std(g, r, { ring: ['round', 'poplar'] });
      kiosk(g, 2.4, -3.6, -0.2); umbrella(g, -4.6, -4.4, 0xf27aa6, 0xffffff, true); umbrella(g, 4.8, -0.6, 0x7cc45a, 0xffffff, true);
      balloonBunch(g, 0.6, -4.2, [0xf27aa6, 0xffffff, 0xf6c445, 0x8fd0ff]);
      for (let i = 0; i < 7; i++) bush(g, -4.5 + i * 1.5, -5.4, 0.9, 0x4f9a46, i % 2 ? [0xf7a8c0] : [0xffffff]);
      lamp(g, -2.8, -4.6); tree(g, -5.8, -2.4, 'round', 1.4); tree(g, 5.6, -4.4, 'round', 1.5, 'lime');
    } };
  scenes['adult-cow:paint'] = { name: '油菜花田河畔', light: 'morning', sky: SKY.day,
    ground: { base: '#93c76a', decals: [{ type: 'river', pts: [[-11, -3.2], [-5, -3.8], [0, -3.4], [5, -4.2], [11, -3.6]], w: 1.3, color: '#7cc3e6', bank: '#b4a272' }] },
    build(g, r) { std(g, r, { ring: ['round', 'poplar'], hills: [0x9cc86a, 0xb3d06c, 0x8cbc5e] });
      const river = (x) => x < -5 ? -3.2 - (x + 11) / 6 * 0.6 : x < 0 ? -3.8 + (x + 5) / 5 * 0.4 : x < 5 ? -3.4 - x / 5 * 0.8 : -4.2 + (x - 5) / 6 * 0.6;
      cropRows(g, { kind: 'rapeseed', x0: -7, x1: 7, z0: -8, z1: -2.4, step: 0.38, gap: 0.42, r, skip: (x, z) => Math.abs(z - river(x)) < 1.0 || (Math.abs(x - 2.6) < 1.3 && z > -4.4) });
      bridge(g, 2.6, -3.6, Math.PI / 2 + 0.15, 2.0); tree(g, -3.6, -2.6, 'big', 1.4);
      field(g, { r, n: 160, x0: -7, x1: 7, z0: -2.4, z1: 2.5, colors: [0xf8dc2c, 0xffffff], size: 0.03, keep: 2.6 });
      birdFlock(g, r, 2);
    } };
  scenes['adult-cow:sleep'] = { name: '雛菊草原・黃昏', light: 'dusk', sky: SKY.sunset,
    ground: { base: '#86b363', specks: ['rgba(255,200,120,0.08)', 'rgba(0,40,0,0.08)'], decals: [] },
    build(g, r) { std(g, r, { ring: ['round', 'poplar'], ringLeaf: ['dusk'], hills: [0x9b7fa8, 0x8a6f9a], sun: [-6, 2.0, -26, 2.6, 0xffa850], cloudCol: 0xffc8b0, tuft: 0x5f8f42 });
      cropRows(g, { kind: 'daisy', x0: -7, x1: 7, z0: -7, z1: 3, step: 0.28, gap: 0.3, r, keep: 2.9, colors: [0xffffff, 0xffffff, 0xffe0ec] });
      tree(g, 3.6, -4.2, 'big', 1.3, 'dusk'); birdFlock(g, r, 4); fireflyCloud(g, r, 16, 0xffe88a, [-4, 4, 0.4, 1.8, -5, -2.6]);
    } };

  // ====================== ADULT · 小狗 ======================
  scenes['adult-puppy:idle'] = { name: '鴨子池塘', light: 'day', sky: SKY.day,
    ground: { base: '#86c46b', decals: [{ type: 'water', x: 0.6, z: -4.2, rx: 3.2, rz: 1.8, deep: '#4c9fc8', shallow: '#93d2e6', bank: '#9c8a62' }] },
    build(g, r) { std(g, r, { ring: ['round', 'pine'] });
      duck(g, 0, -4.4, 0xffffff, 1.1, { cx: 0.4, cz: -4.4, R: 1.4, sp: 0.22 }); duck(g, 0, -4.4, 0xf6d55a, 0.6, { cx: 0.4, cz: -4.4, R: 1.4, sp: 0.22, lag: 0.35 }); duck(g, 0, -4.4, 0xf6d55a, 0.6, { cx: 0.4, cz: -4.4, R: 1.4, sp: 0.22, lag: 0.6 });
      duck(g, 0, -4.4, 0x6a7a48, 1.0, { cx: 1.4, cz: -4.6, R: 0.7, sp: -0.35 });
      for (let i = 0; i < 6; i++) lily(g, -1.8 + i * 0.8, -5.2 + (i % 2) * 0.3, 0.16, i % 2 ? 0xf7a8c0 : null);
      reeds(g, -2.7, -3.6, 7); reeds(g, 3.4, -4.0, 6); rock(g, -2.2, -3.2, 0.18); rock(g, 2.9, -3.3, 0.15);
      bench(g, -4.0, -2.6, 0.7); tree(g, -4.4, -5.0, 'round', 1.6); tree(g, 4.6, -5.2, 'round', 1.5, 'lime');
    } };
  scenes['adult-puppy:ball'] = { name: '表演廣場', light: 'day', sky: SKY.bright,
    ground: { base: '#87c56b', decals: [{ type: 'tiles', x: 0, z: 0, r: 3.0, rings: 4, colors: ['#f2e2c6', '#e6cfa8'], star: '#f6c445' }] },
    build(g, r) { std(g, r, { ring: ['round', 'poplar'] });
      bleachers(g, -3.4, -4.4, 0.45, 2.6, [0xe8584a, 0xf6c445, 0x4aa3df]); bleachers(g, 3.4, -4.4, -0.45, 2.6, [0x4aa3df, 0xf6c445, 0xe8584a]);
      const bn = new THREE.Group(); bn.position.set(0, 0, -4.8); g.add(bn); [-1.3, 1.3].forEach(sx => add(bn, G.cyl, 0xf3ead8, [sx, 1.7, 0], [0.06, 3.4, 0.06])); board(bn, '表演時間！', '#9b7fd1', '#ffffff', [0, 3.15, 0], 2.6, 0.62); bn.userData.solid = true;
      bunting(g, [-4.8, 2.3, -2.6], [-1.3, 3.3, -4.8], [0xe8584a, 0xf6c445, 0x4aa3df]); bunting(g, [4.8, 2.3, -2.6], [1.3, 3.3, -4.8], [0x7cc45a, 0xf7a8c0, 0xf6c445]);
      pole(g, -4.8, -2.6, 2.3); pole(g, 4.8, -2.6, 2.3); balloonBunch(g, -4.6, -1.2, [0xe8584a, 0xf6c445, 0x4aa3df]);
    } };
  scenes['adult-puppy:bubble'] = { name: '噴水池廣場', light: 'day', sky: SKY.teal,
    ground: { base: '#88c66d', decals: [{ type: 'grid', x: 0, z: -2.2, w: 10, d: 6.6, cell: 0.5, colors: ['#e9e1d2', '#ddd2bf', '#f1ebdf'], shift: 1 }, { type: 'tiles', x: -1.9, z: -4.5, r: 1.8, rings: 2, colors: ['#cfc3ad', '#bdb099'] }] },
    build(g, r) { std(g, r, { ring: ['round', 'pine'] });
      fountain(g, -1.9, -4.5, 1.1);
      bench(g, -3.4, -3.6, 0.5); bench(g, 3.4, -3.6, -0.5); lamp(g, -2.2, -5.4); lamp(g, 2.2, -5.4);
      [[1.7, -2.8], [2.1, -3.1], [-3.2, -2.6]].forEach((q, i) => { const pg = duck(g, q[0], q[1], 0x9aa0aa, 0.55); pg.rotation.y = i * 2; hoppers.push({ o: pg, ph: i * 1.7, h: 0.03, peck: true }); });
      for (let i = 0; i < 8; i++) bush(g, -5.2 + i * 1.5, -6.6, 1.0, 0x4f9a46, [0xf7a8c0, 0xffffff]);
      tree(g, -5.4, -4.2, 'round', 1.5); tree(g, 5.4, -4.6, 'round', 1.5, 'lime');
    } };
  scenes['adult-puppy:sleep'] = { name: '星空露營', light: 'night', sky: SKY.deepNight,
    ground: { base: '#486f52', specks: ['rgba(160,190,255,0.05)', 'rgba(0,20,0,0.1)'], decals: [{ type: 'shadowSpot', x: 2.4, z: -2.8, r: 1.6 }] },
    build(g, r) { std(g, r, { night: true, starN: 420, ring: ['pine'], ringLeaf: ['night'], hills: [0x283f3e, 0x2f4b48], tuft: 0x3f6a48, moon: [-6, 8, -24, 1.2] });
      tent(g, -2.8, -3.0, 0.5, 0xf28c3a, 0xf6c445); campfire(g, 2.4, -2.8); telescope(g, 3.8, -4.4, -0.6);
      [[1.6, -3.4], [3.2, -2.2]].forEach(q => { const lg = add(g, G.cyl, 0x8a5a36, [q[0], 0.15, q[1]], [0.16, 0.3, 0.16]); lg.userData.solid = true; });
      lantern(g, -1.8, 0.0, -2.6, 0xffc06a).position.y = 0.15; fireflyCloud(g, r, 24, 0xfff2a0, [-5, 5, 0.4, 2.2, -6, -2.6]);
      tree(g, -4.6, -5.0, 'pine', 1.6, 'night'); tree(g, 0.4, -6.2, 'pine', 1.8, 'night');
    } };

  // ====================== ADULT · 兔子 ======================
  scenes['adult-rabbit:idle'] = { name: '閱讀花園', light: 'morning', sky: SKY.morning,
    ground: { base: '#89c66e', decals: [{ type: 'path', pts: [[-0.8, -2.4], [-0.6, -4.8]], w: 1.0, color: '#e2d3b8' }, { type: 'dots', n: 220, x0: -8, x1: 8, z0: -8, z1: 2, colors: ['#ffffff', '#f9c3d5'] }] },
    build(g, r) { std(g, r, { ring: ['round', 'round', 'pine'] });
      roseArch(g, -0.7, -3.6, 0); library(g, 2.4, -2.9, -0.4, 0x4aa3df);
      const bk = bench(g, -3.0, -2.8, 0.55, 0xa86a3a); add(bk, G.box, 0xe8584a, [0.2, 0.47, 0], [0.18, 0.05, 0.13]); add(bk, G.box, 0x4aa3df, [0.22, 0.52, 0.01], [0.16, 0.04, 0.12], [0, 0.3, 0]);
      cropRows(g, { kind: 'tulip', x0: -4.6, x1: -1.6, z0: -5.0, z1: -4.1, step: 0.2, gap: 0.25, r, colors: [0xe84a6a, 0xf7a8c0, 0xffffff] }); cropRows(g, { kind: 'tulip', x0: 0.4, x1: 4.6, z0: -5.0, z1: -4.1, step: 0.2, gap: 0.25, r, colors: [0xf6c445, 0x9b7fd1, 0xffffff] });
      tree(g, -4.8, -5.6, 'round', 1.5); tree(g, 4.6, -5.8, 'round', 1.4, 'mint');
    } };
  scenes['adult-rabbit:magic'] = { name: '露天小劇場', light: 'golden', sky: SKY.golden,
    ground: { base: '#87bf6a', decals: [{ type: 'ellipse', x: 0, z: -0.6, rx: 3.0, rz: 2.4, color: '#d8c7a8', edge: '#b9a582' }] },
    build(g, r) { std(g, r, { ring: ['round', 'pine'], cloudCol: 0xfff0e0 });
      stage(g, 0, -4.4, 4.0, 0xc0392b, 0x6b4a32);
      board(g, '★ 魔術秀 ★', '#2b2250', '#ffd84a', [0, 3.15, -4.75], 1.8, 0.5);
      [[-3.6, 0.4, 1.25], [-3.9, -1.1, 1.0], [3.6, 0.4, -1.25], [3.9, -1.1, -1.0]].forEach(q => bench(g, q[0], q[1], q[2], 0x8a5a3a));
      stringLights(g, [[-2.4, 2.9, -4.6], [-3.8, 2.4, -1.6]], [0xffd27a, 0xfff0b0]); stringLights(g, [[2.4, 2.9, -4.6], [3.8, 2.4, -1.6]], [0xffd27a, 0xfff0b0]); pole(g, -3.8, -1.6, 2.4); pole(g, 3.8, -1.6, 2.4);
      [[-1.5, -3.5], [1.5, -3.5]].forEach(q => { const sl = new THREE.Group(); sl.position.set(q[0], 0.44, q[1]); g.add(sl); add(sl, G.cyl, 0x333333, [0, 0.1, 0], [0.1, 0.2, 0.1]); add(sl, G.sph, 0xfff4c0, [0, 0.12, 0.08], 0.06, null, { glow: true }); sl.userData.solid = true; });
    } };
  scenes['adult-rabbit:garden'] = { name: '社區菜園', light: 'day', sky: SKY.warm,
    ground: { base: '#8cc76d', decals: [{ type: 'path', pts: [[-6, -2.6], [6, -2.6]], w: 0.6, color: '#d6c29a', gravel: ['#bfae86', '#e0d2b2'] }] },
    build(g, r) { std(g, r, { ring: ['round', 'poplar'] });
      raisedBed(g, -2.6, -3.7, 1.9, 0.9, 0, 'cabbage'); raisedBed(g, 0, -3.8, 1.9, 0.9, 0, 'carrot'); raisedBed(g, 2.6, -3.7, 1.9, 0.9, 0, 'tulip', [0xe84a6a, 0xf6c445, 0xffffff]);
      const gh = new THREE.Group(); gh.position.set(-3.6, 0, -6.0); g.add(gh); add(gh, G.box, mat(0xd8f0f0, { transparent: true, opacity: 0.45 }), [0, 0.6, 0], [1.8, 1.2, 1.2]); add(gh, G.box, mat(0xd8f0f0, { transparent: true, opacity: 0.45 }), [0, 1.35, 0], [1.8, 0.4, 0.9], [0, 0, 0]); [[-0.9, -0.6], [0.9, -0.6], [-0.9, 0.6], [0.9, 0.6]].forEach(q => add(gh, G.box, 0xffffff, [q[0], 0.75, q[1]], [0.04, 1.5, 0.04])); gh.userData.solid = true;
      const shed = new THREE.Group(); shed.position.set(3.6, 0, -6.0); g.add(shed); add(shed, G.box, 0x7cae7a, [0, 0.6, 0], [1.4, 1.2, 1.0]); add(shed, G.cone, 0x5a3a28, [0, 1.45, 0], [1.1, 0.5, 1.1], [0, Math.PI / 4, 0]); add(shed, G.box, 0xf3ead8, [0, 0.45, 0.51], [0.45, 0.85, 0.02]); shed.userData.solid = true;
      board(g, '社區菜園', '#5aa94b', '#ffffff', [0, 1.2, -5.0], 1.2, 0.36); add(g, G.box, 0x8a6240, [-0.5, 0.55, -5.02], [0.05, 1.1, 0.05]); add(g, G.box, 0x8a6240, [0.5, 0.55, -5.02], [0.05, 1.1, 0.05]);
      cropRows(g, { kind: 'sunflower', x0: -6.2, x1: -4.6, z0: -4.8, z1: -1.0, step: 0.5, gap: 0.6, r }); cropRows(g, { kind: 'sunflower', x0: 4.6, x1: 6.2, z0: -4.8, z1: -1.0, step: 0.5, gap: 0.6, r });
    } };
  scenes['adult-rabbit:sleep'] = { name: '薰衣草田・暮色', light: 'dusk', sky: SKY.lavender,
    ground: { base: '#7fa064', specks: ['rgba(200,170,255,0.07)', 'rgba(0,30,0,0.08)'], decals: [] },
    build(g, r) { std(g, r, { ring: ['poplar'], ringLeaf: ['dusk'], hills: [0x8a7aa8, 0x9a88b8], moon: [5, 7, -24, 1.2], cloudCol: 0xf2c8d8, tuft: 0x5f8a50 });
      moon(g, 5, 7, -24, 1.1);
      cropRows(g, { kind: 'lavender', x0: -7, x1: 7, z0: -8, z1: 2.5, step: 0.36, gap: 0.62, r, keep: 3.0 });
      tree(g, -4.4, -5.6, 'poplar', 1.6, 'dusk'); tree(g, -3.6, -6.4, 'poplar', 1.4, 'dusk'); tree(g, 4.8, -5.2, 'poplar', 1.6, 'dusk');
      fireflyCloud(g, r, 20, 0xfff2c0, [-4, 4, 0.4, 1.8, -5, -2.8]);
    } };

  // ---------- build / show ----------
  function build(key) {
    const S = scenes[key]; const g = new THREE.Group(); g.name = key; root.add(g);
    const r = rng(hashStr(key));
    const gt = paintGround(S.ground, r);
    const outer = new THREE.Mesh(new THREE.CircleGeometry(42, 48), new THREE.MeshLambertMaterial({ color: S.ground.base }));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -0.02; outer.renderOrder = -1.95; g.add(outer);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(GS, GS), new THREE.MeshLambertMaterial({ map: gt, depthWrite: false }));
    inner.rotation.x = -Math.PI / 2; inner.renderOrder = -1.9; g.add(inner);
    S.build(g, r);
    const solids = []; g.updateMatrixWorld(true);
    g.traverse(o => { if (o.userData.solid) { const b = new THREE.Box3().setFromObject(o); const s = b.getBoundingSphere(new THREE.Sphere()); solids.push({ o, box: b, sphere: s, name: `${o.type === 'Mesh' ? 'mesh' : 'group'}@(${b.getCenter(V()).toArray().map(v => v.toFixed(1)).join(',')})` }); } });
    built[key] = { g, sky: skyTex(S.sky), fog: new THREE.Fog(new THREE.Color(S.sky[S.sky.length - 1]), 16, 44), solids };
    return built[key];
  }
  function show(move) {
    const key = move == null ? null : prefix ? prefix + ':' + move : move;
    if (key === activeKey) return; activeKey = key;
    if (active) active.g.visible = false;
    if (!key || !scenes[key]) { active = null; scene.background = null; scene.fog = null; applyLight(null); return; }
    active = built[key] || build(key); active.g.visible = true;
    scene.background = active.sky; scene.fog = active.fog; applyLight(scenes[key].light);
  }

  // ---------- per-frame: little animations + hide anything that would block the camera ----------
  const _c = V(), _t = V(0, 0.8, 0), _d = V(), _p = V();
  const prevBR = scene.onBeforeRender;
  scene.onBeforeRender = function (renderer, sc, cam) {
    if (prevBR) prevBR.apply(this, arguments);
    if (!active) return;
    const now = performance.now() / 1000, dt = Math.min(now - clock.last, 0.05); clock.last = now; const t = (clock.t += dt);
    for (const s of sways) { if (!s.o.visible) continue; const v = Math.sin(t * s.f * TAU / 2 + s.ph) * s.a; if (s.axis === 'x') s.o.rotation.x = v; else if (s.axis === 'y') s.o.rotation.y = v; else s.o.rotation.z = v; }
    for (const b of blades) { if (b.axis === 'y') b.o.rotation.y += b.sp * dt; else b.o.rotation.z += b.sp * dt; }
    for (const d of ducks) { if (d.bob) { d.o.position.y = 0.02 + Math.sin(t * 1.5 + d.ph) * 0.015; d.o.rotation.z = Math.sin(t * 1.1 + d.ph) * 0.04; continue; } const a = t * d.sp - (d.lag || 0); d.o.position.set(d.cx + Math.cos(a) * d.R, 0.02 + Math.sin(t * 2 + d.R) * 0.008, d.cz + Math.sin(a) * d.R * 0.55); d.o.rotation.y = Math.atan2(-Math.sin(a) * Math.sign(d.sp), Math.cos(a) * 0.55 * Math.sign(d.sp)) ; }
    for (const d of drops) { const k = (t * 0.9 + d.ph) % 1; const rr = d.r0 * k; d.o.position.set(Math.cos(d.a) * rr * 0.5, d.top + 0.35 * Math.sin(k * Math.PI) - (d.top - 0.35) * k * k * (d.r0 > 0.5 ? 0.62 : 0.4), Math.sin(d.a) * rr * 0.5); }
    for (const k of kites) { k.o.position.set(k.base[0] + Math.sin(t * 0.7 + k.ph) * 0.25, k.base[1] + Math.sin(t * 1.1 + k.ph) * 0.2, k.base[2]); k.o.rotation.z = Math.sin(t * 0.9 + k.ph) * 0.25; k.o.children[2] && (k.o.children[2].rotation.z = Math.sin(t * 2.4 + k.ph) * 0.3); }
    for (const c of drifters) { c.o.position.x = c.x0 + Math.sin(t * c.sp * 0.3) * 3; }
    for (const f of fireflies) { f.o.position.set(f.b.x + Math.sin(t * 0.6 + f.ph) * 0.3, f.b.y + Math.sin(t * 0.9 + f.ph * 2) * 0.18, f.b.z + Math.cos(t * 0.5 + f.ph) * 0.3); if (!f.big) f.o.material.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(t * 2 + f.ph * 3)); else f.o.rotation.z = Math.sin(t * 2 + f.ph) * 0.3; }
    for (const p of petals) { p.o.position.y -= p.sp * dt; p.o.position.x = p.x0 + Math.sin(t * 0.8 + p.ph) * 0.3; p.o.rotation.x += dt * 1.5; p.o.rotation.y += dt; if (p.o.position.y < p.bot + 0.01) p.o.position.y = p.top; }
    for (const h of hoppers) { if (h.peck) { h.o.rotation.x = Math.max(0, Math.sin(t * 3 + h.ph)) * 0.6; continue; } h.o.position.y = Math.abs(Math.sin(t * 3 + h.ph)) * h.h; }
    for (const b of birds) { const a = t * b.sp + b.ph; b.o.position.set(Math.sin(a) * b.R, b.y + Math.sin(a * 3) * 0.3, b.z + Math.cos(a) * 1.5); b.o.rotation.y = a + Math.PI / 2; const f = Math.sin(t * 9 + b.ph) * 0.5; b.w1.rotation.z = f; b.w2.rotation.z = -f; }
    for (const f of flames) { f.o.scale.y = f.h * (0.85 + 0.3 * Math.abs(Math.sin(t * 7 + f.ph * 2))); }
    for (const tw of twinkles) { if (tw.soft) continue; }
    // camera occlusion: hide a park piece while it sits between the camera and the actor
    _c.copy(cam.position); _d.copy(_t).sub(_c); const L = _d.length(); _d.divideScalar(L);
    for (const s of active.solids) { _p.copy(s.sphere.center).sub(_c); const k = _p.dot(_d); let hide = false;
      if (k > -s.sphere.radius && k < L - 0.6) { const off = _p.addScaledVector(_d, -k).length(); hide = off < s.sphere.radius * 0.85 + 0.25; }
      if (s.o.visible === hide) s.o.visible = !hide; }
  };

  // ---------- review audit: record where the actor and the page's own props go, then check the park pieces ----------
  const samples = [];
  function sample(label) {
    scene.updateMatrixWorld(true);
    const isPark = (o) => { for (let q = o; q; q = q.parent) if (q === root) return true; return false; };
    scene.traverseVisible(o => {
      if (!(o.isMesh || o.isSkinnedMesh) || o.isSprite || isPark(o)) return;
      let b;
      if (o.isSkinnedMesh) { o.computeBoundingBox(); b = o.boundingBox.clone().applyMatrix4(o.matrixWorld); }
      else { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); }
      const sz = b.getSize(V()); if (sz.y < 0.04 && Math.max(sz.x, sz.z) > 1.2) return;       // floor discs / decals
      if (o.material && o.material.transparent && o.material.opacity < 0.05) return;
      samples.push({ label, name: o.name || o.parent?.name || o.type, box: b });
    });
  }
  function check() {
    if (!active) return [];
    const out = [];
    for (const s of active.solids) { if (s.o.parent && s.o.parent.userData.solid) continue; const B = s.box.clone().expandByScalar(-0.02);
      for (const q of samples) if (B.intersectsBox(q.box)) { out.push({ item: s.name, with: q.name, at: q.label, box: q.box.min.toArray().concat(q.box.max.toArray()).map(v => +v.toFixed(2)) }); break; } }
    return out;
  }
  function extent() { const b = new THREE.Box3(); samples.forEach(q => b.union(q.box)); return { min: b.min.toArray().map(v => +v.toFixed(2)), max: b.max.toArray().map(v => +v.toFixed(2)), n: samples.length }; }

  const api = { show, root, names: () => Object.fromEntries(Object.entries(scenes).filter(([k]) => !prefix || k.startsWith(prefix + ':')).map(([k, v]) => [k, v.name])),
    get key() { return activeKey; }, audit: { sample, check, extent, clear() { samples.length = 0; } } };
  window.__parks = api;
  return api;
}
