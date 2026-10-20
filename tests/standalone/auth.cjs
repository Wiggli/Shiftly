const ts=require('typescript'),fs=require('node:fs');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {test}=require('node:test'),assert=require('node:assert/strict');
global.Deno={env:{get:name=>name==='SUPABASE_URL'?'https://fixture.invalid':'fixture-service'}};
const {authenticatedUser,googleAvatar,sessionIdentity}=require('../../standalone/server/runtime.ts');
const {loadAccountIdentity}=require('../../lib/account-bootstrap.ts');
const accountSource=(overrides={})=>({session:async()=>({user:{id:'sample'}}),user:async()=>({id:'sample'}),identity:async()=>({id:'google_sample',name:'Sample'}),cached:()=>({id:'google_sample',name:'Saved sample'}),online:()=>true,...overrides});
test('Account bootstrap distinguishes guests, verified accounts and transient failures',async()=>{
 assert.equal(await loadAccountIdentity(accountSource({session:async()=>null,user:()=>{throw Error('must not request user for guests');}})),null);
 assert.deepEqual(await loadAccountIdentity(accountSource()),{id:'google_sample',name:'Sample',authUserId:'sample'});
 await assert.rejects(loadAccountIdentity(accountSource({identity:async()=>{throw Error('503');}})),/Your account could not be reached/);
 await assert.rejects(loadAccountIdentity(accountSource({user:async()=>{throw Error('network');}})),/saved calendar is safe/);
 await assert.rejects(loadAccountIdentity(accountSource({user:async()=>({id:'another-account'})})),/Your account could not be reached/);
});
test('Offline opening uses saved identity without crossing a known account boundary',async()=>{
 const failed=async()=>{throw Error('offline');};
 assert.equal((await loadAccountIdentity(accountSource({online:()=>false,user:failed}))).name,'Saved sample');
 assert.equal((await loadAccountIdentity(accountSource({online:()=>false,session:failed}))).id,'google_sample');
 await assert.rejects(loadAccountIdentity(accountSource({online:()=>false,user:failed,cached:()=>({id:'google_other',authUserId:'other'})})),/Reconnect once/);
 await assert.rejects(loadAccountIdentity(accountSource({timeoutMs:5,session:()=>new Promise(()=>{})})),/taking longer than usual/);
});
test('Production authentication validates bearer tokens and Google identity before resolving ownership',async()=>{
 const original=global.fetch;let user={id:'qa-user',email:'qa@example.invalid',email_confirmed_at:'2026-10-19',identities:[{provider:'google'}]},revoked=false,calls=[];
 global.fetch=async(url,options)=>{calls.push(String(url));if(String(url).endsWith('/auth/v1/user')){assert.equal(options.headers.Authorization,'Bearer fixture-token');return Response.json(user,{status:revoked?401:200});}assert.ok(String(url).endsWith('/rest/v1/rpc/shiftly_exec'));return Response.json([{results:[]}]);};
 try{
  assert.equal(await authenticatedUser(new Request('https://app.invalid',{headers:{'x-test-user-id':'owner'}})),null);assert.deepEqual(calls,[]);
  const request=()=>new Request('https://app.invalid',{headers:{Authorization:'Bearer fixture-token'}});
  assert.equal((await authenticatedUser(request())).userId,'google_qa-user');
  user={...user,user_metadata:{full_name:'Sample Person',avatar_url:'https://lh3.googleusercontent.com/sample-photo'}};
  const identity=sessionIdentity(await authenticatedUser(request()));
  assert.deepEqual(identity,{id:'google_qa-user',name:'Sample Person',email:'qa@example.invalid',provider:'google',avatarUrl:'https://lh3.googleusercontent.com/sample-photo'});
  for(const invalid of [{...user,email_confirmed_at:null},{...user,identities:[{provider:'email'}],user_metadata:{provider:'google'}},{...user,email:null}]){const valid=user;user=invalid;const before=calls.length;assert.equal(await authenticatedUser(request()),null);assert.equal(calls.length,before+1);user=valid;}
  revoked=true;assert.equal(await authenticatedUser(request()),null);
 }finally{global.fetch=original;}
});
test('Google photos support provider and metadata variants with a safe missing-photo fallback',()=>{
 const photo='https://lh3.googleusercontent.com/provider-photo';
 assert.equal(googleAvatar({identities:[{provider:'google',identity_data:{picture:photo}}],user_metadata:{avatar_url:'https://example.invalid/older'}}),photo);
 assert.equal(googleAvatar({user_metadata:{picture:photo}}),photo);
 assert.equal(googleAvatar({user_metadata:{avatar_url:'javascript:alert(1)',picture:photo}}),photo);
 for(const value of [null,{},'http://example.invalid/photo','data:image/svg+xml,test','https://user:pass@example.invalid/photo'])assert.equal(googleAvatar({user_metadata:{avatar_url:value}}),null);
 assert.equal(sessionIdentity({userId:'fixture',fullName:'Sample',email:'qa@example.invalid'}).avatarUrl,null);
});
