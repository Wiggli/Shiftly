import {cookies} from 'next/headers';
import {env} from 'cloudflare:workers';
import {authClient,authConfig,FLOW_COOKIE} from '../../../lib/auth';
import {googlePrincipal,safeReturnPath,verifiedGoogleUser} from '../../../lib/auth-policy';
import {getChatGPTUser} from '../../chatgpt-auth';
import {authFailure,providerFailureMessage} from '../../../lib/auth-error';

export async function GET(request:Request){
  const jar=await cookies();const nonce=jar.get(FLOW_COOKIE)?.value;
  const config=authConfig();
  let returnPath='/';
  let failureReason='expired_flow';
  try{
    if(!config||!env.DB||!nonce)throw Error('Sign-in expired. Please start again from the app.');
    const flow=await env.DB.prepare('SELECT * FROM auth_login_flows WHERE id=? AND expires_at>?').bind(nonce,Date.now()).first<any>();
    returnPath=safeReturnPath(flow?.return_path);
    const params=new URL(request.url).searchParams;
    if(params.has('error')){failureReason='provider_error';throw Error(providerFailureMessage(params.get('error')!));}
    const code=params.get('code');
    if(!flow||!code)throw Error('Sign-in was cancelled or expired. Please start again.');
    failureReason='code_exchange_failed';
    const client=await authClient();
    const {data,error}=await client.auth.exchangeCodeForSession(code);
    if(error||!verifiedGoogleUser(data.user)){if(data.session)await client.auth.signOut({scope:'local'});throw Error('Google sign-in could not be verified. Please start again.');}
    failureReason='account_link_failed';
    if(flow.legacy_principal){
      const legacy=await getChatGPTUser();
      if(!legacy||legacy.userId!==flow.legacy_principal){await client.auth.signOut({scope:'local'});throw Error('Your existing account changed during sign-in. No calendars were moved.');}
      const existing=await env.DB.prepare('SELECT principal FROM identity_links WHERE google_user_id=? OR principal=?').bind(data.user!.id,legacy.userId).all<any>();
      if(existing.results.some(r=>r.principal!==legacy.userId)||existing.results.length>1){await client.auth.signOut({scope:'local'});throw Error('These accounts are already connected elsewhere. No calendars were moved.');}
      const used=await env.DB.prepare('SELECT id FROM calendars WHERE owner=? UNION ALL SELECT id FROM calendar_members WHERE user=? LIMIT 1').bind(googlePrincipal(data.user!.id),googlePrincipal(data.user!.id)).first();
      if(used){await client.auth.signOut({scope:'local'});throw Error('This Google account already has calendars. Export them before linking to your existing account.');}
      await env.DB.prepare('INSERT OR IGNORE INTO identity_links(google_user_id,principal,linked_at) VALUES(?,?,?)').bind(data.user!.id,legacy.userId,new Date().toISOString()).run();
      const linked=await env.DB.prepare('SELECT principal FROM identity_links WHERE google_user_id=?').bind(data.user!.id).first<any>();
      if(linked?.principal!==legacy.userId){await client.auth.signOut({scope:'local'});throw Error('Account linking could not be completed.');}
    }
    await env.DB.prepare('DELETE FROM auth_login_flows WHERE id=?').bind(nonce).run();
    jar.delete(FLOW_COOKIE);
    return new Response(null,{status:303,headers:{Location:config.origin+safeReturnPath(flow.return_path),'Cache-Control':'private, no-store'}});
  }catch(error:any){
    console.warn('Shiftly Google callback failed', {reason:failureReason});
    if(env.DB&&nonce)await env.DB.prepare('DELETE FROM auth_login_flows WHERE id=?').bind(nonce).run();
    jar.delete(FLOW_COOKIE);
    return authFailure(error.message||'Sign-in could not be completed. Please try again.',400,returnPath);
  }
}
