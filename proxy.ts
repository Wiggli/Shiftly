import {createServerClient} from '@supabase/ssr';
import {NextRequest,NextResponse} from 'next/server';
import {authConfig} from './lib/auth';

export async function proxy(request:NextRequest) {
  const config=authConfig();
  let response=NextResponse.next({request});
  if(!config)return response;
  response.headers.set('Cache-Control','private, no-store');
  if(!request.cookies.getAll().some(c=>/^shiftly-google-session(?:\.\d+)?$/.test(c.name)))return response;
  const client=createServerClient(config.url,config.key,{
    cookieOptions:{name:'shiftly-google-session',httpOnly:true,secure:config.origin.startsWith('https:'),sameSite:'lax',path:'/'},
    cookies:{getAll:()=>request.cookies.getAll(),setAll:(items,cacheHeaders)=>{
      items.forEach(({name,value})=>request.cookies.set(name,value));
      response=NextResponse.next({request});
      items.forEach(({name,value,options})=>response.cookies.set(name,value,options));
      response.headers.set('Cache-Control','private, no-store');
      Object.entries(cacheHeaders).forEach(([name,value])=>response.headers.set(name,value));
    }},
  });
  await client.auth.getClaims();
  return response;
}
export const config={matcher:['/','/api/:path*']};
