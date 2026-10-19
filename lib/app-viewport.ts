/** Installed apps must not subtract safe areas from the frame a second time. */
export function appViewportHeight(installed:boolean,layoutHeight:number,visualHeight?:number){
 return Math.round(installed?layoutHeight:(visualHeight||layoutHeight));
}
export function measureAppLayout(){
 const root=document.querySelector('.app-shell'),nav=document.querySelector('.mobile-nav');
 const frame=root?.getBoundingClientRect(),bar=nav?.getBoundingClientRect();
 const viewport=window.visualViewport;
 const installed=document.documentElement.dataset.standalone==='true';
 const height=appViewportHeight(installed,innerHeight,viewport?.height);
 const gap=bar?Math.round(height-bar.bottom):null;
 return {build:document.querySelector('meta[name="shiftly-build"]')?.getAttribute('content')||'development',installed,width:innerWidth,height,innerHeight,visualHeight:Math.round(viewport?.height||innerHeight),frameBottom:frame?Math.round(frame.bottom):null,navBottom:bar?Math.round(bar.bottom):null,gap,keyboard:document.documentElement.dataset.keyboard==='true',zoom:viewport?.scale||1};
}
