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
