import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const runtime=mkdtempSync(join(tmpdir(),'shiftly-caldav-'));
process.on('exit',()=>rmSync(runtime,{recursive:true,force:true}));
const runtimeEnv={...process.env,WRANGLER_REGISTRY_PATH:join(runtime,'dev-registry'),MINIFLARE_REGISTRY_PATH:join(runtime,'registry')};
for(const file of readdirSync('drizzle').filter(name=>name.endsWith('.sql')).sort()){
 const seed=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--config','dist/server/wrangler.json','--local','--persist-to',join(runtime,'state'),'--file',join('drizzle',file)],{env:runtimeEnv,encoding:'utf8'});
 if(seed.status!==0){console.error(seed.stderr||seed.stdout);process.exit(1);}
}
const port=process.env.TEST_API_PORT||'8789';
const server=spawn(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to',join(runtime,'state'),'--ip','127.0.0.1','--port',port,'--inspector-port','0'],{env:runtimeEnv,stdio:['ignore','pipe','pipe'],detached:true});let ready=false,output='';
const timeout=setTimeout(()=>{try{process.kill(-server.pid,'SIGTERM');}catch{}process.exit(1);},120000);
for(const stream of [server.stdout,server.stderr])stream.on('data',chunk=>{output+=chunk;if(!ready&&output.includes(`Ready on http://127.0.0.1:${port}`)){ready=true;const test=spawn('node',[process.argv[2]||'tests/caldav.mjs'],{env:{...process.env,TEST_API_PORT:port},stdio:'inherit'});test.on('exit',code=>{if(code)console.error(output.slice(-8000));clearTimeout(timeout);try{process.kill(-server.pid,'SIGTERM');}catch{}process.exit(code||0);});}});
server.on('exit',code=>{if(!ready){console.error(output.slice(-3000));clearTimeout(timeout);process.exitCode=code||1;}});
