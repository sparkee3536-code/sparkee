// Sparkee 主題曲（2026-11-04，原創、程式合成）：木琴主旋律＋烏克麗麗刷弦＋口哨（B 段）＋低音＋輕打擊。
// C 大調、126 BPM、4/4。v3：64 小節約 2 分鐘（A A' B A'' ｜ C D B' A'''）；前半和 v2 相同，後半加：
//   C 段＝烏克麗麗主奏的新旋律（Am F C G），D 段＝音樂盒（鐘琴）輕聲版、鼓變輕，B' 段＝口哨＋木琴和聲，A''' 收回主題。
// 尾音繞回開頭疊上，循環沒有接縫。
// 直接用數學算出每個取樣（不用 WebAudio 節點），手機上約 1 秒內算完；不需要下載任何音檔。
// 用法：const { left, right, sampleRate } = renderTheme();  再包成 AudioBuffer、loop=true 播放。
export const BPM = 126, BEAT = 60 / BPM, BAR = BEAT * 4, BARS = 64, LEN = BAR * BARS;

const N = n => 440 * Math.pow(2, (n - 69) / 12);
const CH = { C: [60, 64, 67], G: [55, 59, 62], Am: [57, 60, 64], F: [53, 57, 60], Em: [52, 55, 59], Dm: [50, 53, 57] };
const ROOT = { C: 36, G: 43, Am: 45, F: 41, Em: 40, Dm: 38 };
const A_CH = ['C', 'G', 'Am', 'F', 'C', 'G', 'F G', 'C'];
const B_CH = ['F', 'G', 'Em', 'Am', 'F', 'G', 'Dm', 'G'];
const C_CH = ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'G'];
// 主旋律：每小節 8 個八分音符，null＝休止，0＝延長前一個音
const A_MEL = [
  [72, 76, 79, 76, 84, 0, 79, null], [79, 77, 74, 71, 74, 0, 0, null],
  [72, 76, 81, 79, 76, 0, 72, null], [77, 76, 74, 72, 74, 0, 0, null],
  [72, 76, 79, 76, 84, 0, 86, null], [88, 86, 84, 83, 86, 0, 0, null],
  [84, 81, 77, 81, 79, 77, 74, 71], [72, 0, 76, 0, 72, 0, null, null],
];
const A2_END = [79, 0, 76, 0, 74, 0, 71, 0];   // A' 最後一小節往 B 段推
const B_MEL = [
  [81, 0, 0, 0, 79, 0, 77, 0], [79, 0, 0, 0, 74, 0, 0, 0],
  [76, 0, 79, 0, 83, 0, 81, 0], [81, 0, 0, 0, 0, 0, null, null],
  [77, 0, 81, 0, 84, 0, 81, 0], [83, 0, 79, 0, 74, 0, 79, 0],
  [77, 0, 76, 0, 74, 0, 72, 0], [74, 0, 77, 0, 79, 0, 83, 0],
];
// C 段：烏克麗麗主奏，切分、跳躍一點
const C_MEL = [
  [76, null, 76, 74, 76, 0, 79, 0], [77, 0, 76, 74, 72, 0, null, null],
  [72, null, 72, 74, 76, 0, 79, 0], [81, 0, 79, 0, 74, 0, null, null],
  [76, null, 76, 74, 76, 0, 81, 0], [84, 0, 81, 0, 77, 0, 76, 74],
  [74, 0, 77, 0, 81, 0, 79, 77], [79, 0, 0, 0, 83, 0, 86, 0],
];
// D 段：音樂盒輕聲唱主題（主旋律簡化成長音），最後一小節鼓聲漸強接回 B'
const D_MEL = [
  [72, 0, 79, 0, 84, 0, 79, 0], [79, 0, 74, 0, 71, 0, 0, 0],
  [72, 0, 81, 0, 76, 0, 72, 0], [77, 0, 74, 0, 72, 0, 0, 0],
  [72, 0, 79, 0, 84, 0, 86, 0], [88, 0, 86, 0, 83, 0, 0, 0],
  [84, 0, 81, 0, 79, 0, 74, 0], [72, 0, 0, 0, 74, 0, 77, 0],
];
function song(){
  const bars = [];
  const push = (chs, mel, lead, last, dr = 'full') => chs.forEach((c, i) => bars.push({ ch: c, mel: i === 7 && last ? last : mel[i], lead, dr: i === 7 && dr === 'light' ? 'build' : dr }));
  push(A_CH, A_MEL, 'mar'); push(A_CH, A_MEL, 'mar2', A2_END); push(B_CH, B_MEL, 'whis'); push(A_CH, A_MEL, 'mar2');
  push(C_CH, C_MEL, 'uke'); push(A_CH, D_MEL, 'box', null, 'light'); push(B_CH, B_MEL, 'whis2'); push(A_CH, A_MEL, 'mar2');
  return bars;
}

// ---------- 樂器（每個都把聲音加進 L、R 兩聲道；t＝秒） ----------
const TAU = Math.PI * 2;
function makeMix(sr){
  const n = Math.round(LEN * sr), tail = Math.round(2.5 * sr), L = new Float32Array(n + tail), R = new Float32Array(n + tail);
  const add = (i, v, pan) => { if (i < 0 || i >= L.length) return; L[i] += v * (1 - pan) * 0.7; R[i] += v * (1 + pan) * 0.7; };
  return { sr, n, L, R, add };
}
// 衰減型正弦（木琴、鐘琴、低音）：partials＝[[倍數, 音量, 衰減秒]]
function bell(M, t, f, v, parts, pan, hold){
  const { sr } = M, i0 = Math.round(t * sr), atk = Math.round(0.004 * sr);
  for (const [m, g, d] of parts){
    const len = Math.round((d * 5 + (hold || 0)) * sr), w = TAU * f * m / sr, k = Math.exp(-1 / (d * sr));
    let e = 1;
    for (let j = 0; j < len; j++){ const a = j < atk ? j / atk : (e *= k); M.add(i0 + j, Math.sin(w * j) * v * g * a, pan); }
  }
}
function whistle(M, t, f, v, dur, pan){
  const { sr } = M, i0 = Math.round(t * sr), len = Math.round((dur + 0.05) * sr), atk = 0.05 * sr, rel = 0.06 * sr; let ph = 0;
  for (let j = 0; j < len; j++){
    const s = j / sr, ff = f * (s < 0.06 ? 0.985 + 0.015 * s / 0.06 : 1) * (1 + 0.012 * Math.sin(TAU * 5.5 * s));
    ph += TAU * ff / sr;
    const a = Math.min(1, j / atk, (len - j) / rel);
    M.add(i0 + j, Math.sin(ph) * v * a, pan);
  }
}
function pluck(M, t, f, v, pan, dec = 0.09){   // 三角波＋逐漸變暗的低通；dec＝衰減秒（主奏用較長）
  const { sr } = M, i0 = Math.round(t * sr), len = Math.round(dec * 4 * sr); let y = 0, ph = 0;
  for (let j = 0; j < len; j++){
    ph += f / sr; const tri = 4 * Math.abs(ph - Math.floor(ph + 0.5)) - 1;
    const s = j / sr, cut = 700 + 2500 * Math.exp(-s / 0.08), a = Math.exp(-s / dec) * Math.min(1, j / (0.003 * sr));
    const al = 1 - Math.exp(-TAU * cut / sr); y += al * (tri - y);
    M.add(i0 + j, y * v * a, pan);
  }
}
let seed = 12345; const rnd = () => (seed = (seed * 16807) % 2147483647) / 1073741823.5 - 1;
function shaker(M, t, v){ const { sr } = M, i0 = Math.round(t * sr), len = Math.round(0.06 * sr); let x0 = 0, y = 0;
  for (let j = 0; j < len; j++){ const x = rnd(); y = 0.6 * (y + x - x0); x0 = x; M.add(i0 + j, y * v * Math.exp(-j / (0.014 * sr)), 0); } }
function kick(M, t, v){ const { sr } = M, i0 = Math.round(t * sr), len = Math.round(0.2 * sr); let ph = 0;
  for (let j = 0; j < len; j++){ const s = j / sr; ph += TAU * (48 + 62 * Math.exp(-s / 0.03)) / sr; M.add(i0 + j, Math.sin(ph) * v * Math.exp(-s / 0.06), 0); } }
function snap(M, t, v){ const { sr } = M, i0 = Math.round(t * sr), len = Math.round(0.1 * sr); let lp = 0, hp = 0, x0 = 0;
  for (let j = 0; j < len; j++){ const x = rnd(); hp = 0.9 * (hp + x - x0); x0 = x; lp += 0.35 * (hp - lp); M.add(i0 + j, lp * v * Math.exp(-j / (0.022 * sr)), 0.05); } }

export function renderTheme(sr = 44100){
  seed = 12345;
  const M = makeMix(sr), E = BEAT / 2;
  const MAR = [[1, 1, 0.22], [4, 0.28, 0.04], [10, 0.05, 0.015]], GLK = [[1, 1, 0.3], [2.76, 0.3, 0.12], [5.4, 0.1, 0.05]];
  song().forEach((B, bi) => {
    const t0 = bi * BAR, halves = B.ch.split(' ');
    halves.forEach((ch, hi) => {
      const span = BAR / halves.length, ts = t0 + hi * span;
      const BASS = [[1, 1, 0.2], [2, 0.18, 0.08]];   // v2：根音＋八度跳的彈跳低音
      const pat = halves.length === 1 ? [[0, 0, 0.34], [1.5, 12, 0.2], [2, 7, 0.28], [3.5, 12, 0.2]] : [[0, 0, 0.34], [1, 12, 0.2]];
      for (const [b, iv, v] of pat) bell(M, ts + b * BEAT, N(ROOT[ch] + iv), v, BASS, 0);
      for (let k = 0; k < (halves.length === 1 ? 8 : 4); k++){
        if (k % 2 === 0 && k !== 0) continue;
        const strong = k % 2 === 1;
        const sv = B.dr === 'full' ? 1 : 0.7;
        CH[ch].forEach((n, j) => pluck(M, ts + k * E + j * 0.012, N(n + 12), (strong ? 0.075 : 0.05) * sv, 0.3));
      }
    });
    B.mel.forEach((n, k) => {
      if (n == null || n === 0) return;
      let len = 1; while (k + len < 8 && B.mel[k + len] === 0) len++;
      const tt = t0 + k * E, dur = len * E;
      if (B.lead === 'whis' || B.lead === 'whis2'){
        whistle(M, tt, N(n), 0.13, dur * 0.95, -0.05);
        if (B.lead === 'whis2') bell(M, tt, N(n - 12), 0.12, MAR, 0.25, 0);   // B'：木琴低八度跟著唱
      } else if (B.lead === 'uke'){
        pluck(M, tt, N(n), 0.34, -0.12, 0.16 + Math.min(dur, 0.6) * 0.25); bell(M, tt, N(n - 12), 0.07, MAR, -0.1, 0);
      } else if (B.lead === 'box'){
        bell(M, tt, N(n + 12), 0.15, GLK, -0.2, 0); bell(M, tt, N(n), 0.1, MAR, 0.1, 0);
      } else { bell(M, tt, N(n), 0.3, MAR, -0.05, Math.max(0, dur - 0.3) * 0.3); if (B.lead === 'mar2' && k % 4 === 0) bell(M, tt, N(n + 12), 0.06, GLK, -0.3); }
    });
    if (B.dr === 'full'){
      for (let k = 0; k < 16; k++) shaker(M, t0 + k * E / 2, k % 4 === 2 ? 0.075 : k % 2 ? 0.03 : 0.045);   // v2：十六分沙鈴，反拍重
      kick(M, t0, 0.4); kick(M, t0 + BEAT * 2, 0.28);
      snap(M, t0 + BEAT, 0.16); snap(M, t0 + BEAT * 3, 0.16);
    } else if (B.dr === 'light'){   // D 段：只留八分沙鈴和第 3 拍彈指
      for (let k = 0; k < 8; k++) shaker(M, t0 + k * E, k % 2 ? 0.04 : 0.025);
      snap(M, t0 + BEAT * 2, 0.1);
    } else {   // build：D 段最後一小節，鼓一拍一拍加回來
      for (let k = 0; k < 16; k++) shaker(M, t0 + k * E / 2, 0.02 + 0.05 * k / 15);
      kick(M, t0, 0.3); kick(M, t0 + BEAT * 2, 0.3); kick(M, t0 + BEAT * 3, 0.32); kick(M, t0 + BEAT * 3.5, 0.34);
      snap(M, t0 + BEAT, 0.12); snap(M, t0 + BEAT * 3, 0.16);
    }
    if (bi % 8 === 7) bell(M, t0 + BEAT * 3.5, N(96), 0.07, GLK, -0.3);
  });
  // 尾音疊回開頭（循環無接縫）、峰值壓到約 -1 dBFS
  // 2 分鐘版：直接在原陣列上疊、用 subarray，不另外複製（手機省記憶體）
  const { n, L, R } = M;
  for (let i = n; i < L.length; i++){ L[i - n] += L[i]; R[i - n] += R[i]; }
  const left = L.subarray(0, n), right = R.subarray(0, n);
  let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(left[i]), Math.abs(right[i]));
  const g = 0.89 / pk; for (let i = 0; i < n; i++){ left[i] *= g; right[i] *= g; }
  return { left, right, sampleRate: sr, seconds: n / sr };
}
