// Deine Geldfluss-Daten als eine private Datei im Vercel Blob Store (Frankfurt).
// Jede Version hat ein ETag. Gespeichert wird nur, wenn das Gerät die aktuelle Version kannte,
// sonst gibt es 409 und die App fragt, welche Version bleiben soll.
import { get, put } from '@vercel/blob';
import { checkToken, json } from './_auth.js';

const PATH = 'geldfluss/state.json';

async function read(ifNoneMatch) {
  const r = await get(PATH, { access: 'private', useCache: false, ...(ifNoneMatch ? { ifNoneMatch } : {}) });
  if (!r) return null;
  if (r.statusCode === 304) return { unchanged: true, etag: r.blob.etag, at: r.blob.uploadedAt };
  const text = await new Response(r.stream).text();
  return { data: JSON.parse(text), etag: r.blob.etag, at: r.blob.uploadedAt };
}

export async function GET(request) {
  if (!checkToken(request)) return json({ error: 'auth' }, 401);
  const cur = await read(request.headers.get('x-geldfluss-etag') || undefined);
  if (!cur) return json({ data: null, etag: null, at: null });
  return json(cur);
}

export async function PUT(request) {
  if (!checkToken(request)) return json({ error: 'auth' }, 401);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_request' }, 400); }
  if (!body || typeof body.data !== 'object' || body.data === null) return json({ error: 'bad_request' }, 400);
  const content = JSON.stringify(body.data), base = body.base || null;
  const opts = { access: 'private', addRandomSuffix: false, contentType: 'application/json', cacheControlMaxAge: 60 };
  try {
    const res = await put(PATH, content, base ? { ...opts, ifMatch: base } : { ...opts, allowOverwrite: false });
    return json({ etag: res.etag, at: res.uploadedAt || new Date().toISOString() });
  } catch (e) {
    // Version passt nicht (oder Datei existiert schon): aktuellen Stand zurückgeben
    const cur = await read();
    if (!cur) {
      const res = await put(PATH, content, { ...opts, allowOverwrite: true });
      return json({ etag: res.etag, at: res.uploadedAt || new Date().toISOString() });
    }
    if (cur.etag !== base) return json({ error: 'conflict', current: cur }, 409);
    throw e;
  }
}
