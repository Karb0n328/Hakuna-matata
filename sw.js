const CACHE='hakuna-matata-v17-now-after-started-block';
const ASSETS=['./','./index.html','./styles.css','./mata.css','./ui-fixes.css','./today-agenda.css','./main.js','./migration.js','./app.js','./ui-fixes.js','./today-agenda.js','./today-marker-fix.js','./mata-fallback.js','./mata-loader.js','./mata-observer-guard.js','./mata-core-v2.js','./mata-nlu-v2.js','./mata-ui-v2.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./assets/mata.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return resp;}).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));
});
