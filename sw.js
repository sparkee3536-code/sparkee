// Sparkee service worker: the app shell and the 3D pet files are cached so the app opens fast and works with a weak signal.
// 2026-10-11: big files (3D models, textures, face-detector files, three.js from the CDN) are cache-first with NO
// background re-download — before, every visit to the pet page re-downloaded the models in the background.
// When a model file changes, bump CACHE so everyone fetches the new one once.
const CACHE = 'sparkee-v9';   // 2026-10-18 第 3 批 A：乳牛、小狗、雷克斯三個階段的 3D 頁、食物模型、餵食動作
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const BIG = /(_model\.json|\/food\/[a-z_]+\.json|\.jpe?g|\.png|\.wasm|\.onnx|\.mjs)$/i;   // 食物模型也是大檔
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const sameOrigin = u.origin === location.origin;
  const cdn = /cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(u.host);
  if (!sameOrigin && !cdn) return;                       // Supabase, map tiles: always network
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request);
    if (hit && (cdn || BIG.test(u.pathname) || u.pathname.includes('/assets/'))) return hit;   // never changes under the same name: no re-download
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit && !u.pathname.endsWith('/') && !u.pathname.endsWith('.html') ? hit : net;   // pages: network first; small scripts: cached copy now, refreshed in the background
  }));
});
