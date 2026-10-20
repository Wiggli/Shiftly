const {test}=require('node:test'),assert=require('node:assert/strict');
test('Built session endpoint delivers the Google photo without exposing auth tokens',async()=>{
 const originalFetch=global.fetch,originalDeno=global.Deno;
 global.Deno={env:{get:name=>name==='SUPABASE_URL'?'https://fixture.invalid':name==='SHIFTLY_APP_ORIGIN'?'https://wiggli.github.io':'fixture-service'},serve:()=>{}};
 global.fetch=async(url)=>{
  if(String(url)==='https://fixture.invalid/auth/v1/user')return Response.json({id:'sample',email:'sample@example.invalid',email_confirmed_at:'2026-10-19',identities:[{provider:'google',identity_data:{picture:'https://lh3.googleusercontent.com/sample'}}],user_metadata:{full_name:'Sample Person'}});
  assert.equal(String(url),'https://fixture.invalid/rest/v1/rpc/shiftly_exec');return Response.json([{results:[]}]);
 };
 try{
  const {handleRequest}=await import('../../supabase/functions/shiftly-api/index.js');
  const response=await handleRequest(new Request('https://fixture.invalid/functions/v1/shiftly-api/api/session',{headers:{Authorization:'Bearer fixture-token',Origin:'https://wiggli.github.io'}}));
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.deepEqual(await response.json(),{identity:{id:'google_sample',name:'Sample Person',email:'sample@example.invalid',provider:'google',avatarUrl:'https://lh3.googleusercontent.com/sample'}});
  assert.equal((await handleRequest(new Request('https://fixture.invalid/functions/v1/shiftly-api/api/session'))).status,401);
 }finally{global.fetch=originalFetch;global.Deno=originalDeno;}
});
