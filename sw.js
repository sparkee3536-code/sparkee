// Sparkee service worker: the app shell and the 3D pet files are cached so the app opens fast and works with a weak signal.
// 2026-10-11: big files (3D models, textures, face-detector files, three.js from the CDN) are cache-first with NO
// background re-download — before, every visit to the pet page re-downloaded the models in the background.
// When a model file changes, bump CACHE so everyone fetches the new one once.
const CACHE = 'sparkee-v20';   // 2026-11-06 第 3j 批：小夥伴看真正的打卡紀錄（打卡過會說幾點後可以再打卡）、「我的」照片收合、明信片橫向滑動（v19：第 3i 批：擺設取消（退積分）、明信片版型＋貼紙、拍照只留寵物＋影子、設施狀況回報改版（v18：實機試玩修正：停留細條、啟動畫面黑底、設施確認進度＋落地頁、隱私權頁（v17：第 3g 批照片縮圖、新徽章圖案（v16：第 3f-3 批：在線回報、審核網站統計（v15：第 3f-2 批審核網站 admin.html、清理照片（v14：第 3f-1 批手機審核頁改版、照片 1024（v13：第 3e 批徽章 62 枚、只計 C 級以上（v12：傳說少年成年、寶寶 2048 貼圖、合併 parkscenes、背景音樂（theme.js 等小檔照舊：先用快取、背景更新）））））））））
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
