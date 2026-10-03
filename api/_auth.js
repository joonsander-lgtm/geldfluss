// Einfacher Login für eine Person: Das Passwort steht nur als Umgebungsvariable in Vercel (GELDFLUSS_PASSWORD).
// Nach dem Login bekommt das Gerät ein signiertes Token, das 180 Tage gilt. Passwort ändern = alle Geräte abgemeldet.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const PW = () => process.env.GELDFLUSS_PASSWORD || '';
const sha = s => createHash('sha256').update(String(s)).digest();
const sign = exp => createHmac('sha256', PW()).update('geldfluss:' + exp).digest('base64url');

export const configured = () => PW().length > 0;

export function checkPassword(pw) {
  if (!configured()) return false;
  return timingSafeEqual(sha(pw ?? ''), sha(PW()));
}
export function makeToken() {
  const exp = Date.now() + 180 * 24 * 3600 * 1000;
  return exp + '.' + sign(exp);
}
export function checkToken(request) {
  if (!configured()) return false;
  const t = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const [exp, sig] = t.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || +exp < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}
export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
