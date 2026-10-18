import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'vite';
await build({configFile:false,publicDir:false,build:{outDir:'public/offline-assets',emptyOutDir:true,minify:true,lib:{entry:'offline/entry.tsx',name:'ShiftlyOffline',formats:['iife'],fileName:()=> 'app.js',cssFileName:'app'},rollupOptions:{output:{inlineDynamicImports:true}}},define:{'process.env.NODE_ENV':'"production"'}});

const sw=await readFile('public/sw.js','utf8');
const digest=createHash('sha256');
for(const file of ['public/offline-assets/app.js','public/offline-assets/app.css','public/offline.html','public/manifest.json','public/share/install-qr.svg','public/share/install-guide.html','public/icons/icon-192.png','public/icons/icon-512.png','public/icons/maskable-512.png','public/icons/apple-touch-icon.png'])digest.update(await readFile(file));
digest.update(sw.replace(/const CACHE='[^']+';/,"const CACHE='VERSION';"));
const hash=digest.digest('hex').slice(0,12);
await writeFile('public/sw.js',sw.replace(/const CACHE='[^']+';/,`const CACHE='shiftly-shell-${hash}';`));
