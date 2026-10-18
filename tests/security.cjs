const ts=require('typescript'),fs=require('node:fs'),{test}=require('node:test'),assert=require('node:assert/strict');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {readMutation,secureResponse,cachedAccessChanged}=require('../lib/security.ts'),{validateRecord}=require('../lib/validation.ts');
test('Mutation bodies are bounded before JSON parsing, including missing or dishonest length headers',async()=>{
 for(const headers of [{},{'content-length':'1'}])await assert.rejects(readMutation(new Request('https://app.test/api/calendar',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify({value:'x'.repeat(200001)})})),/Request too large/);
 for(const body of ['null','[]','bad'])await assert.rejects(readMutation(new Request('https://app.test/api/calendar',{method:'POST',headers:{'content-type':'application/json'},body})),/Invalid request/);
 await assert.rejects(readMutation(new Request('https://app.test/api/calendar',{method:'POST',body:'{}'})),/JSON request/);
 assert.deepEqual(await readMutation(new Request('https://app.test/api/calendar',{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:'{"action":"sessionCheck"}'})),{action:'sessionCheck'});
});
test('Private pages, API, auth successes and failures cannot be cached or leak invitation URLs through referrers',async()=>{
 for(const path of ['/','/api/calendar','/api/live','/auth/google','/auth/callback']){const r=secureResponse(new Request('https://app.test'+path),new Response('private',{headers:{'Cache-Control':'public','Set-Cookie':'session=secret'}}));assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.match(r.headers.get('content-security-policy'),/object-src 'none'/);assert.equal(r.headers.get('set-cookie'),'session=secret');assert.equal(await r.text(),'private');}
 const r=secureResponse(new Request('https://app.test/assets/app.js'),new Response('',{headers:{'Cache-Control':'public, max-age=3600'}}));assert.equal(r.headers.get('cache-control'),'public, max-age=3600');
});
test('Fresh roster narrowing or role downgrades invalidate broader offline optimistic snapshots',()=>{
 const whole={role:'editor',calendar:{rosterScope:null},rosterScope:null};assert.equal(cachedAccessChanged(whole,{...whole,role:'viewer'}),true);assert.equal(cachedAccessChanged(whole,{...whole,rosterScope:'wife',calendar:{rosterScope:'wife'}}),true);assert.equal(cachedAccessChanged(whole,structuredClone(whole)),false);assert.equal(cachedAccessChanged(null,whole),false);
});
test('Event links accept ordinary web links and reject script or data protocols',()=>{
 const e={id:'e',date:'2026-11-01',title:'Appointment',emoji:'',time:'',notes:'',private:true,reminders:[]};
 for(const url of ['javascript:alert(1)','data:text/html,<script>alert(1)</script>','file:///etc/passwd'])assert.throws(()=>validateRecord('event',{...e,url}));
 assert.equal(validateRecord('event',{...e,url:'https://example.com/appointment'}).url,'https://example.com/appointment');
});
test('Pending optimistic edits cannot resurrect another author’s newly private event or private notes',()=>{
 const {redactCachedEvents}=require('../lib/security.ts');
 const cached={events:[{id:'a',author:'other',notes:'SECRET'},{id:'b',author:'other',notes:'NOW PRIVATE'},{id:'c',author:'me',notes:'MY UNSENT NOTE'}]};
 const fresh={events:[{id:'a',author:'other',notes:'',notesPrivate:true}]};
 const result=redactCachedEvents(cached,fresh,'me');assert.deepEqual(result.events.map(e=>e.id),['a','c']);assert.equal(result.events[0].notes,'');assert.equal(result.events[1].notes,'MY UNSENT NOTE');assert.equal(cached.events[0].notes,'SECRET');
});
