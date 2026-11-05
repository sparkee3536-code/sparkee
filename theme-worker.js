// 在背景算主題曲，算好把左右聲道傳回主畫面（不卡畫面）
import { renderTheme } from './theme.js';
self.onmessage = (e) => {
  const r = renderTheme(e.data && e.data.sampleRate || 44100);
  self.postMessage(r, [r.left.buffer, r.right.buffer]);
};
