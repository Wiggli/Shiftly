const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('recovery endpoint stays at the stable repository-scoped URL',()=>{
 assert.ok(fs.existsSync('public/recover.html'));
 const build=fs.readFileSync('scripts/build-pages.mjs','utf8');
 assert.match(build,/standalone-dist\/recover\.html/);
});
