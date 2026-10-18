import {build} from 'vite';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=process.cwd(),runtime=resolve(root,'standalone/server/runtime.ts');
await build({configFile:false,publicDir:false,plugins:[{name:'standalone-platform',enforce:'pre',resolveId(id,importer){if(id==='cloudflare:workers')return runtime;if((importer&&importer.includes('/lib/server')&&id==='./auth')||id.endsWith('/lib/auth.ts'))return runtime;}}],build:{outDir:'supabase/functions/shiftly-api',emptyOutDir:true,target:'esnext',minify:false,ssr:'standalone/server/index.ts',rollupOptions:{external:['node:async_hooks'],output:{entryFileNames:'index.js',inlineDynamicImports:true}}},ssr:{noExternal:['zod']}});
