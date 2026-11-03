# Guest leaderboard API

Deploy the root `api` directory as Vercel Node functions. All endpoints are same-origin, return JSON, and send `Cache-Control: no-store`. No browser Supabase client is needed.

## Setup

1. Apply `supabase/guest-leaderboard.sql` in the Supabase SQL Editor. It preserves the existing `player_scores` table and rows, creates a cooldown table and a narrowly granted atomic RPC. Review existing table grants/policies: the migration enables RLS and revokes client write privileges; the application reads through its server secret only.
2. Set **server-only** Vercel environment variables (never prefix with `VITE_`):
   - `SUPABASE_URL`: project HTTPS URL.
   - `SUPABASE_SECRET_KEY`: Supabase secret key (`sb_secret_…`) or legacy service-role JWT, never an anon key.
   - `GUEST_SESSION_SECRET`: cryptographically random secret, at least 32 characters. Generate using `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Rotation logs out current guests.
3. Redeploy after changing environment variables. Production cookies require HTTPS.

## Contract

| Endpoint | Input | Successful response |
| --- | --- | --- |
| `GET /api/guest` | Signed cookie | `{ "name": "Player" }` |
| `POST /api/guest` | `{ "name": "Player" }` | `{ "name": "Player" }` and session cookie |
| `GET /api/leaderboard` | None | `{ "entries": [{ "rank": 1, "name": "Player", "score": 100 }], "mode": "online" }` |
| `POST /api/scores` | `{ "score": 100, "elapsed": 5000 }` | `{ "saved": true, "bestScore": 100 }` |

- `elapsed` means active gameplay **milliseconds**, excluding pauses, between 0 and 86,400,000. Score must be an integer, 0–5730, divisible by 10. Food count cannot exceed `floor(elapsed * 18 / 1000)`.
- Names are trimmed, 1–24 Unicode code points, without ASCII control characters. Frontend must render names with `textContent`, never HTML.
- Top 5 entries sort by descending best score, then earliest achievement, then UUID. Names are updated on the next accepted score submission; changing a name preserves the existing signed player identity. Lower/equal scores never lower the stored best or reset achievement time.
- POST requests require JSON, a matching `Origin`/`Host`, and a body no larger than 1024 bytes. Browser same-origin fetch sends the required Origin and cookie; no custom credentials/token header is needed.
- Session lifetime is 30 days; cookie is HttpOnly, SameSite=Strict, Path=/ and Secure on Vercel/production. GET guest and POST scores return 401 for missing/invalid/expired sessions.
- Error responses have `{ "error": "message" }`. Expected statuses include 400 invalid input, 401 missing session, 403 wrong/missing origin, 405 method, 413 body size, 415 content type, 429 per-player 1-second score cooldown, 502 database failure, and 503 missing configuration. Failed online requests must not be presented as successfully saved.
- Database requests time out after 5 seconds. Secrets and upstream error details are never returned.

## Security limits

This is a casual guest leaderboard, **not robust anti-cheat**. A client can forge both score and elapsed duration; the check only rejects obviously impossible inputs. Users may clear cookies/create additional guests, and guest names are not unique or verified. Signed cookies protect identity from modification, not from sharing or theft. Losing the cookie loses access to that guest identity. Add platform/IP rate limiting and abuse monitoring before public launch; the database cooldown is durable per player but cannot stop guest creation abuse. No in-memory rate limiter is claimed to work across serverless instances.

Tests use mocked HTTP/database requests; they do not replace applying and integration-testing the SQL on the target project.

