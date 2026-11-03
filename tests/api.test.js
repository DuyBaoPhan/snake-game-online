import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import guest from '../api/guest.js';
import leaderboard from '../api/leaderboard.js';
import scores from '../api/scores.js';
import { session } from '../server/api.js';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
beforeEach(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'server-only-key';
  process.env.GUEST_SESSION_SECRET = 'a-secret-at-least-thirty-two-characters-long';
});
afterEach(() => { globalThis.fetch = originalFetch; process.env = { ...originalEnv }; });
async function request(handler, { method = 'GET', body, cookie, headers = {} } = {}) {
  const req = { method, body, headers: { host: 'game.example', origin: 'https://game.example', 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...headers } };
  const res = { headers: {}, setHeader(key, value) { this.headers[key.toLowerCase()] = value; }, end(value) { this.data = JSON.parse(value); } };
  await handler(req, res);
  return res;
}
async function createGuest(name = 'Player') {
  const result = await request(guest, { method: 'POST', body: { name } });
  assert.equal(result.statusCode, 200);
  return result.headers['set-cookie'].split(';')[0];
}
test('guest session is signed, restored and name changes preserve identity', async () => {
  const cookie = await createGuest('  Player  ');
  assert.equal((await request(guest, { cookie })).data.name, 'Player');
  const before = session({ headers: { cookie } }, process.env.GUEST_SESSION_SECRET);
  const changed = await request(guest, { method: 'POST', cookie, body: { name: 'New name' } });
  const after = session({ headers: { cookie: changed.headers['set-cookie'] } }, process.env.GUEST_SESSION_SECRET);
  assert.equal(before.id, after.id);
  assert.equal(after.name, 'New name');
  assert.match(changed.headers['set-cookie'], /HttpOnly; SameSite=Strict/);
  assert.equal(changed.headers['cache-control'], 'no-store');
});
test('missing, tampered and expired cookies are unauthorized', async () => {
  assert.equal((await request(guest)).statusCode, 401);
  const cookie = await createGuest();
  assert.equal((await request(guest, { cookie: cookie.slice(0, -1) + '!' })).statusCode, 401);
  assert.equal((await request(guest, { cookie: cookie.slice(0, -43) + 'é'.repeat(43) })).statusCode, 401);
  const now = Date.now;
  try {
    Date.now = () => now() + 31 * 86400000;
    assert.equal((await request(guest, { cookie })).statusCode, 401);
  } finally { Date.now = now; }
});
test('production sessions are Secure and misconfiguration fails closed', async () => {
  process.env.NODE_ENV = 'production';
  assert.match((await request(guest, { method: 'POST', body: { name: 'Player' } })).headers['set-cookie'], /; Secure/);
  process.env.GUEST_SESSION_SECRET = 'short';
  assert.equal((await request(guest)).statusCode, 503);
});
test('methods, origin, JSON and names are validated', async () => {
  assert.equal((await request(guest, { method: 'DELETE' })).statusCode, 405);
  for (const origin of [undefined, 'https://evil.example', 'null']) {
    assert.equal((await request(guest, { method: 'POST', headers: { origin }, body: { name: 'Valid' } })).statusCode, 403);
  }
  for (const name of ['', 'x'.repeat(25), '\n', 'a\u0000', 12]) {
    assert.equal((await request(guest, { method: 'POST', body: { name } })).statusCode, 400);
  }
  assert.equal((await request(guest, { method: 'POST', body: '{' })).statusCode, 400);
  assert.equal((await request(guest, { method: 'POST', body: { name: 'x'.repeat(2000) } })).statusCode, 413);
  assert.equal((await request(guest, { method: 'POST', body: {}, headers: { 'content-type': 'text/plain' } })).statusCode, 415);
});
test('leaderboard returns rank/name/score without exposing identifiers', async () => {
  globalThis.fetch = async (url, options) => {
    assert.match(url, /order=best_score.desc,achieved_at.asc,player_id.asc&limit=5/);
    assert.equal(options.headers.Authorization, 'Bearer server-only-key');
    return { ok: true, json: async () => [{ display_name: 'Winner', best_score: 90 }] };
  };
  assert.deepEqual((await request(leaderboard)).data, { entries: [{ rank: 1, name: 'Winner', score: 90 }], mode: 'online' });
});
test('score submission uses authenticated identity and atomic RPC', async () => {
  const cookie = await createGuest();
  globalThis.fetch = async (url, options) => {
    assert.match(url, /\/rpc\/submit_guest_score$/);
    assert.deepEqual(Object.keys(JSON.parse(options.body)).sort(), ['p_display_name', 'p_player_id', 'p_score']);
    assert.equal(JSON.parse(options.body).p_score, 100);
    return { ok: true, json: async () => 200 };
  };
  const result = await request(scores, { method: 'POST', cookie, body: { score: 100, elapsed: 1000 } });
  assert.deepEqual(result.data, { saved: true, bestScore: 200 });
});
test('invalid scores and implausibly fast games never reach the database', async () => {
  const cookie = await createGuest();
  globalThis.fetch = () => { throw new Error('should not be called'); };
  for (const body of [{ score: -10, elapsed: 1000 }, { score: 11, elapsed: 1000 }, { score: 5740, elapsed: 99999 }, { score: 100, elapsed: 1 }, { score: '100', elapsed: 1000 }, { score: 10, elapsed: -1 }, { score: 10 }]) {
    assert.equal((await request(scores, { method: 'POST', cookie, body })).statusCode, 400);
  }
  assert.equal((await request(scores, { method: 'POST', body: { score: 0, elapsed: 0 } })).statusCode, 401);
});
test('upstream failure, invalid RPC response and cooldown are handled without secret disclosure', async () => {
  const cookie = await createGuest();
  const run = () => request(scores, { method: 'POST', cookie, body: { score: 10, elapsed: 1000 } });
  globalThis.fetch = async () => ({ ok: false, json: async () => ({ code: 'P0001', message: 'submission_cooldown' }) });
  assert.equal((await run()).statusCode, 429);
  globalThis.fetch = async () => ({ ok: true, json: async () => 0 });
  assert.equal((await run()).statusCode, 502);
  globalThis.fetch = async () => { throw new Error('server-only-key'); };
  const result = await run();
  assert.equal(result.statusCode, 502);
  assert.doesNotMatch(JSON.stringify(result.data), /server-only-key/);
});

