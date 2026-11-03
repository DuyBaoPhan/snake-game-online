import { storage as defaultStorage } from './storage.js';
const DEMO_ENTRIES = Object.freeze([
  { name: 'NEON VIPER', score: 480, avatar: 'NV' },
  { name: 'PIXEL KING', score: 360, avatar: 'PK' },
  { name: 'SNAKE BYTE', score: 290, avatar: 'SB' },
  { name: 'GHOST', score: 210, avatar: 'GH' },
  { name: 'NOVA', score: 170, avatar: 'NO' },
]);
// Demonstration data only. No network requests or claims of live multiplayer.
export class LeaderboardService {
  constructor(storage = defaultStorage) { this.storage = storage; this.isDemo = true; }
  async getTop() {
    const best = this.storage.getBest();
    const entries = DEMO_ENTRIES.map(entry => ({ ...entry, isYou: false }));
    if (best > 0) entries.push({ name: 'YOU', score: best, avatar: 'YO', isYou: true });
    return entries.sort((a, b) => b.score - a.score).slice(0, 5).map((entry, index) => ({ ...entry, rank: index + 1 }));
  }
  async submit(score) {
    if (Number.isFinite(score) && score > this.storage.getBest()) this.storage.setBest(score);
    return this.getTop();
  }
}
export const leaderboard = new LeaderboardService();

/** Same-origin API adapter. No Supabase keys or guest IDs are exposed to scripts. */
export class OnlineLeaderboardService {
  constructor(request = globalThis.fetch.bind(globalThis)) { this.request = request; }
  async call(path, body) {
    const response = await this.request(`/api/${path}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
      headers: body === undefined ? {} : {'Content-Type':'application/json'},
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    let data;
    try { data = await response.json(); } catch { const error = new Error('Online API unavailable'); error.status = import.meta.env?.DEV && !response.headers?.get('content-type')?.includes('application/json') ? 404 : 502; throw error; }
    if (!response.ok) {
      const error = new Error(data.error || 'Online service unavailable. Please try again.');
      error.status = response.status; throw error;
    }
    return data;
  }
  async getTop() { const data = await this.call('leaderboard'); if (!Array.isArray(data.entries)) throw new Error('Invalid leaderboard response'); return data.entries; }
  async getGuest() { return this.call('guest'); }
  async setGuest(name) { return this.call('guest', {name}); }
  async submit(score, elapsed) { return this.call('scores', {score,elapsed}); }
}

