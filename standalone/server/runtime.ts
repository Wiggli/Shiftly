import {AsyncLocalStorage} from 'node:async_hooks';
import {Database} from './database';
export const contextStorage=new AsyncLocalStorage<{user:any}>();
const values={url:Deno.env.get('SUPABASE_URL')!,service:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!};
export const env={DB:new Database(values.url,values.service),APP_ORIGIN:Deno.env.get('SHIFTLY_APP_ORIGIN')||'https://wiggli.github.io'};
export async function getAppUser(){return contextStorage.getStore()?.user||null;}
export async function authenticatedUser(request:Request){
 const token=/^Bearer (.+)$/i.exec(request.headers.get('authorization')||'')?.[1];if(!token)return null;
 const response=await fetch(values.url+'/auth/v1/user',{headers:{apikey:values.service,Authorization:'Bearer '+token}});if(!response.ok)return null;
 const user:any=await response.json();if(!user.email_confirmed_at||!user.email||!user.identities?.some((identity:any)=>identity.provider==='google'))return null;
 const link:any=await env.DB.prepare('SELECT principal FROM identity_links WHERE google_user_id=?').bind(user.id).first();
 return {userId:link?.principal||'google_'+user.id,email:user.email,fullName:user.user_metadata?.full_name||user.email,provider:'google'};
}
