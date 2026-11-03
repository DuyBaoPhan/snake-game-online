import { endpoint, database, respond, ApiError } from '../server/api.js';
export default endpoint(['GET'], async (req, res) => {
  const rows = await database('player_scores?select=display_name,best_score&order=best_score.desc,achieved_at.asc,player_id.asc&limit=5');
  if (!Array.isArray(rows) || rows.some(row => typeof row.display_name !== 'string' || !Number.isInteger(row.best_score))) throw new ApiError(502, 'Invalid leaderboard response.');
  respond(res, 200, { entries: rows.map((row, index) => ({ rank: index + 1, name: row.display_name, score: row.best_score })), mode: 'online' });
});

