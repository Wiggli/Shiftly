const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('source recovery page resets only the service-worker shell',()=>{
 const source=fs.readFileSync('public/recover.html','utf8');
 assert.match(source,/serviceWorker\.getRegistrations/);
 assert.match(source,/\.unregister\(\)/);
 assert.doesNotMatch(source,/indexedDB\.deleteDatabase|localStorage\.clear|sessionStorage\.clear|caches\.delete/);
});
