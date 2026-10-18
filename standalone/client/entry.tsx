import React from 'react';
import {createRoot} from 'react-dom/client';
import CalendarApp from '../../app/ui/CalendarApp';
import {client,installTransport} from './runtime';
import '../../app/globals.css';
import '../../app/apple-ui.css';
import '../../app/calendar-screen.css';
installTransport();
const root=createRoot(document.getElementById('root')!);
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
