import { endpoint, config, session, body, validName, issueSession, respond, ApiError } from '../server/api.js';
export default endpoint(['GET', 'POST'], async (req, res) => {
  const { secret } = config();
  const previous = session(req, secret);
  if (req.method === 'GET') {
    if (!previous) throw new ApiError(401, 'Guest session required.');
    return respond(res, 200, { name: previous.name });
  }
  const input = await body(req);
  const name = validName(input.name);
  issueSession(res, previous, name, secret);
  respond(res, 200, { name });
});
