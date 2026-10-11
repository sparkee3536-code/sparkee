// 寵物 3D 頁的下載讀條：抓模型檔時一邊讀一邊算百分比，畫成一條進度條（取代「載入中…」文字）
// SIZES：每個模型檔未壓縮的大小（網站傳輸時會壓縮，Content-Length 不準，用這張表算百分比）
const SIZES = {"bunny_model.json": 1256342, "rabbitadult_model.json": 1941673, "rabbitfist_model.json": 1942297, "rabbithero_model.json": 1982572, "teen_model.json": 2314810};
let el = null, label = '', files = [], done = {}, raf = 0;
export function startBar(loadingEl, text, list){
  el = loadingEl; label = text; files = list; done = {};
  el.hidden = false;
  el.innerHTML = '<div class="dlbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="dlt"></span><span class="dlb"><i></i></span><span class="dlp xs"></span></div>';
  if (!document.getElementById('dlbar-css')){ const s = document.createElement('style'); s.id = 'dlbar-css';
    s.textContent = '.dlbar{display:flex;flex-direction:column;align-items:center;gap:8px;width:min(260px,70%)}.dlbar .dlt{font-size:14px;color:var(--fg,#1B2A22);font-weight:700}.dlbar .dlb{display:block;width:100%;height:10px;border-radius:99px;background:rgba(43,122,75,.15);overflow:hidden}.dlbar .dlb i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#2B7A4B,#5FBF86);transition:width .2s}.dlbar .dlp{font-size:12px;color:var(--muted,#55645B)}';
    document.head.appendChild(s); }
  paint();
}
function frac(){ if (!files.length) return 0; let s = 0, t = 0; for (const f of files){ const n = SIZES[f] || 1; t += n; s += Math.min(n, done[f] || 0); } return s / t; }
function paint(){
  raf = 0; if (!el) return;
  const p = Math.round(frac() * 100), box = el.querySelector('.dlbar'); if (!box) return;
  box.setAttribute('aria-valuenow', String(p));
  box.querySelector('i').style.width = p + '%';
  box.querySelector('.dlt').textContent = p < 100 ? `${label}下載中 ${p}%` : `${label}準備中…`;
  const mb = files.reduce((s, f) => s + (SIZES[f] || 0), 0) / 1048576;
  box.querySelector('.dlp').textContent = p < 100 ? `約 ${mb.toFixed(1)} MB，第一次比較久，之後會快很多` : '快好了';
}
const kick = () => { if (!raf) raf = requestAnimationFrame(paint); };
// 讀 JSON 並回報進度（不支援串流時直接讀完）
export async function fetchJSON(file){
  const res = await fetch(file); if (!res.ok) throw new Error('fetch ' + res.status);
  if (!res.body || !res.body.getReader){ const j = await res.json(); done[file] = SIZES[file] || 1; kick(); return j; }
  const rd = res.body.getReader(), parts = []; let n = 0;
  for (;;){ const { done: end, value } = await rd.read(); if (end) break; parts.push(value); n += value.length; done[file] = n; kick(); }
  done[file] = Math.max(n, SIZES[file] || 0); kick();
  const all = new Uint8Array(n); let o = 0; for (const p of parts){ all.set(p, o); o += p.length; }
  return JSON.parse(new TextDecoder().decode(all));
}
export function endBar(){ if (el){ el.hidden = true; el.innerHTML = ''; } el = null; }
