export const STATES = Object.freeze({ READY: 'ready', PLAYING: 'playing', PAUSED: 'paused', OVER: 'over', WON: 'won' });
export function scoreFor(foods) { return foods * 10; }
export function levelFor(foods) { return Math.floor(foods / 5) + 1; }
export function speedFor(level) { return Math.min(18, 7 + (level - 1) * 1.2); }
