import {AuthenticatedStream} from '../../lib/authenticated-stream';
import {createClient} from '@supabase/supabase-js';
import config from '../config.json';
export const client=createClient(config.supabaseUrl,config.publishableKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'shiftly-account-v1'}});
export const base=config.base;
const originalFetch=window.fetch.bind(window),OriginalEventSource=window.EventSource;
export async function signIn(){const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+base}});if(error)throw error;}
async function apiFetch(path:string,init:RequestInit={}){const {data}=await client.auth.getSession();const headers=new Headers(init.headers);if(data.session)headers.set('Authorization','Bearer '+data.session.access_token);headers.set('apikey',config.publishableKey);return originalFetch(config.apiUrl+path,{...init,headers,credentials:'omit'});}
export function installTransport(){
 window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const raw=input instanceof Request?input.url:String(input),url=new URL(raw,location.href);
  if(url.origin===location.origin&&url.pathname.startsWith('/api/'))return apiFetch(url.pathname+url.search,input instanceof Request?{method:input.method,headers:input.headers,body:input.body,signal:input.signal,...init}:init);
  if(url.origin===location.origin&&url.pathname==='/auth/signout'){const {error}=await client.auth.signOut();return Response.json(error?{error:error.message}:{next:base},{status:error?400:200});}
  return originalFetch(input,init);
 }) as typeof fetch;
 window.EventSource=class extends AuthenticatedStream{constructor(url:string|URL){const parsed=new URL(String(url),location.href);if(parsed.origin!==location.origin||!parsed.pathname.startsWith('/api/'))return new OriginalEventSource(url) as any;super(parsed.pathname+parsed.search,apiFetch);}} as any;
 // Keep asset requests inside this repository's Pages scope, including existing root-relative UI images.
 const imageObserver=new MutationObserver(()=>{document.querySelectorAll<HTMLAnchorElement>('a[href^="/share/"]').forEach(link=>link.href=base+link.getAttribute('href')!.slice(1));document.querySelectorAll<HTMLImageElement>('img[src^="/icons/"],img[src^="/share/"]').forEach(img=>img.src=base+img.getAttribute('src')!.slice(1));});imageObserver.observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('click',event=>{const link=(event.target as HTMLElement).closest?.('a[href^="/auth/google"]');if(link){event.preventDefault();void signIn().catch(error=>alert(error.message));}});
 (window as any).__SHIFTLY_STANDALONE__={signIn,base};
}
