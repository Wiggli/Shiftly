import React from 'react';
import {createRoot} from 'react-dom/client';
import CalendarApp from '../../app/ui/CalendarApp';
import {demoCalendar} from './demo';
import '../../app/globals.css';
import '../../app/apple-ui.css';
import '../../app/calendar-screen.css';
import '../../app/iphone-refinement.css';
const root=createRoot(document.getElementById('root')!);
const preview=new URLSearchParams(location.search);
if(preview.get("preview")==="demo"&&preview.get("layout")==="installed"){for(const [edge,value] of Object.entries({top:62,bottom:34,left:0,right:0}))document.documentElement.style.setProperty("--safe-"+edge,value+"px");}
if(preview.get("preview")==="demo"){document.addEventListener("click",event=>{if((event.target as HTMLElement).closest?.('a[href^="/auth/"]')){event.preventDefault();window.open(new URL(".",location.href).href,"_blank","noopener");}});const date=preview.get("date")||"2026-10-19";root.render(<CalendarApp identity={null} previewState={demoCalendar(date,preview.get("roster")||"dates")} previewTheme={preview.get("theme")==="dark"?"dark":"light"}/>);}
else void start();
async function start(){
const {client,installTransport}=await import("./runtime");installTransport();
let generation=0;
async function render(){
 const current=++generation;let identity=null;
 try{
  const {data,error}=await client.auth.getUser();
  if(error)throw error;
  if(data.user){const response=await fetch('/api/session');if(!response.ok)throw Error('Session unavailable');identity=((await response.json()) as any).identity;localStorage.setItem('shiftly-last-identity',JSON.stringify(identity));}
  else localStorage.removeItem('shiftly-last-identity');
 }catch{
  if(!navigator.onLine)try{identity=JSON.parse(localStorage.getItem('shiftly-last-identity')||'null');}catch{}
 }
 if(current===generation)root.render(<CalendarApp key={identity?.id||'guest'} identity={identity}/>);
}
void render();client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')localStorage.removeItem('shiftly-last-identity');setTimeout(()=>void render(),0);});

}
