import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const COOKIE = 'snake_guest';
const SESSION_SECONDS = 60 * 60 * 24 * 30;
export function config() {
  const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: key, GUEST_SESSION_SECRET: secret } = process.env;
  if (!url || !key || !secret || secret.length < 32) throw new ApiError(503, 'Leaderboard is not configured.');
  let parsed;
  try { parsed = new URL(url); } catch { throw new ApiError(503, 'Leaderboard is not configured.'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new ApiError(503, 'Leaderboard is not configured.');
  return { url: url.replace(/\/$/, ''), key, secret };
}
export function respond(res, status, data) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = status;
  res.end(JSON.stringify(data));
}
export function endpoint(methods, handler) {
  return async (req, res) => {
    try {
      if (!methods.includes(req.method)) {
        res.setHeader('Allow', methods.join(', '));
        throw new ApiError(405, 'Method not allowed.');
      }
      if (req.method === 'POST') {
        const origin = req.headers.origin;
        const host = req.headers.host;
        let parsed;
        try { parsed = new URL(origin); } catch { throw new ApiError(403, 'Same-origin request required.'); }
        if (!host || parsed.host !== host || !['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) throw new ApiError(403, 'Same-origin request required.');
      }
      await handler(req, res);
    } catch (error) {
      respond(res, error instanceof ApiError ? error.status : 500, { error: error instanceof ApiError ? error.message : 'Internal server error.' });
    }
  };
}
export async function body(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) throw new ApiError(415, 'JSON content type required.');
  const length = Number(req.headers['content-length']);
  if (length > 1024) throw new ApiError(413, 'Request too large.');
  let value = req.body;
  if (value === undefined) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += Buffer.byteLength(chunk);
      if (size > 1024) throw new ApiError(413, 'Request too large.');
      chunks.push(Buffer.from(chunk));
    }
    value = Buffer.concat(chunks).toString('utf8');
  }
  if (Buffer.isBuffer(value)) value = value.toString('utf8');
  if (typeof value === 'string') {
    if (Buffer.byteLength(value) > 1024) throw new ApiError(413, 'Request too large.');
    try { value = JSON.parse(value); } catch { throw new ApiError(400, 'Invalid JSON.'); }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'Expected a JSON object.');
  if (Buffer.byteLength(JSON.stringify(value)) > 1024) throw new ApiError(413, 'Request too large.');
  return value;
}
export function validName(value) {
  if (typeof value !== 'string') throw new ApiError(400, 'Name must contain 1–24 characters.');
  const name = value.trim();
  if (!name || [...name].length > 24 || /[\u0000-\u001f\u007f]/u.test(name)) throw new ApiError(400, 'Name must contain 1–24 characters without control characters.');
  return name;
}
function signature(payload, secret) { return createHmac('sha256', secret).update(payload).digest('base64url'); }
export function session(req, secret) {
  const cookie = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`));
  if (!cookie) return null;
  const token = cookie.slice(COOKIE.length + 1);
  if (token.length > 1024) return null;
  const [payload, sig, extra] = token.split('.');
  if (!payload || !sig || !/^[A-Za-z0-9_-]{43}$/.test(sig) || extra !== undefined) return null;
  const expected = signature(payload, secret);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id) || !Number.isInteger(data.exp) || data.exp <= Date.now() / 1000 || validName(data.name) !== data.name) return null;
    return data;
  } catch { return null; }
}
export function issueSession(res, previous, name, secret) {
  const data = { id: previous?.id || randomUUID(), name, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS };
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  res.setHeader('Set-Cookie', `${COOKIE}=${payload}.${signature(payload, secret)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${process.env.NODE_ENV === 'production' || process.env.VERCEL ? '; Secure' : ''}`);
}
export async function database(path, { method = 'GET', payload } = {}) {
  const { url, key } = config();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers: { apikey: key, ...(!key.startsWith('sb_secret_') ? { Authorization: `Bearer ${key}` } : {}), 'Content-Type': 'application/json' },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      signal: controller.signal,
    });
    if (!response.ok) {
      let detail;
      try { detail = await response.json(); } catch { /* Do not expose upstream responses. */ }
      if (detail?.code === 'P0001' && detail?.message === 'submission_cooldown') throw new ApiError(429, 'Please wait a moment before submitting again.');
      throw new ApiError(502, 'Leaderboard is temporarily unavailable.');
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, 'Leaderboard is temporarily unavailable.');
  } finally { clearTimeout(timer); }
}


