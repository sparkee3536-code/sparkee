// Sparkee sound: DISABLED (2026-10-09, user decision — all pet voices, ambience and sound effects removed; 待定, to be redone later).
// This silent stub keeps the same API so every motion page still runs; it makes no sound and adds no sound button.
export function makeSfx(opt = {}) {
  const S = { page: opt.page, pet: opt.pet, stage: opt.stage, move: 'idle' };
  const noop = () => {};
  const api = {
    get on() { return false; }, log: [], S,
    tag: noop, tagWord: (txt, tex) => tex, setPet(p) { S.pet = p; }, move(name) { S.move = name; },
    fx: noop, confetti: noop, word: noop, events: noop, track: noop,
    enable: async () => {}, setVol: noop, play: noop, voice: noop,
  };
  if (typeof window !== 'undefined') window.__sfx = api;
  return api;
}
