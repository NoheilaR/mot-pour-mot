let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function playDing() {
  try {
    const c = getCtx();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.06);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    osc.start(t); osc.stop(t + 0.55);
  } catch (_) {}
}

export function playWrong() {
  try {
    const c = getCtx();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.25);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.start(t); osc.stop(t + 0.25);
  } catch (_) {}
}

export function playBuzzer() {
  try {
    const c = getCtx();
    const t = c.currentTime;
    for (const [freq, vol] of [[150, 0.18], [230, 0.12], [310, 0.08]]) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain); gain.connect(c.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.start(t); osc.stop(t + 0.55);
    }
  } catch (_) {}
}

// n = 3, 2, 1 — montée progressive vers le go
export function playCountdownBeep(n) {
  try {
    const c = getCtx();
    const t = c.currentTime;
    const freqs = { 3: 440, 2: 554, 1: 698 };
    const freq = freqs[n] ?? 440;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.start(t); osc.stop(t + 0.18);
  } catch (_) {}
}
