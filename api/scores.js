import { endpoint, config, session, body, database, respond, ApiError } from '../server/api.js';
export default endpoint(['POST'], async (req, res) => {
  const guest = session(req, config().secret);
  if (!guest) throw new ApiError(401, 'Guest session required.');
  const { score, elapsed } = await body(req);
  // Elapsed is milliseconds of active gameplay. Even at maximum speed, food
  // cannot be eaten more often than once per tick (18 ticks per second).
  if (!Number.isInteger(score) || score < 0 || score > 5730 || score % 10 !== 0 || typeof elapsed !== 'number' || !Number.isFinite(elapsed) || elapsed < 0 || elapsed > 86_400_000 || score / 10 > Math.floor(elapsed * 18 / 1000)) throw new ApiError(400, 'Invalid score or elapsed duration.');
  const bestScore = await database('rpc/submit_guest_score', { method: 'POST', payload: { p_player_id: guest.id, p_display_name: guest.name, p_score: score } });
  if (!Number.isInteger(bestScore) || bestScore < score || bestScore > 5730) throw new ApiError(502, 'Invalid score response.');
  respond(res, 200, { saved: true, bestScore });
});
