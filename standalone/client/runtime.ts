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
 class AuthenticatedStream{
  onmessage:((event:MessageEvent)=>void)|null=null;onerror:((event:Event)=>void)|null=null;private controller=new AbortController();private closed=false;
  constructor(private path:string){void this.connect();}
  async connect(){while(!this.closed){try{const response=await apiFetch(this.path,{signal:this.controller.signal});if(!response.ok||!response.body)throw Error('Stream unavailable');const reader=response.body.pipeThrough(new TextDecoderStream()).getReader();let buffer='';try{for(;;){const {done,value}=await reader.read();if(done)break;buffer+=value;let end;while((end=buffer.indexOf('\n\n'))>=0){const message=buffer.slice(0,end);buffer=buffer.slice(end+2);const data=message.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');if(data)this.onmessage?.(new MessageEvent('message',{data}));}}}finally{reader.releaseLock();}}catch{if(!this.closed)this.onerror?.(new Event('error'));}if(!this.closed)await new Promise(resolve=>setTimeout(resolve,3000));}}
  close(){this.closed=true;this.controller.abort();}
 }
 window.EventSource=class extends AuthenticatedStream{constructor(url:string|URL){const parsed=new URL(String(url),location.href);if(parsed.origin!==location.origin||!parsed.pathname.startsWith('/api/'))return new OriginalEventSource(url) as any;super(parsed.pathname+parsed.search);}} as any;
 // Keep asset requests inside this repository's Pages scope, including existing root-relative UI images.
 const imageObserver=new MutationObserver(()=>{document.querySelectorAll<HTMLAnchorElement>('a[href^="/share/"]').forEach(link=>link.href=base+link.getAttribute('href')!.slice(1));document.querySelectorAll<HTMLImageElement>('img[src^="/icons/"],img[src^="/share/"]').forEach(img=>img.src=base+img.getAttribute('src')!.slice(1));});imageObserver.observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('click',event=>{const link=(event.target as HTMLElement).closest?.('a[href^="/auth/google"]');if(link){event.preventDefault();void signIn().catch(error=>alert(error.message));}});
 (window as any).__SHIFTLY_STANDALONE__={signIn,base};
}
