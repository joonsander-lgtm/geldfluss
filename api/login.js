import { configured, checkPassword, makeToken, json } from './_auth.js';

export async function POST(request) {
  if (!configured()) return json({ error: 'not_configured' }, 503);
  let body = {};
  try { body = await request.json(); } catch (e) {}
  if (!checkPassword(body.password)) {
    await new Promise(r => setTimeout(r, 1000)); // bremst Durchprobieren aus
    return json({ error: 'wrong_password' }, 401);
  }
  return json({ token: makeToken() });
}
