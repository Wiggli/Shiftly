import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../app/chatgpt-auth';
import {googlePrincipal,verifiedGoogleUser} from './auth-policy';

export const FLOW_COOKIE = 'shiftly-login-flow';
export function authConfig() {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) return null;
  return {url:env.SUPABASE_URL,key:env.SUPABASE_PUBLISHABLE_KEY,origin:env.APP_ORIGIN || 'https://shiftly-calendar.bartoloandre.chatgpt.site'};
}
export async function authClient() {
  const config=authConfig();
  if (!config) throw new Error('Google sign-in has not been configured yet.');
  const jar=await cookies();
  return createServerClient(config.url,config.key,{
    cookieOptions:{name:'shiftly-google-session',httpOnly:true,secure:config.origin.startsWith('https:'),sameSite:'lax',path:'/'},
    cookies:{getAll:()=>jar.getAll(),setAll:items=>{for(const item of items)jar.set(item.name,item.value,item.options);}},
  });
}
export async function getAppUser() {
  const config=authConfig();
  const jar=await cookies();
  const hasGoogleSession=jar.getAll().some(c=>/^shiftly-google-session(?:\.\d+)?$/.test(c.name));
  if (config && hasGoogleSession) {
    // getUser validates the session with the managed Auth service, including revocation.
    const client=await authClient();
    const {data,error}=await client.auth.getUser();
    if(error || !verifiedGoogleUser(data.user))return null;
    const user=data.user!;
    if(!env.DB)throw new Error('DATABASE_UNAVAILABLE');
    const link=await env.DB.prepare('SELECT principal FROM identity_links WHERE google_user_id=?').bind(user.id).first<{principal:string}>();
    const fullName=typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name:null;
    const photo=user.user_metadata?.avatar_url||user.user_metadata?.picture;
    let avatarUrl:string|null=null;
    try{const url=new URL(photo);if(url.protocol==='https:'&&/(^|\.)googleusercontent\.com$/.test(url.hostname))avatarUrl=url.href;}catch{}
    return {userId:link?.principal||googlePrincipal(user.id),email:user.email!,fullName,avatarUrl,displayName:fullName||user.email!,provider:'google' as const};
  }
  // Existing users retain a migration path until they explicitly connect Google.
  const legacy=await getChatGPTUser();
  return legacy?{...legacy,provider:'legacy' as const}:null;
}
