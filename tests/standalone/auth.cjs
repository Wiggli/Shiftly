const ts=require('typescript'),fs=require('node:fs');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {test}=require('node:test'),assert=require('node:assert/strict');
global.Deno={env:{get:name=>name==='SUPABASE_URL'?'https://fixture.invalid':'fixture-service'}};
const {authenticatedUser}=require('../../standalone/server/runtime.ts');
test('Production authentication validates bearer tokens and Google identity before resolving ownership',async()=>{
 const original=global.fetch;let user={id:'qa-user',email:'qa@example.invalid',email_confirmed_at:'2026-10-19',identities:[{provider:'google'}]},revoked=false,calls=[];
 global.fetch=async(url,options)=>{calls.push(String(url));if(String(url).endsWith('/auth/v1/user')){assert.equal(options.headers.Authorization,'Bearer fixture-token');return Response.json(user,{status:revoked?401:200});}assert.ok(String(url).endsWith('/rest/v1/rpc/shiftly_exec'));return Response.json([{results:[]}]);};
 try{
  assert.equal(await authenticatedUser(new Request('https://app.invalid',{headers:{'x-test-user-id':'owner'}})),null);assert.deepEqual(calls,[]);
  const request=()=>new Request('https://app.invalid',{headers:{Authorization:'Bearer fixture-token'}});
  assert.equal((await authenticatedUser(request())).userId,'google_qa-user');
  for(const invalid of [{...user,email_confirmed_at:null},{...user,identities:[{provider:'email'}],user_metadata:{provider:'google'}},{...user,email:null}]){const valid=user;user=invalid;const before=calls.length;assert.equal(await authenticatedUser(request()),null);assert.equal(calls.length,before+1);user=valid;}
  revoked=true;assert.equal(await authenticatedUser(request()),null);
 }finally{global.fetch=original;}
});
