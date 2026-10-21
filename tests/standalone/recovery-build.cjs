const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('Pages build publishes recovery page outside normal precache',()=>{
 const source=fs.readFileSync('scripts/build-pages.mjs','utf8');
 assert.match(source,/public\/recover\.html/);
 assert.match(source,/BASE\+'recover\.html'/);
 assert.doesNotMatch(source,/const core=\[[^\n]*recover\.html/);
});
