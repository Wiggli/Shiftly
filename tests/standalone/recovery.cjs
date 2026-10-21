const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('recovery bootstrap is published independently and preserves local roster storage',()=>{
 const recovery=fs.readFileSync('standalone-dist/recover.html','utf8');
 const worker=fs.readFileSync('standalone-dist/sw.js','utf8');
 assert.match(recovery,/serviceWorker\.getRegistrations/);
 assert.match(recovery,/\.unregister\(\)/);
 assert.doesNotMatch(recovery,/indexedDB\.deleteDatabase|localStorage\.clear|caches\.delete/);
 assert.match(worker,/recover\.html/);
 assert.ok(!worker.match(/CORE=.*recover\.html/),'recovery page must not be precached into the normal app shell');
});
