import React from 'react';
import {createRoot} from 'react-dom/client';
import CalendarApp from '../../app/ui/CalendarApp';
import {demoCalendar} from './demo';
import config from '../config.json';
import AppLoading from '../../app/ui/AppLoading';
import {loadAccountIdentity} from '../../lib/account-bootstrap';
import '../../app/globals.css';
import '../../app/apple-ui.css';
import '../../app/calendar-screen.css';
import '../../app/week-polish.css';
import '../../app/iphone-refinement.css';
import '../../app/mobile-nav-fix.css';
const root=createRoot(document.getElementById('root')!);
const preview=new URLSearchParams(location.search);
if(preview.get("preview")==="demo"&&preview.get("layout")==="installed"){for(const [edge,value] of Object.entries({top:62,bottom:34,left:0,right:0}))document.documentElement.style.setProperty("--safe-"+edge,value+"px");}
if(preview.get("preview")==="demo"){(window as any).__SHIFTLY_STANDALONE__={base:config.base};document.addEventListener("click",event=>{if((event.target as HTMLElement).closest?.('a[href^="/auth/"]')){event.preventDefault();window.open(new URL(".",location.href).href,"_blank","noopener");}});const date=preview.get("date")||"2026-10-19";root.render(<CalendarApp identity={null} previewState={demoCalendar(date,preview.get("roster")||"dates")} previewTheme={preview.get("theme")==="dark"?"dark":"light"}/>);}
else{
 root.render(<AppLoading/>);
 void start().catch(()=>root.render(<AppLoading status="Shiftly could not finish opening. Reconnect and try again; your saved calendar has not been changed."><button className="primary" onClick={()=>location.reload()}>Try again</button></AppLoading>));
}
async function start(){
const {client,installTransport}=await import("./runtime");installTransport();
let generation=0,opened=false;
async function render(){
 const current=++generation;let identity=null;
 if(!opened)root.render(<AppLoading/>);
 try{
 identity=await loadAccountIdentity({
  session:async()=>{const {data,error}=await client.auth.getSession();if(error)throw error;return data.session;},
  user:async()=>{const {data,error}=await client.auth.getUser();if(error)throw error;return data.user;},
  identity:async()=>{const response=await fetch('/api/session',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Session unavailable');return ((await response.json()) as any).identity;},
  cached:()=>{try{return JSON.parse(localStorage.getItem('shiftly-last-identity')||'null');}catch{return null;}},
  online:()=>navigator.onLine
 });
 if(current!==generation)return;
 try{if(identity)localStorage.setItem('shiftly-last-identity',JSON.stringify(identity));else localStorage.removeItem('shiftly-last-identity');}catch{}
 }catch(error){
  if(current===generation&&!opened)root.render(<AppLoading status={error instanceof Error?error.message:'Your account could not be reached.'}><button className="primary" onClick={()=>void render()}>Try again</button></AppLoading>);
  return;
 }
 if(current===generation){opened=true;root.render(<CalendarApp key={identity?.id||'guest'} identity={identity}/>);}
}
void render();client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')localStorage.removeItem('shiftly-last-identity');setTimeout(()=>void render(),0);});

}
