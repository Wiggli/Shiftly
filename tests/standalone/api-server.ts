import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {contextStorage} from './api-runtime';
import * as calendar from '../../app/api/calendar/route';
import * as account from '../../app/api/calendar/caldav/route';
import * as feed from '../../app/api/calendar/feed/route';
import * as live from '../../app/api/live/route';
import {handleCalDAV} from '../../lib/caldav';
import {secureResponse} from '../../lib/security';
const server=createServer(async(incoming,outgoing)=>{
 try{
  const chunks=[];for await(const chunk of incoming)chunks.push(chunk);
  const root='http://127.0.0.1:'+process.env.TEST_API_PORT;
  const headers=new Headers(incoming.headers as any);headers.set('origin',root);
  const req=new Request(root+incoming.url,{method:incoming.method,headers,body:chunks.length?Buffer.concat(chunks):undefined});
  const path=new URL(req.url).pathname,id=req.headers.get('x-test-user-id'),email=req.headers.get('x-test-user-email');
  const result=await contextStorage.run(id?{userId:id,email,provider:'google'}:null,async()=>{
   if(path==='/api/calendar')return req.method==='POST'?calendar.POST(req):calendar.GET(req);
   if(path==='/api/calendar/caldav')return account.POST(req);
   if(path==='/api/calendar/feed')return req.method==='POST'?feed.POST(req):feed.GET(req);
   if(path==='/api/live')return live.GET(req);
   return handleCalDAV(req);
  });
  const response=secureResponse(req,result);
  outgoing.writeHead(response.status,Object.fromEntries(response.headers));
  if(response.body)Readable.fromWeb(response.body as any).pipe(outgoing);else outgoing.end();
 }catch(error){console.error(error);outgoing.writeHead(500);outgoing.end('Fixture failed');}
});
server.listen(Number(process.env.TEST_API_PORT),'127.0.0.1',()=>console.log('FIXTURE_READY'));
