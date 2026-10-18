// Rasterize the original SVG mark using the existing build toolchain's Sharp package.
import {mkdir,writeFile,readdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let sharp;try{sharp=(await import('sharp')).default;}catch{const name=(await readdir(path.join(root,'node_modules/.pnpm'))).find(n=>n.startsWith('sharp@'));if(!name)throw Error('Install the project build dependencies first.');sharp=(await import(pathToFileURL(path.join(root,'node_modules/.pnpm',name,'node_modules/sharp/dist/index.cjs')).href)).default;}
const dir=path.join(root,'public/icons');await mkdir(dir,{recursive:true});
// Three shift blocks keep the calendar recognisable without tiny lettering.
const mark='<rect x="13" y="18" width="38" height="36" rx="8" fill="#ffffff"/><path d="M23 12v10M41 12v10" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round"/><path d="M28 22 32 24 36 22 34 26 38 24 36 28 38 32 34 30 36 34 32 32 28 34 30 30 26 32 28 28 26 24 30 26Z" transform="translate(32 28) scale(.8) translate(-32 -28)" fill="#ce1126"/><rect x="19" y="35" width="7" height="13" rx="2.5" fill="#e14756"/><rect x="29" y="35" width="7" height="13" rx="2.5" fill="#94172b"/><rect x="39" y="35" width="7" height="13" rx="2.5" fill="#e2b3bb"/>';
const badge='<defs><mask id="badge"><rect width="64" height="64" fill="white"/><path d="M28 22 32 24 36 22 34 26 38 24 36 28 38 32 34 30 36 34 32 32 28 34 30 30 26 32 28 28 26 24 30 26Z" transform="translate(32 28) scale(.8) translate(-32 -28)" fill="black"/><rect x="19" y="35" width="7" height="13" rx="2.5" fill="black"/><rect x="29" y="35" width="7" height="13" rx="2.5" fill="black"/><rect x="39" y="35" width="7" height="13" rx="2.5" fill="black"/></mask></defs><g mask="url(#badge)"><rect x="13" y="18" width="38" height="36" rx="8" fill="white"/><path d="M23 12v10M41 12v10" stroke="white" stroke-width="4.5" stroke-linecap="round"/></g>';
for(const [name,size,mask] of [['icon-192',192,false],['icon-512',512,false],['apple-touch-icon',180,false],['maskable-512',512,true],['badge-96',96,false]]){
 const bg=name==='badge-96'?'':'<rect width="64" height="64" fill="#ce1126"/>';
 const drawing=name==='badge-96'?badge:mask?'<g transform="translate(6.4 6.4) scale(.8)">'+mark+'</g>':mark;
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'+bg+drawing+'</svg>';
 await writeFile(path.join(dir,name+'.svg'),svg);
 await sharp(Buffer.from(svg)).resize(size,size).png().toFile(path.join(dir,name+'.png'));
}
await writeFile(path.join(root,'public/favicon.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#ce1126"/>'+mark+'</svg>');
