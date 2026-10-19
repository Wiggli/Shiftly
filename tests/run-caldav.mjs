import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {build} from 'vite';
const temporary=await mkdtemp(join(tmpdir(),'shiftly-api-'));
let server;
try{
 const runtime=resolve('standalone/server/runtime.ts');
 await build({configFile:false,publicDir:false,plugins:[{name:'isolated-fixture',enforce:'pre',resolveId(id,importer){if(importer&&resolve(importer,'..',id+'.ts')===runtime)return resolve('tests/standalone/api-runtime.ts');}}],build:{outDir:temporary,target:'esnext',minify:false,ssr:'tests/standalone/api-server.ts',rollupOptions:{external:['node:http','node:stream','node:async_hooks','node:sqlite','node:fs'],output:{entryFileNames:'server.mjs',inlineDynamicImports:true}}},ssr:{noExternal:['zod']}});
 const env={...process.env,TEST_API_PORT:process.env.TEST_API_PORT||'8789'};
 server=spawn(process.execPath,[join(temporary,'server.mjs')],{env,stdio:['ignore','pipe','inherit']});
 await new Promise((resolve,reject)=>{let output='';const timeout=setTimeout(()=>reject(Error('Fixture startup timed out')),15000);server.on('exit',code=>{clearTimeout(timeout);reject(Error('Fixture exited '+code));});server.stdout.on('data',chunk=>{output+=chunk;if(output.includes('FIXTURE_READY')){clearTimeout(timeout);resolve();}});});
 process.exitCode=await new Promise(resolve=>{const test=spawn(process.execPath,[process.argv[2]||'tests/caldav.mjs'],{env,stdio:'inherit'});test.on('exit',code=>resolve(code||0));test.on('error',()=>resolve(1));});
}finally{server?.kill();await rm(temporary,{recursive:true,force:true});}
