const CACHE='shiftly-shell-7f4480f61018';
const CORE=['/favicon.svg','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png','/icons/apple-touch-icon.png','/icons/badge-96.png','/manifest.json','/share/install-qr.svg','/share/install-guide.html','/offline.html','/offline-assets/app.js','/offline-assets/app.css'];
const privatePath=path=>path.startsWith('/api/')||path==='/api'||path.startsWith('/auth/')||path==='/auth'||/signin|callback/.test(path);
function localURL(value){try{const url=new URL(typeof value==='string'?value:'/',self.location.origin);return url.origin===self.location.origin&&!privatePath(url.pathname)?url.href:self.location.origin+'/';}catch{return self.location.origin+'/';}}
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));});
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')event.waitUntil(self.skipWaiting());if(event.data?.type==='GET_VERSION')event.ports?.[0]?.postMessage({version:CACHE});});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{await self.clients.claim();const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('shiftly-shell-')&&key!==CACHE).map(key=>caches.delete(key)));})());});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||privatePath(url.pathname))return;
 // Authenticated HTML and API responses never enter Cache Storage. The offline shell reads the account-scoped IndexedDB copy.
 if(request.mode==='navigate'){
  event.respondWith((async()=>{try{return await fetch(request);}catch{const cached=await caches.open(CACHE).then(cache=>cache.match(url.pathname==='/share/install-guide.html'?url.pathname:'/offline.html'));return cached||new Response('Open Shiftly once while connected to prepare offline access.',{status:503,headers:{'Content-Type':'text/plain'}});}})());return;
 }
 // RSC payloads are user-specific even when the pathname looks like a static page.
 if(request.headers.has('RSC')||url.searchParams.has('_rsc'))return;
 const core=CORE.includes(url.pathname),immutable=/\/assets\/|\/_next\/static\//.test(url.pathname)&&/\.(js|css|woff2)$/.test(url.pathname);
 if(!core&&!immutable)return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);const key=core?url.pathname:request;const cached=await cache.match(key);if(cached)return cached;const response=await fetch(request);if(response.ok&&response.type!=='opaque'&&!/private|no-store/.test(response.headers.get('Cache-Control')||''))await cache.put(key,response.clone());return response;})());
});
self.addEventListener('push',event=>{let data;try{data=event.data?.json();}catch{return;}if(!data||typeof data!=='object')return;const title=typeof data.title==='string'?data.title.slice(0,150):'Shiftly';const body=typeof data.body==='string'?data.body.slice(0,500):'';event.waitUntil(self.registration.showNotification(title,{body,icon:'/icons/icon-192.png',badge:'/icons/badge-96.png',tag:typeof data.tag==='string'?data.tag:undefined,data:{url:localURL(data.url)}}));});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=localURL(event.notification.data?.url);event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){if(new URL(client.url).origin===self.location.origin&&'focus' in client){await client.navigate(url);await client.focus();return;}}await self.clients.openWindow(url);})());});
