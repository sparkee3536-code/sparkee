// Sparkee service worker: the app shell and the 3D pet files are cached so the app opens fast and works with a weak signal.
// 2026-10-11: big files (3D models, textures, face-detector files, three.js from the CDN) are cache-first with NO
// background re-download — before, every visit to the pet page re-downloaded the models in the background.
// When a model file changes, bump CACHE so everyone fetches the new one once.
const CACHE = 'sparkee-v29';   // 2026-11-12 模擬兩年修正：拼圖板不再撐寬頁面、積分紀錄只讀新的、雷克斯說明（v28：2026-11-11 第 4c-2 批：讀繪本進故事書的繪本分頁（v27：2026-11-11 第 4c-1 批：尋寶格子顯示找到誰（v26：2026-11-11 第 4c 批：番外篇拼圖 14 位×8 張＋全家福 3 張、公園尋寶、碎片與卡包（v25：2026-11-10 第 4b 批：遊具照片一輪 7 天、3 張候選、大家投票選一張（v24：2026-11-10 第 4a 批：每隻小夥伴自己長大、徽章送拼圖碎片與卡包（v23：2026-11-10 第 3m 批：明信片截圖不再卡住、提示不擋右上角積分、雷克斯蛋說明（v22：2026-11-07 第 3l 批：明信片只拍待機＋轉角度同步、小夥伴對話框不再跑出螢幕、新徽章排最前面（v21：2026-11-07 第 3k 批：雷克斯少年、成年換新造型（新模型 rexteen2_、rexadult2_）（v20：2026-11-06 第 3j 批：小夥伴看真正的打卡紀錄（打卡過會說幾點後可以再打卡）、「我的」照片收合、明信片橫向滑動（v19：第 3i 批：擺設取消（退積分）、明信片版型＋貼紙、拍照只留寵物＋影子、設施狀況回報改版（v18：實機試玩修正：停留細條、啟動畫面黑底、設施確認進度＋落地頁、隱私權頁（v17：第 3g 批照片縮圖、新徽章圖案（v16：第 3f-3 批：在線回報、審核網站統計（v15：第 3f-2 批審核網站 admin.html、清理照片（v14：第 3f-1 批手機審核頁改版、照片 1024（v13：第 3e 批徽章 62 枚、只計 C 級以上（v12：傳說少年成年、寶寶 2048 貼圖、合併 parkscenes、背景音樂（theme.js 等小檔照舊：先用快取、背景更新））））））））））））））））））
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const BIG = /(_model\.json|\/food\/[a-z_]+\.json|\.jpe?g|\.png|\.webp|\.wasm|\.onnx|\.mjs)$/i;   // 食物模型也是大檔；4c 拼圖插畫 .webp
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
