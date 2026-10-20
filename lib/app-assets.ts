// Resolve bundled assets in both a root-hosted app and GitHub Pages.
export function appAsset(path:string){
 const base=typeof window==='undefined'?'/':(window as any).__SHIFTLY_STANDALONE__?.base||'/';
 return base+path.replace(/^\//,'');
}
