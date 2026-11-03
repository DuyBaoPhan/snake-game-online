import { storage as defaultStorage } from './storage.js';
export class AudioManager {
  constructor(storage = defaultStorage) { this.storage = storage; this.enabled = storage.get('sound', true) !== false; this.context = null; }
  unlock() {
    try {
      const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!this.context && AudioContext) this.context = new AudioContext();
      if (this.context?.state === 'suspended') this.context.resume()?.catch(() => {});
    } catch { /* Audio is an optional enhancement. */ }
  }
  setEnabled(enabled) { this.enabled = Boolean(enabled); this.storage.set('sound', this.enabled); }
  play(kind) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    try {
      const ctx = this.context, oscillator = ctx.createOscillator(), gain = ctx.createGain();
      const now = ctx.currentTime, duration = kind === 'end' ? 0.32 : 0.10;
      oscillator.type = kind === 'end' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(kind === 'end' ? 220 : 620, now);
      oscillator.frequency.exponentialRampToValueAtTime(kind === 'end' ? 65 : 1000, now + duration);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(gain); gain.connect(ctx.destination);
      oscillator.start(now); oscillator.stop(now + duration);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch { /* Unsupported or interrupted audio must never affect play. */ }
  }
}
export const audio = new AudioManager();
