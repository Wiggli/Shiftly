// Isolated managed-Auth fixture. No real accounts, secrets or Google requests.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';

const root='http://127.0.0.1:8791',authOrigin='http://127.0.0.1:8790';
const codes=new Map(),tokens=new Map();let userCalls=0;
const fixture=createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  const path=new URL(req.url,authOrigin).pathname;
  let status=200,data;
  if(path==='/auth/v1/settings')data={external:{google:true}};
  else if(path==='/auth/v1/token'){
    const input=JSON.parse(body),entry=codes.get(input.auth_code);
    if(!entry||createHash('sha256').update(input.code_verifier||'').digest('base64url')!==entry.challenge){status=400;data={error:'invalid_grant',error_description:'Invalid code or verifier'};}
    else{
      codes.delete(input.auth_code);
      const payload=Buffer.from(JSON.stringify({sub:entry.user.id,iss:authOrigin+'/auth/v1',aud:'authenticated',role:'authenticated',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
      const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+payload+'.fixture';
      tokens.set(token,entry.user);
      data={access_token:token,refresh_token:randomUUID(),expires_in:3600,token_type:'bearer',user:entry.user};
    }
  }else if(path==='/auth/v1/user'){
    userCalls++;data=tokens.get(req.headers.authorization?.replace('Bearer ',''));
    if(!data){status=401;data={msg:'Session revoked',code:'bad_jwt'};}
  }else if(path==='/auth/v1/logout')data={};
  else {status=404;data={error:'Unexpected fixture request'};}
  res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));
});
await new Promise(resolve=>fixture.listen(8790,'127.0.0.1',resolve));
const worker=spawn('node',['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--port','8791','--inspector-port','0','--var','SUPABASE_URL:'+authOrigin,'--var','SUPABASE_PUBLISHABLE_KEY:fixture-publishable','--var','APP_ORIGIN:'+root],{stdio:['ignore','pipe','pipe'],detached:true});
try{
  await new Promise((resolve,reject)=>{let log='';const timeout=setTimeout(()=>reject(Error(log.slice(-2000))),45000);for(const stream of [worker.stdout,worker.stderr])stream.on('data',chunk=>{log+=chunk;if(log.includes('Ready on http://127.0.0.1:8791')){clearTimeout(timeout);resolve();}});worker.on('exit',()=>{clearTimeout(timeout);reject(Error(log.slice(-2000)));});});
  const legacy={id:'legacy-link-'+Date.now(),email:'legacy@example.invalid'};
  const legacyHeaders={'oai-authenticated-user-id':legacy.id,'oai-authenticated-user-email':legacy.email};
  const request=async(path,options={})=>fetch(root+path,{redirect:'manual',...options});
  const original=await (await request('/api/calendar',{headers:legacyHeaders})).json();
  const cookieJar=new Map();
  const remember=response=>{for(const item of response.headers.getSetCookie()){const [pair]=item.split(';');const at=pair.indexOf('=');const name=pair.slice(0,at),value=pair.slice(at+1);if(!value||/max-age=0/i.test(item))cookieJar.delete(name);else cookieJar.set(name,value);}};
  const cookie=()=>[...cookieJar].map(([k,v])=>k+'='+v).join('; ');
  const user={id:randomUUID(),email:'google@example.invalid',email_confirmed_at:new Date().toISOString(),identities:[{provider:'google'}],user_metadata:{full_name:'Google test',role:'owner'}};
  const begin=await request('/auth/google?return_to=%2F%3Finvite%3Dtest',{method:'POST',headers:{...legacyHeaders,Origin:root}});
  assert.equal(begin.status,303);remember(begin);
  const authorize=new URL(begin.headers.get('location'));
  assert.equal(authorize.searchParams.get('provider'),'google');
  assert.equal(authorize.searchParams.get('code_challenge_method'),'s256');
  assert.equal(authorize.searchParams.get('redirect_to'),root+'/auth/callback');
  codes.set('valid-code',{challenge:authorize.searchParams.get('code_challenge'),user});
  const callback=await request('/auth/callback?code=valid-code',{headers:{...legacyHeaders,Cookie:cookie()}});
  assert.equal(callback.status,303,await callback.clone().text());
  assert.equal(callback.headers.get('location'),root+'/?invite=test');remember(callback);
  assert.ok(callback.headers.getSetCookie().some(c=>c.includes('HttpOnly')));
  assert.ok(!cookieJar.has('shiftly-login-flow'));
  const google=await request('/api/calendar',{headers:{Cookie:cookie()}});
  assert.equal(google.status,200,await google.clone().text());
  assert.equal((await google.json()).calendar.id,original.calendar.id,'Explicit linking preserves existing ownership');
  assert.ok(userCalls>0,'Authorization must validate identity with the Auth service');
  const replay=await request('/auth/callback?code=valid-code',{headers:{...legacyHeaders,Cookie:cookie()}});
  assert.equal(replay.status,400);
  const outsider=await request('/api/calendar?id='+original.calendar.id,{headers:{'oai-authenticated-user-id':'outsider','oai-authenticated-user-email':'outsider@example.invalid'}});
  assert.equal(outsider.status,403);
  const missingOrigin=await request('/api/calendar',{method:'POST',headers:{Cookie:cookie(),'Content-Type':'application/json'},body:JSON.stringify({action:'sessionCheck'})});
  assert.equal(missingOrigin.status,403);
  const validOrigin=await request('/api/calendar',{method:'POST',headers:{Cookie:cookie(),Origin:root,'Content-Type':'application/json'},body:JSON.stringify({action:'sessionCheck'})});
  assert.equal(validOrigin.status,200);
  tokens.clear();
  assert.equal((await request('/api/calendar',{headers:{Cookie:cookie(),...legacyHeaders}})).status,401,'Revoked Google session cannot fall back to a legacy account');
  cookieJar.clear();
  // An identical email never automatically grants ownership of an older account.
  const newcomer={...user,id:randomUUID(),email:legacy.email};
  const freshBegin=await request('/auth/google');remember(freshBegin);
  assert.equal(freshBegin.status,303);
  codes.set('new-code',{challenge:new URL(freshBegin.headers.get('location')).searchParams.get('code_challenge'),user:newcomer});
  const freshCallback=await request('/auth/callback?code=new-code',{headers:{Cookie:cookie()}});remember(freshCallback);
  assert.equal(freshCallback.status,303);
  const newcomerCalendar=await (await request('/api/calendar',{headers:{Cookie:cookie()}})).json();
  assert.notEqual(newcomerCalendar.calendar.id,original.calendar.id);
  assert.equal((await request('/api/calendar?id='+original.calendar.id,{headers:{Cookie:cookie()}})).status,403);
  const logout=await request('/auth/signout',{method:'POST',headers:{Cookie:cookie(),Origin:root}});remember(logout);
  assert.equal(logout.status,200);
  assert.equal((await request('/api/calendar',{headers:{Cookie:cookie()}})).status,401);
  console.log('GOOGLE AUTH PASS: PKCE, HTTP-only cookies, explicit dual-identity linking, invitation redirect, callback replay, independent new accounts, same-email isolation, CSRF, revoked session denial and logout.');
}finally{
  try{process.kill(-worker.pid,'SIGTERM');}catch{}
  await new Promise(resolve=>fixture.close(resolve));
}
