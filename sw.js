// Sonnenblume offline cache. A deep-space crew has no internet, so the whole app
// must run from the device. Health data never passes through here: it stays in localStorage.
const VERSION='sonnenblume-v14';
const CORE=['./','index.html','app.html','privacy.html','404.html','css/fonts.css','css/styles.css','css/landing.css',
  'js/app.js','js/body.js','js/landing.js','js/mind.js','js/mind-worker.js','js/ops.js','css/mind.css','css/ops.css','wasm/sonnenblume_core.wasm','data/index.json','data/kb-dosing.json',
  'fonts/space-grotesk-latin-400-normal.woff2','fonts/space-grotesk-latin-500-normal.woff2','fonts/space-grotesk-latin-600-normal.woff2','fonts/space-grotesk-latin-700-normal.woff2',
  'fonts/jetbrains-mono-latin-400-normal.woff2','fonts/jetbrains-mono-latin-600-normal.woff2',
  'fonts/inter-latin-400-normal.woff2','fonts/inter-latin-500-normal.woff2','fonts/inter-latin-600-normal.woff2','fonts/inter-latin-700-normal.woff2'];
// data files are listed in data/index.json, so new library files are cached automatically
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(async c=>{
  await c.addAll(CORE);
  const idx=await (await fetch('data/index.json',{cache:'no-store'})).json();
  await c.addAll(idx.files.map(f=>'data/'+f));
}).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/'))return;
  // fonts never change: cache first
  if(u.pathname.startsWith('/fonts/')){e.respondWith(caches.match(e.request).then(h=>h||fetch(e.request)));return;}
  // everything else: always try the network first so nobody sees an old version; fall back to the saved copy offline
  e.respondWith((async()=>{
    const c=await caches.open(VERSION);
    try{
      const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),5000);
      const r=await fetch(e.request,{signal:ctl.signal,cache:'no-cache'});clearTimeout(t);
      if(r.ok&&r.type==='basic')c.put(e.request,r.clone());
      return r;
    }catch(err){
      const hit=await c.match(e.request,{ignoreSearch:true})||(e.request.mode==='navigate'?await c.match('app.html'):null);
      return hit||Response.error();
    }
  })());
});
