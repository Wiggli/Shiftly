import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,extname} from 'node:path';
import {build} from 'vite';
const temporary=await mkdtemp(join(tmpdir(),'shiftly-sharing-ui-'));
const input=join(temporary,'index.html');
await writeFile(input,'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/></head><body><div id="root"></div><script type="module" src="'+resolve('tests/standalone/sharing-ui.tsx')+'"></script></body></html>');
await build({root:temporary,configFile:false,publicDir:false,base:'/Shiftly/__test__/',build:{outDir:join(temporary,'dist'),rollupOptions:{input}}});
const preview=spawn('pnpm',['start','--host','127.0.0.1','--port','4174','--strictPort'],{stdio:'inherit'});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1:4173');
 if(url.pathname.startsWith('/Shiftly/__test__/')){const path=url.pathname.slice('/Shiftly/__test__/'.length)||'index.html';if(path.includes('..'))throw Error('Invalid path');const body=await readFile(join(temporary,'dist',path));res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);return;}
 const chunks=[];for await(const chunk of req)chunks.push(chunk);
 const port=url.pathname.startsWith('/api/')?process.env.TEST_API_PORT:4174;
 const response=await fetch('http://127.0.0.1:'+port+url.pathname+url.search,{method:req.method,headers:req.headers,body:chunks.length?Buffer.concat(chunks):undefined});
 res.writeHead(response.status,Object.fromEntries(response.headers));
 if(response.body){const reader=response.body.getReader();res.on('close',()=>reader.cancel().catch(()=>{}));for(;;){const {done,value}=await reader.read();if(done)break;res.write(value);}}res.end();
 }catch{if(!res.headersSent)res.writeHead(503);res.end();}});
server.listen(4173,'127.0.0.1');
async function cleanup(){server.close();preview.kill();await rm(temporary,{recursive:true,force:true});process.exit(0);}
process.on('SIGTERM',cleanup);process.on('SIGINT',cleanup);
