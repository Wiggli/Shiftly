const ts=require('typescript'),fs=require('fs');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {test}=require('node:test'),assert=require('node:assert/strict');
const {safeReturnPath,verifiedGoogleUser,googlePrincipal}=require('../lib/auth-policy.ts');
test('OAuth redirects preserve invitations while rejecting external and authentication URLs',()=>{
  assert.equal(safeReturnPath('/?invite=abc&date=2026-11-20'),'/?invite=abc&date=2026-11-20');
  for(const bad of ['https://evil.test','//evil.test','/\\evil.test','/auth/google','/callback','/signin-with-chatgpt','/signout-with-chatgpt','/\nLocation:evil',null])assert.equal(safeReturnPath(bad),'/');
});
test('Google authorization requires a verified Google identity, never editable metadata',()=>{
  const valid={id:'uuid',email:'person@example.invalid',email_confirmed_at:'2026-10-09',identities:[{provider:'google'}]};
  assert.equal(verifiedGoogleUser(valid),true);
  for(const invalid of [{...valid,email_confirmed_at:null},{...valid,identities:[{provider:'email'}],user_metadata:{provider:'google'}},{...valid,email:null},null])assert.equal(!!verifiedGoogleUser(invalid),false);
  assert.equal(googlePrincipal('uuid'),'google_uuid');
});
