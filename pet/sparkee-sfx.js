// Sparkee sound: synthesized cartoon SFX + synthesized pet voices + park ambience (library files, synth fallback).
// const SFX = makeSfx({ page: 'teen-cow', pet: 'cow', stage: 'teen', stageEl });
export function makeSfx(opt) {
  const S = { page: opt.page, pet: opt.pet, stage: opt.stage, hero: false, move: 'idle', sceneKey: null, autoLand: !!opt.autoLand, hasEvents: !!opt.hasEvents };
  let ctx = null, master, bus = {}, on = false, noiseBuf = null;
  const log = []; const LOG = (n) => { log.push([+(performance.now() / 1000).toFixed(2), S.move, n]); if (log.length > 600) log.shift(); };
  const last = {};                                  // rate limiting per sound id
  const gate = (id, gap) => { const n = performance.now(); if (last[id] && n - last[id] < gap * 1000) return false; last[id] = n; return true; };
  const VOL = { sfx: 0.75, voice: 0.85, amb: 0.4 };
  try { const v = JSON.parse(localStorage.getItem('sparkee-sound') || 'null'); if (v) { Object.assign(VOL, v.vol || {}); S.want = !!v.on; } } catch (e) {}
  const save = () => { try { localStorage.setItem('sparkee-sound', JSON.stringify({ on, vol: VOL })); } catch (e) {} };

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC && !opt.ctx) return;
    ctx = opt.ctx || new AC();
    master = ctx.createGain(); master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; master.connect(comp); comp.connect(ctx.destination);
    for (const k of ['sfx', 'voice', 'amb']) { bus[k] = ctx.createGain(); bus[k].gain.value = VOL[k]; bus[k].connect(master); }
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const T = () => ctx.currentTime;
  // ---------- primitives ----------
  function env(g, t, a, peak, dur, rel = 0.05) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + Math.max(a, dur - rel)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  function tone(o) {   // {f, f2, dur, type, vol, at, a, out, glide:'exp'|'lin', vib}
    const t = T() + (o.at || 0), osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) (o.glide === 'lin' ? osc.frequency.linearRampToValueAtTime(o.f2, t + o.dur) : osc.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur));
    if (o.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + o.dur + 0.05); }
    env(g, t, o.a || 0.005, o.vol || 0.3, o.dur, o.rel || Math.min(0.08, o.dur * 0.6));
    let node = osc; if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; node.connect(f); node = f; }
    node.connect(g); g.connect(o.out || bus.sfx); osc.start(t); osc.stop(t + o.dur + 0.05);
  }
  function noise(o) {   // {dur, type:'bandpass'|'lowpass'|'highpass', f, f2, q, vol, at, a, out}
    const t = T() + (o.at || 0), src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; src.loop = true; f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 1000, t); f.Q.value = o.q || 1;
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    env(g, t, o.a || 0.004, o.vol || 0.3, o.dur, o.rel || Math.min(0.1, o.dur * 0.6));
    src.connect(f); f.connect(g); g.connect(o.out || bus.sfx); src.start(t, Math.random()); src.stop(t + o.dur + 0.05);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
  function pluck(f, at = 0, vol = 0.25, dur = 0.9) {     // ukulele-ish pluck: bright triangle + saw through closing lowpass
    const t = T() + at, o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o1.type = 'triangle'; o2.type = 'sawtooth'; o1.frequency.value = f; o2.frequency.value = f * 1.003;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(600, t + dur * 0.7);
    const g2 = ctx.createGain(); g2.gain.value = 0.25; o2.connect(g2); g2.connect(lp); o1.connect(lp); lp.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(bus.sfx); o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function bell(f, at = 0, vol = 0.18, dur = 1.2) { [1, 2.76, 5.4].forEach((k, i) => tone({ f: f * k, dur: dur / (1 + i * 0.8), vol: vol / (1 + i * 1.5), at, a: 0.002 })); }

  // ---------- cartoon SFX library ----------
  const SND = {
    boing(v = 1) { tone({ f: 180, f2: 620, dur: 0.22, type: 'sine', vol: 0.3 * v, vib: [28, 40] }); },
    hop(v = 1) { tone({ f: 260, f2: 520, dur: 0.12, vol: 0.35 * v }); },
    land(v = 1) { tone({ f: 140, f2: 55, dur: 0.16, vol: 0.32 * v }); noise({ type: 'lowpass', f: 600, dur: 0.1, vol: 0.12 * v }); },
    thud(v = 1) { tone({ f: 110, f2: 40, dur: 0.28, vol: 0.45 * v }); noise({ type: 'lowpass', f: 400, dur: 0.22, vol: 0.25 * v }); },
    bigStomp() { tone({ f: 90, f2: 30, dur: 0.6, vol: 0.6 }); noise({ type: 'lowpass', f: 300, f2: 80, dur: 0.8, vol: 0.4 }); bell(1200, 0.02, 0.06, 0.6); },
    step(v = 1) { noise({ type: 'bandpass', f: rnd(500, 800), q: 1.2, dur: 0.06, vol: 0.2 * v }); },
    pop() { tone({ f: 900, f2: 180, dur: 0.07, vol: 0.3 }); noise({ type: 'highpass', f: 3000, dur: 0.03, vol: 0.1 }); },
    bubble() { tone({ f: rnd(500, 700), f2: rnd(1300, 1700), dur: 0.09, vol: 0.14 }); },
    bigPop() { tone({ f: 600, f2: 90, dur: 0.18, vol: 0.4 }); noise({ type: 'highpass', f: 2500, dur: 0.12, vol: 0.2 }); for (let i = 0; i < 6; i++) tone({ f: rnd(900, 2000), f2: rnd(400, 700), dur: 0.08, vol: 0.06, at: 0.05 + i * 0.05 }); },
    splash() { noise({ type: 'bandpass', f: 2200, f2: 800, q: 0.8, dur: 0.5, vol: 0.22 }); for (let i = 0; i < 5; i++) tone({ f: rnd(700, 1400), f2: rnd(300, 500), dur: 0.07, vol: 0.06, at: 0.08 + i * 0.07 }); },
    sparkle(v = 1) { for (let i = 0; i < 5; i++) tone({ f: NOTE(84 + [0, 4, 7, 11, 12][i] + (Math.random() < 0.5 ? 0 : 12)), dur: 0.35, vol: 0.06 * v, at: i * 0.045, a: 0.003 }); },
    twinkle() { [88, 91, 96].forEach((n, i) => tone({ f: NOTE(n), dur: 0.4, vol: 0.06, at: i * 0.07 })); },
    heart() { tone({ f: NOTE(76), dur: 0.18, vol: 0.12, type: 'triangle' }); tone({ f: NOTE(80), dur: 0.3, vol: 0.12, type: 'triangle', at: 0.12 }); },
    chime() { [72, 76, 79, 84].forEach((n, i) => bell(NOTE(n), i * 0.09, 0.09, 1.0)); },
    tada() { [[60, 64, 67], [65, 69, 72], [67, 71, 74, 79]].forEach((ch, i) => ch.forEach(n => tone({ f: NOTE(n + 12), dur: i === 2 ? 0.7 : 0.14, type: 'sawtooth', vol: 0.05, at: i * 0.15, lp: 2600 }))); },
    fanfare() { [67, 72, 76, 79, 76, 79, 84].forEach((n, i) => tone({ f: NOTE(n), dur: i === 6 ? 0.6 : 0.12, type: 'square', vol: 0.045, at: [0, .12, .24, .36, .55, .67, .8][i], lp: 2400 })); },
    whoosh(v = 1) { noise({ type: 'bandpass', f: 400, f2: 2400, q: 1.5, dur: 0.28, vol: 0.18 * v, a: 0.08 }); },
    swish() { noise({ type: 'bandpass', f: 1800, f2: 700, q: 2, dur: 0.14, vol: 0.35, a: 0.04 }); },
    ding() { bell(NOTE(88), 0, 0.14, 0.9); bell(NOTE(88), 0.22, 0.14, 1.1); },
    whistle(n = 1) { for (let i = 0; i < n; i++) tone({ f: 2300, dur: 0.18, type: 'sine', vol: 0.12, at: i * 0.24, vib: [32, 90] }); },
    longWhistle() { tone({ f: 2300, dur: 0.7, vol: 0.12, vib: [30, 90] }); },
    clap(n = 1) { for (let i = 0; i < n; i++) { noise({ type: 'bandpass', f: 1400, q: 0.9, dur: 0.07, vol: 0.6, at: i * 0.18 }); noise({ type: 'highpass', f: 2500, dur: 0.04, vol: 0.12, at: i * 0.18 + 0.01 }); } },
    applause(dur = 2.2) { if (playFile('applause', 0.7)) return; for (let i = 0; i < dur * 22; i++) noise({ type: 'bandpass', f: rnd(900, 2200), q: 1, dur: 0.05, vol: rnd(0.04, 0.1), at: rnd(0, dur) * (1 - i / (dur * 30)) }); },
    kick() { tone({ f: 160, f2: 60, dur: 0.12, vol: 0.4 }); noise({ type: 'bandpass', f: 1200, dur: 0.05, vol: 0.2 }); },
    net() { noise({ type: 'highpass', f: 3000, f2: 1500, dur: 0.35, vol: 0.12 }); },
    crowd() { if (playFile('sportsHit', 0.6)) return; for (let i = 0; i < 40; i++) noise({ type: 'bandpass', f: rnd(500, 1500), q: 2, dur: rnd(0.2, 0.5), vol: 0.03, at: rnd(0, 1.2) }); },
    crash() { for (let i = 0; i < 9; i++) { const f = rnd(300, 700); tone({ f, f2: f * 0.8, dur: 0.09, type: 'triangle', vol: 0.18, at: i * 0.06 + rnd(0, 0.03) }); } noise({ type: 'lowpass', f: 900, dur: 0.35, vol: 0.2 }); },
    clack() { tone({ f: 1100, f2: 900, dur: 0.05, type: 'triangle', vol: 0.36 }); tone({ f: 750, dur: 0.05, type: 'triangle', vol: 0.24, at: 0.07 }); },
    tap() { tone({ f: 1500, f2: 1200, dur: 0.05, type: 'triangle', vol: 0.32 }); },
    poof() { noise({ type: 'lowpass', f: 1600, f2: 200, dur: 0.45, vol: 0.3, a: 0.01 }); },
    magic() { for (let i = 0; i < 8; i++) tone({ f: NOTE(79 + [0, 2, 4, 7, 9, 12, 14, 16][i]), dur: 0.3, vol: 0.06, at: i * 0.05, type: 'triangle' }); },
    transform() { tone({ f: 200, f2: 1600, dur: 0.9, type: 'sawtooth', vol: 0.06, lp: 2000 }); noise({ type: 'bandpass', f: 600, f2: 5000, dur: 0.9, vol: 0.12, a: 0.3 }); SND.sparkle(1.5); },
    scream() { tone({ f: 900, f2: 1500, dur: 0.18, type: 'square', vol: 0.06, lp: 3000 }); tone({ f: 1500, f2: 500, dur: 0.6, type: 'square', vol: 0.06, at: 0.18, lp: 3000, vib: [12, 60] }); },
    slide() { tone({ f: 1400, f2: 300, dur: 0.5, vol: 0.12, glide: 'lin' }); },
    gulp() { tone({ f: 300, f2: 120, dur: 0.12, vol: 0.25 }); tone({ f: 260, f2: 110, dur: 0.12, vol: 0.2, at: 0.22 }); },
    clink() { bell(NOTE(96), 0, 0.12, 0.8); bell(NOTE(100), 0.04, 0.08, 0.7); },
    steam() { noise({ type: 'highpass', f: 2500, dur: 0.5, vol: 0.12, a: 0.03 }); },
    scrape() { noise({ type: 'bandpass', f: 700, q: 2, dur: 0.18, vol: 0.4 }); },
    skid() { noise({ type: 'bandpass', f: 1600, f2: 900, q: 3, dur: 0.4, vol: 0.12 }); },
    dig() { noise({ type: 'lowpass', f: rnd(700, 1100), dur: 0.12, vol: 0.45 }); },
    sniff() { for (let i = 0; i < 3; i++) noise({ type: 'bandpass', f: 3000, q: 2, dur: 0.06, vol: 0.2, at: i * 0.11 }); },
    brush() { noise({ type: 'bandpass', f: 2600, f2: 1800, q: 1.5, dur: 0.16, vol: 0.22 }); },
    scoop() { tone({ f: 500, f2: 250, dur: 0.12, vol: 0.12 }); noise({ type: 'lowpass', f: 900, dur: 0.1, vol: 0.08 }); },
    coin() { tone({ f: NOTE(83), dur: 0.08, type: 'square', vol: 0.05 }); tone({ f: NOTE(88), dur: 0.35, type: 'square', vol: 0.05, at: 0.08 }); },
    chirp() { for (let i = 0; i < 3; i++) tone({ f: rnd(2600, 3200), f2: rnd(3600, 4200), dur: 0.06, vol: 0.06, at: i * 0.09 }); },
    flutter() { for (let i = 0; i < 6; i++) noise({ type: 'bandpass', f: 1200, dur: 0.04, vol: 0.15, at: i * 0.05 }); },
    popper() { noise({ type: 'highpass', f: 1500, dur: 0.08, vol: 0.3 }); tone({ f: 200, f2: 80, dur: 0.1, vol: 0.2 }); SND.sparkle(0.8); },
    glint() { tone({ f: NOTE(100), dur: 0.25, vol: 0.06 }); tone({ f: NOTE(105), dur: 0.35, vol: 0.05, at: 0.06 }); },
    grow() { tone({ f: 300, f2: 900, dur: 0.25, vol: 0.1, type: 'triangle' }); },
    snore(i) { if (i % 2) noise({ type: 'bandpass', f: 380, q: 3, dur: 0.9, vol: 0.06, a: 0.4, out: bus.voice }); else { noise({ type: 'lowpass', f: 700, dur: 0.7, vol: 0.05, a: 0.3, out: bus.voice }); tone({ f: 110, f2: 90, dur: 0.6, type: 'sawtooth', vol: 0.025, lp: 300, a: 0.2, out: bus.voice }); } },
    dizzy() { tone({ f: 900, f2: 1200, dur: 0.8, vol: 0.06, vib: [6, 200] }); },
    bell2() { bell(NOTE(84), 0, 0.12, 0.8); },
    quack() { tone({ f: 420, f2: 300, dur: 0.14, type: 'sawtooth', vol: 0.1, lp: 1400 }); tone({ f: 420, f2: 300, dur: 0.12, type: 'sawtooth', vol: 0.08, lp: 1400, at: 0.2 }); },
    baa() { tone({ f: 380, f2: 340, dur: 0.6, type: 'sawtooth', vol: 0.07, lp: 1500, vib: [9, 25] }); },
    peep() { tone({ f: 3000, f2: 3600, dur: 0.07, vol: 0.09 }); },
    creak() { tone({ f: 600, f2: 900, dur: 0.35, type: 'sawtooth', vol: 0.035, lp: 1500, vib: [40, 30] }); },
  };

  // ---------- voices: formant syllables; pitch by stage, timbre by species ----------
  const PITCH = { baby: 1.0, teen: 0.78, adult: 0.6 };
  const VGAIN = { bunny: { baby: 0.5, teen: 1.2, adult: 1.4 }, cow: { baby: 0.65, teen: 1.0, adult: 0.9 }, puppy: { baby: 0.7, teen: 1.1, adult: 1.0 } };
  const VOX = {
    bunny: { f0: 980, src: 'triangle', f1: 1400, f2: 3000, syl: 0.09, mix: 0.4 },
    cow:   { f0: 330, src: 'sawtooth', f1: 400, f2: 900, syl: 0.32, mix: 1 },
    puppy: { f0: 640, src: 'sawtooth', f1: 850, f2: 1500, syl: 0.12, mix: 1 },
    hero:  { f0: 470, src: 'sawtooth', f1: 750, f2: 1300, syl: 0.14, mix: 1 },
    raccoon: { f0: 900, src: 'square', f1: 1600, f2: 3000, syl: 0.06, mix: 1 },
  };
  function syl(who, at, k0, k1, dur, vol = 0.25, vowel = 1) {
    const V = VOX[who], pf = who === 'hero' || who === 'raccoon' ? 1 : PITCH[S.stage] || 1;
    vol *= ((VGAIN[who] || {})[S.stage] || 1);
    const t = T() + at, f0 = V.f0 * pf, o = ctx.createOscillator(); o.type = V.src;
    o.frequency.setValueAtTime(f0 * k0, t); o.frequency.exponentialRampToValueAtTime(f0 * k1, t + dur);
    const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = who === 'cow' ? 5.5 : 9; lg.gain.value = f0 * (who === 'cow' ? 0.025 : 0.015); l.connect(lg); lg.connect(o.frequency);
    const g = ctx.createGain(); env(g, t, Math.min(0.03, dur * 0.25), vol, dur, dur * 0.4);
    const sum = ctx.createGain(); sum.gain.value = 1;
    [[V.f1 * vowel, 5, 1], [V.f2 * vowel, 7, 0.5]].forEach(([f, q, a]) => { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; const bg = ctx.createGain(); bg.gain.value = a * 3; o.connect(b); b.connect(bg); bg.connect(sum); });
    const dry = ctx.createGain(); dry.gain.value = V.mix < 1 ? 0.6 : 0.12; o.connect(dry); dry.connect(sum);
    if (who === 'cow') { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(1500, t + dur * 0.4); lp.frequency.linearRampToValueAtTime(700, t + dur); sum.connect(lp); lp.connect(g); } else sum.connect(g);
    g.connect(bus.voice); o.start(t); l.start(t); o.stop(t + dur + 0.05); l.stop(t + dur + 0.05);
  }
  function voice(kind, whoOverride) {
    const who = whoOverride || (S.hero ? 'hero' : S.pet), V = VOX[who]; if (!V) return;
    const s = V.syl * (S.stage === 'adult' && who !== 'hero' ? 1.25 : 1);
    if (!gate('voice', kind === 'cry' ? 0.9 : 0.35)) return; LOG('voice:' + kind);
    if (who === 'bunny' && kind === 'sniff') return SND.sniff();
    switch (kind) {
      case 'happy': syl(who, 0, 1.0, 1.15, s, 0.24); syl(who, s * 1.4, 1.15, 1.35, s * 1.2, 0.24); if (who !== 'cow') syl(who, s * 2.9, 1.3, 1.5, s * 1.3, 0.22); break;
      case 'call': syl(who, 0, 0.95, 1.2, s * (who === 'cow' ? 2.6 : 1.6), 0.28); if (who === 'puppy') syl(who, s * 2.2, 1.0, 0.85, s * 1.2, 0.24); break;
      case 'surprised': syl(who, 0, 0.9, 1.6, s * 1.2, 0.26, 1.15); break;
      case 'laugh': for (let i = 0; i < 4; i++) syl(who, i * s * 1.25, 1.35 - i * 0.07, 1.25 - i * 0.07, s * 0.8, 0.2, 1.1); break;
      case 'cry': for (let i = 0; i < 3; i++) syl(who, i * s * 3.2, 1.25, 0.9, s * 2.6, 0.18, 0.85); break;
      case 'yawn': syl(who, 0, 1.0, 0.7, s * 4, 0.12, 0.8); break;
      case 'ahh': syl(who, 0, 1.1, 0.85, s * (who === 'cow' ? 2.2 : 5), 0.2, 0.9); break;
      case 'moo': syl('cow', 0, 0.9, 1.05, s * 1.3, 0.26); syl('cow', s * 1.2, 1.05, 0.8, s * 2.4, 0.26); break;
      case 'think': syl(who, 0, 1.0, 1.0, s * 2.2, 0.12, 0.75); break;
      case 'hero': syl(who, 0, 1.0, 1.25, s * 1.6, 0.3, 1.1); syl(who, s * 1.8, 1.25, 1.1, s * 2.2, 0.3, 1.1); break;
      case 'ouch': syl(who, 0, 1.5, 1.0, s * 1.4, 0.24); break;
      case 'count': syl(who, 0, 1.2, 1.25, s, 0.2); break;
    }
  }

  // ---------- ambience: library loops (cut by Claude) with synthesized fallback ----------
  const AMB = {   // scene key -> [bed, extra point-sound]
    'baby-bunny:idle': ['day'], 'baby-bunny:binky': ['playground'], 'baby-bunny:pet': ['farm'], 'baby-bunny:sleep': ['dusk'], 'baby-bunny:sig': ['day'],
    'baby-cow:idle': ['farm'], 'baby-cow:binky': ['day'], 'baby-cow:pet': ['farm', 'animals'], 'baby-cow:sleep': ['night', 'windmill'], 'baby-cow:sig': ['day'],
    'baby-puppy:idle': ['day'], 'baby-puppy:binky': ['playground'], 'baby-puppy:pet': ['day'], 'baby-puppy:sleep': ['night'], 'baby-puppy:sig': ['playground'],
    'teen-rabbit:idle': ['playground'], 'teen-rabbit:rope': ['playground'], 'teen-rabbit:jacks': ['day'], 'teen-rabbit:cheer': ['sports'], 'teen-rabbit:sleep': ['dusk'],
    'teen-cow:idle': ['day'], 'teen-cow:milk': ['day'], 'teen-cow:kick': ['sports'], 'teen-cow:charge': ['playground'], 'teen-cow:sleep': ['night', 'water'],
    'teen-puppy:idle': ['playground', 'swing'], 'teen-puppy:catch': ['day'], 'teen-puppy:dance': ['day'], 'teen-puppy:dig': ['playground'], 'teen-puppy:sleep': ['night'],
    'adult-cow:idle': ['water', 'ducks'], 'adult-cow:uke': ['day'], 'adult-cow:cart': ['playground'], 'adult-cow:paint': ['water'], 'adult-cow:sleep': ['dusk'],
    'adult-puppy:idle': ['water', 'ducks'], 'adult-puppy:ball': ['day'], 'adult-puppy:patrol': ['day'], 'adult-puppy:bubble': ['water'], 'adult-puppy:sleep': ['night', 'fire'],
    'adult-rabbit:idle': ['day'], 'adult-rabbit:magic': ['day'], 'adult-rabbit:garden': ['farm'], 'adult-rabbit:rescue': ['day'], 'adult-rabbit:sleep': ['dusk'],
  };
  const FILES = { day: 'amb_day.mp3', playground: 'amb_playground.mp3', water: 'amb_water.mp3', farm: 'amb_farm.mp3', sports: 'amb_sports.mp3', dusk: 'amb_dusk.mp3', night: 'amb_night.mp3', fire: 'amb_fire.mp3', applause: 'sfx_applause.mp3', sportsHit: 'sfx_cheer.mp3' };
  const buffers = {}, loading = {};
  function load(name) {
    if (buffers[name] !== undefined || loading[name] || !FILES[name]) return loading[name];
    loading[name] = fetch(FILES[name]).then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status)).then(b => ctx.decodeAudioData(b)).then(b => { buffers[name] = b; }).catch(() => { buffers[name] = null; });
    return loading[name];
  }
  function playFile(name, vol = 1) { if (!buffers[name]) { load(name); return false; } const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buffers[name]; g.gain.value = vol; s.connect(g); g.connect(bus.sfx); s.start(); return true; }
  let ambNodes = [], ambTimer = null, ambToken = 0;
  function stopAmb() { const t = T(); ambNodes.forEach(n => { try { n.g.gain.cancelScheduledValues(t); n.g.gain.setTargetAtTime(0.0001, t, 0.4); n.src.stop(t + 2); } catch (e) {} }); ambNodes = []; clearInterval(ambTimer); ambTimer = null; }
  const LOOPLEN = { day: 20, playground: 20, water: 20, farm: 14, sports: 20, dusk: 20, fire: 20, night: 11.494 };
  function trimLoop(src, buf, name) {   // mp3 adds encoder padding: loop exactly the cut length, starting where the sound starts
    const L = LOOPLEN[name]; if (!L) return; const d = buf.getChannelData(0); let i = 0; while (i < d.length && Math.abs(d[i]) < 1e-4 && i < buf.sampleRate * 0.1) i++;
    const st = i / buf.sampleRate; src.loopStart = st; src.loopEnd = Math.min(buf.duration, st + L);
  }
  function loopBuf(buf, vol, name) { const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf; src.loop = true; trimLoop(src, buf, name); g.gain.value = 0.0001; g.gain.setTargetAtTime(vol, T(), 0.6); src.connect(g); g.connect(bus.amb); src.start(T(), (src.loopStart || 0) + Math.random() * ((src.loopEnd || buf.duration) - (src.loopStart || 0))); ambNodes.push({ src, g }); }
  function synthBed(kind) {   // placeholder bed until the library files are in: soft wind + kind-specific dressing
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
    src.buffer = noiseBuf; src.loop = true; f.type = kind === 'water' ? 'bandpass' : 'lowpass'; f.frequency.value = kind === 'water' ? 1600 : 420; f.Q.value = kind === 'water' ? 0.6 : 0.7;
    l.frequency.value = 0.13; lg.gain.value = kind === 'water' ? 300 : 160; l.connect(lg); lg.connect(f.frequency); l.start();
    g.gain.value = 0.0001; g.gain.setTargetAtTime(kind === 'water' ? 0.12 : 0.16, T(), 0.8); src.connect(f); f.connect(g); g.connect(bus.amb); src.start();
    ambNodes.push({ src, g }, { src: l, g: lg });
  }
  function dressing(kind) {   // occasional point sounds on top of the bed
    const night = kind === 'night', dusk = kind === 'dusk';
    return () => {
      const r = Math.random();
      if (night) { for (let i = 0; i < 6; i++) tone({ f: 4400, dur: 0.03, vol: 0.02, at: i * 0.07, out: bus.amb }); }
      else if (dusk) { if (r < 0.5) tone({ f: rnd(1800, 2400), f2: rnd(1300, 1700), dur: 0.35, vol: 0.025, out: bus.amb }); }
      else if (r < 0.6) for (let i = 0; i < 3; i++) tone({ f: rnd(2600, 3400), f2: rnd(3500, 4300), dur: 0.07, vol: 0.025, at: i * 0.1, out: bus.amb });
    };
  }
  const EXTRA = { ducks: () => Math.random() < 0.5 && SND.quack(), animals: () => (Math.random() < 0.5 ? SND.baa() : SND.peep()), windmill: () => SND.creak(), swing: () => SND.creak(), water: () => {}, fire: () => noise({ type: 'bandpass', f: rnd(1500, 3000), q: 2, dur: 0.03, vol: 0.05 }) };
  async function setAmb(key) {
    if (!ctx) return; const tok = ++ambToken; stopAmb();
    const spec = AMB[key] || ['day']; const [bed, extra] = spec;
    await Promise.all([load(bed), extra === 'fire' || extra === 'water' ? load(extra) : null]);
    if (tok !== ambToken) return;
    if (buffers[bed]) loopBuf(buffers[bed], 0.9, bed); else synthBed(bed);
    if (extra && buffers[extra]) loopBuf(buffers[extra], 0.5, extra); else if (extra === 'water') synthBed('water');
    const dress = buffers[bed] ? null : dressing(bed);
    let n = 0; ambTimer = setInterval(() => { if (!on) return; n++; if (dress && n % 3 === 0) dress(); if (extra && EXTRA[extra] && !(buffers[extra] && extra === 'fire') && (extra === 'fire' ? true : n % 5 === 0)) EXTRA[extra](); }, extra === 'fire' && !buffers.fire ? 230 : 1000);
    LOG('amb:' + key + ':' + (buffers[bed] ? 'file' : 'synth'));
  }

  // ---------- music for moves that have a beat ----------
  let musicTimer = null;
  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
  function startDance(beat) {        // pupteen dance: 8 beats per bar, synced to the move start
    let i = 0; const bass = [48, 48, 55, 55, 53, 53, 55, 50];
    const tick = () => { if (!on) return; const b = i % 16; if (b % 2 === 0) { tone({ f: 120, f2: 50, dur: 0.12, vol: 0.25 }); tone({ f: NOTE(bass[(b / 2) % 8]), dur: beat * 0.9, type: 'triangle', vol: 0.1 }); } else noise({ type: 'highpass', f: 6000, dur: 0.04, vol: 0.05 }); i++; };
    tick(); musicTimer = setInterval(tick, beat * 500);
  }
  const UKE = [[60, 64, 67, 72], [55, 59, 62, 67], [57, 60, 64, 69], [53, 57, 60, 65]]; let ukeI = 0;

  // ---------- page hooks ----------
  const tags = new Map();
  let zI = 0;
  const api = {
    get on() { return on; }, log, S,
    tag(tex, name) { if (Array.isArray(tex)) tex.forEach(t => tags.set(t, name)); else if (tex) tags.set(tex, name); },
    tagWord(txt, tex) { tags.set(tex, 'word:' + txt); return tex; },
    setPet(p) { S.pet = p; },
    move(name, sceneKey) {
      S.move = name; S.moveT0 = performance.now(); S.hero = false; S.flash = 0; stopMusic();
      if (sceneKey !== S.sceneKey) { S.sceneKey = sceneKey; if (on) setAmb(sceneKey); }
      if (!on) return;
      if (S.page === 'teen-puppy' && name === 'dance') startDance(0.5);
    },
    // spawned sprites (stars, hearts, z, tears…) — only for pages without named events, except z
    fx(map) {
      if (!on) return; const n = tags.get(map); if (!n) return;
      if (n === 'z') { if (gate('z', 1.0)) { SND.snore(zI++); LOG('snore'); } return; }
      if (S.hasEvents) return;
      const m = S.move;
      if (n === 'heart' && gate('heart', 0.5)) { SND.heart(); voice('happy'); LOG('heart'); }
      else if (n === 'star' && gate('star', 0.5)) { SND.twinkle(); if (m === 'sig' && S.pet === 'puppy') { SND.dizzy(); } else if (m === 'rope') voice('laugh'); LOG('star'); }
      else if (n === 'tear' && gate('tear', 2.5)) { voice('cry'); LOG('tear'); }
      else if (n === 'dust' && gate('dust', 1.0)) { SND.thud(0.8); setTimeout(() => voice('ouch'), 120); LOG('dust'); }
      else if (n === 'note' && gate('note', 0.6)) { voice('happy'); LOG('note'); }
      else if (n === 'num' && gate('num', 0.3)) { SND.whistle(1); LOG('num'); }
      else if (n === 'conf' && gate('conf', 0.8)) { SND.popper(); LOG('conf'); }
    },
    confetti(n) { if (!on) return; if (n >= 12 && gate('bigconf', 1.2)) { SND.popper(); if (S.page === 'teen-rabbit') { voice('happy'); SND.crowd(); } LOG('bigconf'); } },
    word(tex) {
      if (!on) return; const n = tags.get(tex); if (!n || !n.startsWith('word:')) return; const w = n.slice(5); LOG('word:' + w);
      const W = {
        'GOAL!': () => { SND.longWhistle(); SND.crowd(); voice('happy'); }, '乾杯！': () => { SND.clink(); voice('happy'); },
        '接到了！': () => voice('happy'), '找到了！': () => { SND.chime(); voice('happy'); }, '請你吃！': () => voice('happy'), '完成！': () => { SND.tada(); voice('happy'); },
        '疊起來！': () => voice('happy'), '接住！': () => voice('happy'), '完美！': () => { SND.chime(); voice('happy'); }, '謝謝！': () => voice('happy'),
        '公園乾淨！': () => { SND.chime(); voice('happy'); }, '還有胡蘿蔔！': () => voice('laugh'), '開花囉！': () => voice('happy'), '兔子超人！': () => voice('hero'),
        '守護公園！': () => { SND.fanfare(); voice('hero'); }, '哇啊！': () => { SND.scream(); }, '！': () => { SND.boing(0.5); voice('surprised'); }, '+1': () => SND.coin(),
      };
      (W[w] || (() => {}))();
    },
    events(list) {
      if (!on || !list || !list.length) return;
      for (const e of list) {
        const k = S.page + ':' + e, fn = EV[k] || EV[e] || (/^thud\d/.test(e) ? () => SND.clack() : null); if (!fn) continue; if (!gate('ev:' + e, 0.12)) continue; LOG('ev:' + e); fn();
      }
    },
    track(rig) { S.rig = rig; },
    async enable(v) {
      on = v; if (v) { init(); if (!ctx) { on = false; return; } await ctx.resume(); S.sceneKey && setAmb(S.sceneKey); if (S.page === 'teen-puppy' && S.move === 'dance') startDance(0.5); }
      else { if (ctx) { stopAmb(); stopMusic(); ctx.suspend(); } }
      save(); paint();
    },
    setVol(k, v) { VOL[k] = v; if (bus[k]) bus[k].gain.setTargetAtTime(v, T(), 0.05); save(); },
    play(n, ...a) { if (on && SND[n]) SND[n](...a); }, voice(k) { if (on) voice(k); },
    _test: { init() { init(); on = true; }, SND, voice, S, names: () => Object.keys(SND) },
  };
  const EV = {
    // teen cow
    'teen-cow:kick': () => SND.kick(), 'teen-cow:gulp': () => SND.gulp(), 'teen-cow:ahh': () => voice('ahh'), 'teen-cow:steam': () => { SND.steam(); voice('call'); },
    'teen-cow:scrape': () => SND.scrape(), 'teen-cow:dashdust': () => SND.whoosh(1.2), 'teen-cow:crash': () => SND.crash(), 'teen-cow:yay': () => voice('happy'), 'teen-cow:brake': () => SND.skid(),
    // teen puppy
    'teen-puppy:throw': () => SND.whoosh(), 'teen-puppy:catch': () => { SND.clack(); }, 'teen-puppy:clap': () => SND.clap(1), 'teen-puppy:note': () => {},
    'teen-puppy:sniff': () => SND.sniff(), 'teen-puppy:dirt': () => SND.dig(), 'teen-puppy:hearts': () => { SND.heart(); voice('happy'); }, 'teen-puppy:tada': () => { SND.tada(); voice('call'); }, 'teen-puppy:found': () => {}, 'teen-puppy:bang': () => {},
    // adult cow
    'adult-cow:note': () => { const ch = UKE[ukeI++ % 4]; ch.forEach((n, i) => pluck(NOTE(n), i * 0.018, 0.16)); }, 'adult-cow:chirp': () => SND.chirp(), 'adult-cow:land': () => SND.flutter(),
    'adult-cow:moo': () => voice('moo'), 'adult-cow:clap': () => SND.applause(1.6), 'adult-cow:ding': () => SND.ding(), 'adult-cow:treat': () => SND.sparkle(), 'adult-cow:scoop': () => SND.scoop(),
    'adult-cow:dab': () => SND.brush(), 'adult-cow:think': () => voice('think'), 'adult-cow:done': () => {}, 'adult-cow:nod': () => {},
    // adult puppy
    'adult-puppy:catch': () => SND.hop(0.8), 'adult-puppy:stack': () => SND.clack(), 'adult-puppy:catchB': () => SND.hop(0.8), 'adult-puppy:boing': () => SND.boing(0.7), 'adult-puppy:hook': () => SND.kick(),
    'adult-puppy:poofB': () => SND.poof(), 'adult-puppy:perfect': () => {}, 'adult-puppy:bow': () => SND.applause(2.2), 'adult-puppy:spot': () => {}, 'adult-puppy:grab': () => SND.clack(), 'adult-puppy:plus': () => {},
    'adult-puppy:clean': () => {}, 'adult-puppy:blow': () => noise({ type: 'bandpass', f: 900, dur: 0.5, vol: 0.06, a: 0.15 }), 'adult-puppy:mini': () => SND.bubble(), 'adult-puppy:pop': () => SND.pop(), 'adult-puppy:popBig': () => { SND.bigPop(); SND.splash(); },
    // adult rabbit
    'adult-rabbit:glint': () => SND.glint(), 'adult-rabbit:tap': () => SND.tap(), 'adult-rabbit:poof': () => SND.poof(), 'adult-rabbit:tada': () => { SND.tada(); voice('happy'); }, 'adult-rabbit:pop': () => SND.pop(),
    'adult-rabbit:boing': () => SND.boing(), 'adult-rabbit:plop': () => SND.hop(), 'adult-rabbit:ribbon': () => SND.popper(), 'adult-rabbit:bow': () => SND.applause(2.2), 'adult-rabbit:sparkle': () => { SND.grow(); SND.sparkle(0.7); },
    'adult-rabbit:allBloom': () => SND.chime(), 'adult-rabbit:spot': () => {}, 'adult-rabbit:flash': () => { SND.transform(); S.flash++; S.hero = S.flash % 2 === 1; }, 'adult-rabbit:heroName': () => SND.fanfare(),
    'adult-rabbit:land': () => SND.bigStomp(), 'adult-rabbit:stomp': () => SND.bigStomp(), 'adult-rabbit:scared': () => {}, 'adult-rabbit:safe': () => {}, 'adult-rabbit:wandAway': () => SND.swish(), 'adult-rabbit:wandBack': () => SND.swish(),
  };

  // ---------- motion tracking: landings, take-offs, footsteps, spins (pages without event timelines) ----------
  let py = null, vy = 0, px = null, pz = null, pry = null, stepAcc = 0, spinAcc = 0, lastNow = performance.now(), air = false;
  function frame() {
    requestAnimationFrame(frame);
    const now = performance.now(), dt = Math.min((now - lastNow) / 1000, 0.1); lastNow = now; if (!on || !S.rig || dt <= 0) return;
    const r = S.rig, y = r.position.y, x = r.position.x, z = r.position.z, ry = r.rotation.y;
    if (S.page === 'teen-rabbit' && S.move === 'rope') { const n = Math.floor((now - S.moveT0) / 1000 / 0.29); if (n !== S.ropeN) { S.ropeN = n; if (n % 2) SND.swish(); else SND.land(0.45); LOG(n % 2 ? 'rope-swish' : 'rope-land'); } }   // ph 0 = landing, ph 0.5 = rope passes under the feet
    if (py !== null && S.autoLand && S.move !== 'sleep' && S.move !== 'rope') {
      const v = (y - py) / dt;
      if (!air && y > 0.07 && v > 0.4) { air = true; if (S.move === 'rope') SND.swish(); else if (S.move === 'binky' || S.move === 'jacks' || S.move === 'cheer') SND.hop(0.7); LOG('takeoff'); }
      if (air && y < 0.03) { air = false; SND.land(S.stage === 'baby' ? 0.7 : 1); LOG('land'); }
      const sp = Math.hypot(x - px, z - pz) / dt;
      if (sp > 0.25 && y < 0.05) { stepAcc += dt; if (stepAcc > (S.stage === 'baby' ? 0.22 : 0.3)) { stepAcc = 0; SND.step(); } }
      let d = ry - pry; if (Math.abs(d) < 1) { spinAcc += Math.abs(d); if (spinAcc > Math.PI && Math.abs(d / dt) > 4) { spinAcc = 0; SND.whoosh(0.7); LOG('spin'); } }
      if (Math.abs(d / dt) < 1) spinAcc = 0;
    }
    py = y; px = x; pz = z; pry = ry;
  }
  requestAnimationFrame(frame);

  // ---------- UI: small round sound button; the volume panel closes itself after 2 s without touch ----------
  let btn = null, panel = null, offBtn = null, hideTimer = null, holding = false;
  const HIDE_MS = 2000;
  function openPanel(v) { if (!panel) return; panel.hidden = !v; btn.setAttribute('aria-expanded', String(v)); clearTimeout(hideTimer); if (v) armHide(); }
  function armHide() { clearTimeout(hideTimer); hideTimer = setTimeout(() => { if (holding) return armHide(); openPanel(false); }, HIDE_MS); }
  function paint() { if (!btn) return; btn.textContent = on ? '🔊' : '🔇'; btn.setAttribute('aria-pressed', String(on)); btn.setAttribute('aria-label', on ? '聲音設定' : '開啟聲音'); btn.title = on ? '聲音設定' : '開啟聲音'; if (!on) openPanel(false); }
  if (opt.stageEl) {
    const st = document.createElement('style'); st.textContent = `.sfx-ui{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;align-items:flex-end;gap:6px;z-index:5}
.sfx-ui .sfx-btn{width:36px;height:36px;border-radius:50%;border:1px solid var(--line,#ccc);background:var(--surface,#fff);color:var(--fg,#222);font-size:17px;line-height:1;padding:0;cursor:pointer;opacity:.85}
.sfx-ui .sfx-btn[aria-pressed="true"]{background:var(--spark,#f6c445);border-color:transparent;opacity:1}
.sfx-ui .sfx-btn:focus-visible,.sfx-ui .sfx-off:focus-visible{outline:3px solid var(--grass,#5aa94b);outline-offset:2px}
.sfx-ui .vol{background:var(--surface,#fff);border:1px solid var(--line,#ccc);border-radius:12px;padding:8px 10px;font-size:12px;display:grid;grid-template-columns:auto 90px;gap:6px 8px;align-items:center;color:var(--fg,#222);box-shadow:0 4px 14px rgba(0,0,0,.12);animation:sfxIn .15s ease-out}
.sfx-ui .vol[hidden]{display:none}
.sfx-ui input{width:90px;margin:0}
.sfx-ui .sfx-off{grid-column:1/-1;min-height:30px;border-radius:99px;border:1px solid var(--line,#ccc);background:transparent;color:var(--fg,#222);font:inherit;font-size:12px;cursor:pointer}
@keyframes sfxIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.sfx-ui .vol{animation:none}}`; document.head.appendChild(st);
    const ui = document.createElement('div'); ui.className = 'sfx-ui';
    btn = document.createElement('button'); btn.type = 'button'; btn.id = 'sfxToggle'; btn.className = 'sfx-btn'; btn.setAttribute('aria-controls', 'sfxPanel');
    panel = document.createElement('div'); panel.className = 'vol'; panel.id = 'sfxPanel'; panel.hidden = true;
    [['sfx', '音效'], ['voice', '叫聲'], ['amb', '環境']].forEach(([k, l]) => { const lab = document.createElement('label'); lab.textContent = l; lab.htmlFor = 'vol-' + k; const inp = document.createElement('input'); inp.type = 'range'; inp.min = 0; inp.max = 1; inp.step = 0.05; inp.value = VOL[k]; inp.id = 'vol-' + k; inp.addEventListener('input', () => { api.setVol(k, +inp.value); armHide(); }); panel.append(lab, inp); });
    offBtn = document.createElement('button'); offBtn.type = 'button'; offBtn.className = 'sfx-off'; offBtn.id = 'sfxOff'; offBtn.textContent = '關閉聲音'; panel.append(offBtn);
    ui.append(btn, panel); opt.stageEl.appendChild(ui);
    // any touch on the button or the panel keeps it open for another 2 s; holding a slider keeps it open until released
    ['pointerdown', 'pointermove', 'keydown', 'wheel'].forEach(ev => ui.addEventListener(ev, e => { e.stopPropagation(); if (!panel.hidden) armHide(); }));
    ui.addEventListener('pointerdown', () => { holding = true; }); window.addEventListener('pointerup', () => { if (holding) { holding = false; if (!panel.hidden) armHide(); } });
    ui.addEventListener('click', e => e.stopPropagation());
    btn.addEventListener('click', async () => { if (!on) { await api.enable(true); openPanel(true); } else openPanel(panel.hidden); });
    offBtn.addEventListener('click', () => { api.enable(false); btn.focus(); });
    paint();
    if (S.want) { const wake = (e) => { window.removeEventListener('pointerdown', wake, true); if (e && ui.contains(e.target)) return; if (!on) api.enable(true); }; window.addEventListener('pointerdown', wake, true); }
  }
  window.__sfx = api;
  return api;
}
