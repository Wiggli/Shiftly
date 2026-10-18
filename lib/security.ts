/** Bound the stream before parsing, including requests without Content-Length. */
export async function readMutation(request:Request){
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))throw Error('Expected a JSON request');
 const limit=200000,length=Number(request.headers.get('content-length')||0);
 if(length>limit)throw Error('Request too large');
 const reader=request.body?.getReader();if(!reader)throw Error('Invalid request');
 const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('Request too large');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 let body:any;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw Error('Invalid request');}
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Invalid request');return body;
}
export function secureResponse(request:Request,response:Response){
 const result=new Response(response.body,response),path=new URL(request.url).pathname;
 result.headers.set('X-Content-Type-Options','nosniff');
 result.headers.set('Referrer-Policy','no-referrer');
 result.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 if(new URL(request.url).protocol==='https:')result.headers.set('Strict-Transport-Security','max-age=31536000');
 if(path==='/'||path.startsWith('/api/')||path.startsWith('/auth/')){
  result.headers.set('Cache-Control','private, no-store');result.headers.set('Pragma','no-cache');
  result.headers.set('Vary',[result.headers.get('Vary'),'Cookie','oai-authenticated-user-id'].filter(Boolean).join(', '));
 }
 if(!result.headers.has('Content-Security-Policy'))result.headers.set('Content-Security-Policy',"base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com");
 return result;
}
/** Never restore an optimistic copy with broader permissions than the fresh server grant. */
export function cachedAccessChanged(cached:any,fresh:any){
 if(!cached)return false;
 return cached.role!==fresh.role||(cached.rosterScope||null)!==(fresh.rosterScope||null)||
  (cached.calendar?.rosterScope||null)!==(fresh.calendar?.rosterScope||null);
}
/** Another author's cached event is never more visible than its fresh server representation. */
export function redactCachedEvents(cached:any,fresh:any,accountId:string){
 const allowed=new Map((fresh.events||[]).map((event:any)=>[event.id,event]));
 return {...cached,events:(cached.events||[]).flatMap((event:any)=>event.author===accountId||!event.author?[event]:allowed.has(event.id)?[allowed.get(event.id)]:[])};
}
