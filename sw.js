// Geldfluss Offline-Cache: Erst Netz, sonst Cache. So kommen Updates sofort an und offline läuft die App trotzdem.
const CACHE='geldfluss-v1';
const CORE=['./','./index.html','./config.js','./supabase.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request, u=new URL(r.url);
  if(r.method!=='GET') return;
  if(u.origin===location.origin){
    e.respondWith(fetch(r).then(res=>{const copy=res.clone(); caches.open(CACHE).then(c=>c.put(r,copy)); return res;})
      .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('./index.html'))));
  } else if(u.hostname.endsWith('fonts.googleapis.com')||u.hostname.endsWith('fonts.gstatic.com')){
    e.respondWith(caches.match(r).then(m=>{const net=fetch(r).then(res=>{caches.open(CACHE).then(c=>c.put(r,res.clone())); return res;}).catch(()=>m); return m||net;}));
  }
  // Alles andere (Supabase) läuft direkt übers Netz.
});
