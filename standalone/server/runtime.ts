import {AsyncLocalStorage} from 'node:async_hooks';
import {Database} from './database';
export const contextStorage=new AsyncLocalStorage<{user:any}>();
const values={url:Deno.env.get('SUPABASE_URL')!,service:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!};
export const env={DB:new Database(values.url,values.service),API_ORIGIN:new URL(values.url).origin,APP_ORIGIN:Deno.env.get('SHIFTLY_APP_ORIGIN')||'https://wiggli.github.io'};
export async function getAppUser(){return contextStorage.getStore()?.user||null;}
// Profile fields are presentation only; ownership still comes from the verified user id.
export function googleAvatar(user:any):string|null{
 const google=user.identities?.find((identity:any)=>identity.provider==='google')?.identity_data;
 for(const value of [google?.avatar_url,google?.picture,user.user_metadata?.avatar_url,user.user_metadata?.picture]){
  if(typeof value!=='string')continue;
  try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password)return url.href;}catch{}
 }
 return null;
}
export function sessionIdentity(user:any){return {id:user.userId,name:user.fullName,email:user.email,provider:'google',avatarUrl:user.avatarUrl||null};}
export async function authenticatedUser(request:Request){
 const token=/^Bearer (.+)$/i.exec(request.headers.get('authorization')||'')?.[1];if(!token)return null;
 const response=await fetch(values.url+'/auth/v1/user',{headers:{apikey:values.service,Authorization:'Bearer '+token}});if(!response.ok)return null;
 const user:any=await response.json();if(!user.email_confirmed_at||!user.email||!user.identities?.some((identity:any)=>identity.provider==='google'))return null;
 const link:any=await env.DB.prepare('SELECT principal FROM identity_links WHERE google_user_id=?').bind(user.id).first();
 return {userId:link?.principal||'google_'+user.id,email:user.email,fullName:user.user_metadata?.full_name||user.email,provider:'google',avatarUrl:googleAvatar(user)};
}
