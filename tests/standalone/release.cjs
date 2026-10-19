const {test}=require('node:test');
const assert=require('node:assert/strict');
const commit='a'.repeat(40),baseURL='https://wiggli.github.io/Shiftly/';
const html='<meta name="shiftly-build" content="abc1234567"><script src="/Shiftly/assets/app.js"></script><link href="/Shiftly/assets/app.css">';
function fetcher(change={}){const files={'/Shiftly/version.json':JSON.stringify({build:'abc1234567',commit}),'/Shiftly/':html,'/Shiftly/offline.html':html,'/Shiftly/sw.js':'shiftly-pages- /Shiftly/offline.html /Shiftly/assets/app.js /Shiftly/assets/app.css','/Shiftly/assets/app.js':'app','/Shiftly/assets/app.css':'css',...change};return async url=>new Response(files[url.pathname]??'missing',{status:files[url.pathname]===undefined?404:200});}
test('Live release verification accepts a complete matching release',async()=>{
 const {verifyLive}=await import('../../scripts/verify-live.mjs');
 assert.equal((await verifyLive({baseURL,expectedCommit:commit,fetcher:fetcher()})).commit,commit);
});
test('Live release verification rejects stale commit, mixed HTML and missing assets',async()=>{
 const {verifyLive}=await import('../../scripts/verify-live.mjs');
 for(const change of [{'/Shiftly/version.json':JSON.stringify({build:'abc1234567',commit:'b'.repeat(40)})},{'/Shiftly/':html.replace('abc1234567','def1234567')},{'/Shiftly/offline.html':html.replace('abc1234567','def1234567')},{'/Shiftly/assets/app.js':undefined}]){
  await assert.rejects(verifyLive({baseURL,expectedCommit:commit,fetcher:fetcher(change)}));
 }
});
