const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {calendarProfile,calendarProfileURL}=require('../../lib/caldav-profile.ts');
const username='s0123456789abcdef01234567',address='https://fixture.invalid/functions/v1/shiftly-api/api/caldav/'+username+'/';

test('iPhone setup names the account Shiftly, uses SSL and contains no password or management payload',async()=>{
 const profile=await calendarProfile(address);
 assert.equal(profile,await calendarProfile(address));
 assert.ok(profile.includes('<key>CalDAVAccountDescription</key><string>Shiftly</string>'));
 assert.ok(profile.includes('<key>CalDAVHostName</key><string>fixture.invalid</string>'));
 assert.ok(profile.includes('<key>CalDAVUsername</key><string>'+username+'</string>'));
 assert.ok(profile.includes('<key>CalDAVPrincipalURL</key><string>'+address+'principal/</string>'));
 assert.ok(profile.includes('<key>CalDAVUseSSL</key><true/>'));
 assert.ok(profile.includes('<key>CalDAVPort</key><integer>443</integer>'));
 assert.deepEqual([...profile.matchAll(/<key>PayloadType<\/key><string>([^<]+)<\/string>/g)].map(m=>m[1]),['Configuration','com.apple.caldav.account']);
 assert.equal((profile.match(/<key>PayloadUUID<\/key><string>[A-F0-9]{8}-[A-F0-9]{4}-5[A-F0-9]{3}-[89AB][A-F0-9]{3}-[A-F0-9]{12}<\/string>/g)||[]).length,2);
 assert.ok(!/CalDAVPassword|access_token|refresh_token|service_role|com\.apple\.mdm|VPN|Certificate/i.test(profile));
 assert.notEqual(profile,await calendarProfile(address.replace(username,'sffffffffffffffffffffffff')));
 assert.equal(calendarProfileURL(address),'https://fixture.invalid/functions/v1/shiftly-api/setup/caldav/'+username+'.mobileconfig');
});
test('Setup rejects insecure or credential-bearing addresses and unsupported paths',async()=>{
 for(const invalid of [address.replace('https:','http:'),address+'?password=secret',address+'#token',address.replace('fixture.invalid','user:secret@fixture.invalid'),address.replace(username,'invalid'),address.replace('/api/caldav/','/other/')]){
  assert.throws(()=>calendarProfileURL(invalid));await assert.rejects(calendarProfile(invalid));
 }
});
test('Public profile endpoint never queries accounts or exposes calendar access',async()=>{
 const previousDeno=global.Deno,previousFetch=global.fetch;
 global.Deno={env:{get:name=>name==='SUPABASE_URL'?'https://fixture.invalid':name==='SHIFTLY_APP_ORIGIN'?'https://wiggli.github.io':'fixture-service'},serve:()=>{}};
 global.fetch=async()=>{throw Error('Profile templates must not contact auth or the database');};
 try{
  const {handleRequest}=await import('../../supabase/functions/shiftly-api/index.js');
  const url='https://fixture.invalid/functions/v1/shiftly-api/setup/caldav/'+username+'.mobileconfig';
  const response=await handleRequest(new Request(url));assert.equal(response.status,200);
  assert.equal(response.headers.get('content-type'),'application/x-apple-aspen-config');
  assert.equal(response.headers.get('content-disposition'),'attachment; filename="Shiftly.mobileconfig"');
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal(await response.text(),await calendarProfile(address));
  const head=await handleRequest(new Request(url,{method:'HEAD'}));assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.equal((await handleRequest(new Request(url,{method:'POST'}))).status,405);
  assert.equal((await handleRequest(new Request(url.replace(username,'invalid')))).status,404);
  assert.equal((await handleRequest(new Request(url,{headers:{Origin:'https://other.invalid'}}))).status,403);
  assert.equal((await handleRequest(new Request('https://fixture.invalid/functions/v1/shiftly-api/api/calendar'))).status,401);
 }finally{global.Deno=previousDeno;global.fetch=previousFetch;}
});
