// Deine Geldfluss-Daten als eine private Datei im Vercel Blob Store (Frankfurt).
// Jede gespeicherte Fassung bekommt eine eigene Versionsnummer. Gespeichert wird nur, wenn das Gerät
// die aktuelle Version kannte, sonst gibt es 409 und die App fragt, welche Fassung bleiben soll.
import { get, put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import { checkToken, json } from './_auth.js';

const PATH = 'geldfluss/state.json';

async function read() {
  const r = await get(PATH, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return null;
  const j = JSON.parse(await new Response(r.stream).text());
  if (j && j.__geldfluss === 1) return { data: j.data, version: j.version, at: j.savedAt };
  // ältere Fassung ohne Hülle
  return { data: j, version: 'alt-' + String(r.blob.etag || '0').replace(/\W/g, ''), at: r.blob.uploadedAt };
}

export async function GET(request) {
  if (!checkToken(request)) return json({ error: 'auth' }, 401);
  const cur = await read();
  if (!cur) return json({ data: null, version: null, at: null });
  if (request.headers.get('x-geldfluss-version') === cur.version) return json({ unchanged: true, version: cur.version, at: cur.at });
  return json(cur);
}

export async function PUT(request) {
  if (!checkToken(request)) return json({ error: 'auth' }, 401);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_request' }, 400); }
  if (!body || typeof body.data !== 'object' || body.data === null) return json({ error: 'bad_request' }, 400);
  const cur = await read();
  if (cur && cur.version !== (body.base || null)) return json({ error: 'conflict', current: cur }, 409);
  const version = randomUUID(), savedAt = new Date().toISOString();
  await put(PATH, JSON.stringify({ __geldfluss: 1, version, savedAt, data: body.data }), {
    access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60,
  });
  return json({ version, at: savedAt });
}
