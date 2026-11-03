const PREFIX = 'snake-arena:';
export class StorageManager {
  constructor(storage) {
    try { this.storage = storage === undefined ? (typeof window !== 'undefined' ? window.localStorage : null) : storage; } catch { this.storage = null; }
    this.memory = new Map();
  }
  get(key, fallback = null) {
    try {
      const raw = this.storage?.getItem(PREFIX + key) ?? this.memory.get(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  }
  set(key, value) {
    try { const raw = JSON.stringify(value); this.memory.set(key, raw); this.storage?.setItem(PREFIX + key, raw); return true; } catch { return false; }
  }
  getBest() { const value = this.get('best', 0); return Number.isFinite(value) && value >= 0 ? value : 0; }
  setBest(score) { if (Number.isFinite(score) && score >= 0) this.set('best', score); }
}
export const storage = new StorageManager();

