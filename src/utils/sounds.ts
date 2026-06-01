let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "square",
  volume: number = 0.1,
) {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

export function playStartSound(volume: number = 1) {
  const v = 0.1 * volume;
  playTone(523, 0.15, "square", v); // C5
  setTimeout(() => playTone(659, 0.15, "square", v), 100); // E5
}

export function playCompleteSound(volume: number = 1) {
  const v = 0.1 * volume;
  playTone(523, 0.1, "square", v); // C5
  setTimeout(() => playTone(659, 0.1, "square", v), 80); // E5
  setTimeout(() => playTone(784, 0.2, "square", v), 160); // G5
}

export function playErrorSound(volume: number = 1) {
  const v = 0.1 * volume;
  playTone(200, 0.3, "sawtooth", v);
}

export function playApprovalSound(volume: number = 1) {
  const v = 0.1 * volume;
  playTone(440, 0.1, "square", v); // A4
  setTimeout(() => playTone(554, 0.15, "square", v), 80); // C#5
}

export function playSubmitSound(volume: number = 1) {
  const v = 0.1 * volume;
  playTone(660, 0.08, "square", v);
}
