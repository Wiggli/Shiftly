import {env,contextStorage,authenticatedUser,sessionIdentity} from './runtime';
import * as calendar from '../../app/api/calendar/route';
import * as account from '../../app/api/calendar/caldav/route';
import * as feed from '../../app/api/calendar/feed/route';
import * as live from '../../app/api/live/route';
import {handleCalDAV} from '../../lib/caldav';
const prefix='/functions/v1/shiftly-api',allowed=new Set([new URL(env.APP_ORIGIN).origin]);
function cors(request:Request,response:Response){const headers=new Headers(response.headers),origin=request.headers.get('origin');if(origin&&allowed.has(origin)){headers.set('Access-Control-Allow-Origin',origin);headers.set('Vary','Origin');}headers.set('Access-Control-Allow-Methods','GET,HEAD,POST,OPTIONS,PROPFIND,PROPPATCH,REPORT,PUT,DELETE');headers.set('Access-Control-Allow-Headers','Authorization,Content-Type,apikey,Depth,If-Match,If-None-Match');headers.set('Access-Control-Expose-Headers','ETag,Location,DAV,Allow');headers.set('Cache-Control','private, no-store');headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');return new Response(response.body,{status:response.status,headers});}
export async function handleRequest(request:Request){
 const original=new URL(request.url),origin=request.headers.get('origin');if(origin&&!allowed.has(origin))return new Response('Forbidden',{status:403});
 if(request.method==='OPTIONS'&&request.headers.has('access-control-request-method'))return cors(request,new Response(null,{status:204}));
 const path=original.pathname.replace(/^\/(?:functions\/v1\/)?shiftly-api(?=\/|$)/,'')||'/';
 if(path==='/health')return cors(request,Response.json({application:'Shiftly',runtime:'Supabase',database:'Postgres',auth:'Google',version:1}));
 try{
  const internal=new URL(path+original.search,original.origin),headers=new Headers(request.headers);headers.set('origin',internal.origin);
  let body:string|undefined;
  if(!['GET','HEAD'].includes(request.method)){body=await request.text();if(body.length>220000)return cors(request,new Response('Request too large',{status:413}));if(['REPORT','PROPFIND','PROPPATCH'].includes(request.method))body=body.replace(/(<(?:[\w-]+:)?href\b[^>]*>)([^<]+)(<\/)/gi,(_,a,value,b)=>a+value.replace(prefix+'/api/','/api/')+b);}
  const req=new Request(internal,{method:request.method,headers,body,signal:request.signal});
  const dav=path==='/api/caldav'||path.startsWith('/api/caldav/')||path==='/.well-known/caldav';
  const isFeed=path==='/api/calendar/feed'&&request.method==='GET';
  const user=dav||isFeed?null:await authenticatedUser(request);
  if(!dav&&!isFeed&&!user)return cors(request,Response.json({error:'UNAUTHENTICATED'},{status:401}));
  const response=await contextStorage.run({user},async()=>{
   if(dav)return handleCalDAV(req);
   if(path==='/api/session'&&request.method==='GET'&&user)return Response.json({identity:sessionIdentity(user)});
   if(path==='/api/calendar')return request.method==='GET'?calendar.GET(req):request.method==='POST'?calendar.POST(req):new Response(null,{status:405});
   if(path==='/api/calendar/caldav'&&request.method==='POST')return account.POST(req);
   if(path==='/api/calendar/feed')return request.method==='GET'?feed.GET(req):request.method==='POST'?feed.POST(req):new Response(null,{status:405});
   if(path==='/api/live'&&request.method==='GET')return live.GET(req);
   return new Response('Not found',{status:404});
  });
  const outputHeaders=new Headers(response.headers);const location=outputHeaders.get('location');if(location)outputHeaders.set('location',location.startsWith('/api/')?prefix+location:location);
  const contentType=response.headers.get('content-type')||'';
  if(contentType.includes('application/json')){
   const data:any=await response.json();for(const key of ['url','webcal'])if(typeof data[key]==='string')data[key]=data[key].replace(original.host+'/api/',original.host+prefix+'/api/');return cors(request,Response.json(data,{status:response.status,headers:outputHeaders}));
  }
  if(contentType.includes('xml')){const xml=await response.text();return cors(request,new Response(xml.replace(/(<(?:[\w-]+:)?href\b[^>]*>)([^<]+)(<\/)/gi,(_,a,value,b)=>a+value.replace(/^\/api\//,prefix+'/api/')+b),{status:response.status,headers:outputHeaders}));}
  return cors(request,new Response(response.body,{status:response.status,headers:outputHeaders}));
 }catch{console.error('Shiftly backend request failed');return cors(request,Response.json({error:'The request could not be completed. Please try again.'},{status:503}));}
}
Deno.serve(handleRequest);
