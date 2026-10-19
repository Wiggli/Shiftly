const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('standalone-dist/sw.js','utf8');
function worker(){
 const handlers={},stored=new Map(),navigated=[],opened=[];
 const cache={addAll:async paths=>{for(const path of paths){assert.ok(fs.existsSync('standalone-dist/'+path.replace(/^\/Shiftly\//,''))||path==='/Shiftly/');stored.set(path,new Response('cached:'+path));}},match:async path=>stored.get(path)?.clone()};
 const self={location:{origin:'https://wiggli.github.io'},addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim:async()=>{},matchAll:async()=>[{url:'https://wiggli.github.io/AnotherApp/',navigate:async url=>navigated.push(url),focus:async()=>{}}],openWindow:async url=>opened.push(url)},registration:{showNotification:async()=>{}},skipWaiting:async()=>{}};
 vm.runInNewContext(source,{self,URL,Response,caches:{open:async()=>cache,keys:async()=>[],delete:async()=>{}},fetch:async()=>{throw Error('offline');}});
 async function run(name,event={}){let pending;handlers[name]({...event,waitUntil:p=>pending=p,respondWith:p=>pending=p});return await pending;}
 return {run,navigated,opened};
}
test('Pages PWA precaches every required file and restores the app and installation guide offline',async()=>{
 const w=worker();await w.run('install');
 for(const [path,expected] of [['/Shiftly/','/Shiftly/offline.html'],['/Shiftly/share/install-guide.html','/Shiftly/share/install-guide.html']]){
  const response=await w.run('fetch',{request:{url:'https://wiggli.github.io'+path,method:'GET',mode:'navigate'}});assert.equal(await response.text(),'cached:'+expected);
 }
 const badge=await w.run('fetch',{request:{url:'https://wiggli.github.io/Shiftly/icons/badge-96.png',method:'GET',mode:'cors'}});assert.equal(await badge.text(),'cached:/Shiftly/icons/badge-96.png');
});
test('Pages worker leaves backend traffic, mutations and other applications alone',async()=>{
 const w=worker();
 for(const request of [{url:'https://wiggli.github.io/AnotherApp/',method:'GET',mode:'navigate'},{url:'https://mauptvodrrdmnzjcfwgq.supabase.co/functions/v1/shiftly-api/api/calendar',method:'GET',mode:'cors'},{url:'https://wiggli.github.io/Shiftly/',method:'POST',mode:'cors'}])assert.equal(await w.run('fetch',{request}),undefined);
});
test('Notification clicks cannot navigate a different GitHub Pages application or leave Shiftly',async()=>{
 const w=worker();
 await w.run('notificationclick',{notification:{close(){},data:{url:'https://untrusted.invalid/'}}});
 assert.deepEqual(w.navigated,[]);assert.deepEqual(w.opened,['https://wiggli.github.io/Shiftly/']);
});
test('Published Pages metadata and installation guide point to the standalone application',()=>{
 const html=fs.readFileSync('standalone-dist/index.html','utf8'),guide=fs.readFileSync('standalone-dist/share/install-guide.html','utf8'),manifest=JSON.parse(fs.readFileSync('standalone-dist/manifest.json','utf8'));
 assert.match(html,/apple-touch-icon/);assert.match(html,/viewport-fit=cover/);assert.match(html,/manifest.json/);
 assert.equal(manifest.start_url,'/Shiftly/');assert.equal(manifest.scope,'/Shiftly/');
 assert.match(guide,/https:\/\/wiggli.github.io\/Shiftly\/\?install=1/);
 assert.match(guide,/People (?:&amp;|&) access/);
});
test('Offline cache includes lazy-loaded application chunks',()=>{
 for(const file of fs.readdirSync('standalone-dist/assets').filter(file=>/\.(js|css|woff2)$/.test(file)))assert.ok(source.includes('/Shiftly/assets/'+file),file+' must be available offline');
});
