import {cookies} from 'next/headers';
import {env} from 'cloudflare:workers';
import {authClient,authConfig,FLOW_COOKIE} from '../../../lib/auth';
import {safeReturnPath} from '../../../lib/auth-policy';
import {getChatGPTUser} from '../../chatgpt-auth';
import {authFailure} from '../../../lib/auth-error';

export async function GET(request:Request){return start(request,false);}
export async function POST(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'FORBIDDEN'},{status:403});
  return start(request,true);
}
async function start(request:Request,link:boolean){
  try{
    const config=authConfig();if(!config||!env.DB)throw Error('Google sign-in is not configured yet.');
    const provider=await fetch(config.url+'/auth/v1/settings',{headers:{apikey:config.key},signal:AbortSignal.timeout(10000)});
    if(!provider.ok || !(await provider.json() as any).external?.google)throw Error('Google sign-in is not enabled yet. You can continue using your existing calendar.');
    const legacy=link?await getChatGPTUser():null;
    if(link&&!legacy)throw Error('Sign in to your existing account before connecting Google.');
    const jar=await cookies();const nonce=crypto.randomUUID();
    const old=jar.get(FLOW_COOKIE)?.value;
    await env.DB.batch([
      env.DB.prepare('DELETE FROM auth_login_flows WHERE expires_at<? OR id=?').bind(Date.now(),old||''),
      env.DB.prepare('INSERT INTO auth_login_flows(id,return_path,legacy_principal,expires_at) VALUES(?,?,?,?)').bind(nonce,safeReturnPath(new URL(request.url).searchParams.get('return_to')),legacy?.userId||null,Date.now()+600000),
    ]);
    jar.set(FLOW_COOKIE,nonce,{httpOnly:true,secure:config.origin.startsWith('https:'),sameSite:'lax',path:'/',maxAge:600});
    const client=await authClient();
    const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:config.origin+'/auth/callback',scopes:'openid email profile',queryParams:{prompt:'select_account'}}});
    if(error||!data.url)throw Error('Google sign-in could not start. Please try again.');
    return new Response(null,{status:303,headers:{Location:data.url,'Cache-Control':'private, no-store'}});
  }catch(error:any){return authFailure(error.message||'Sign-in is temporarily unavailable. Please try again.',503,safeReturnPath(new URL(request.url).searchParams.get('return_to')));}
}
