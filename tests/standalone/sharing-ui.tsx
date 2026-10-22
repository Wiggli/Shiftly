// Bundled only into a temporary test server, never into the Pages artifact.
import React from 'react';
import {createRoot} from 'react-dom/client';
import CalendarApp from '../../app/ui/CalendarApp';
import {AuthenticatedStream} from '../../lib/authenticated-stream';
import '../../app/globals.css';
import '../../app/apple-ui.css';
import '../../app/calendar-screen.css';
import '../../app/week-polish.css';
import '../../app/iphone-refinement.css';
const query=new URLSearchParams(location.search),id=query.get('user')||'fixture-user',name=query.get('name')||'Fixture User';
const identity={id,name,email:id+'@example.invalid',provider:'google'};
const nativeFetch=window.fetch.bind(window);
const apiFetch=(input:any,init:RequestInit={})=>{const headers=new Headers(init.headers);headers.set('x-test-user-id',id);headers.set('x-test-user-email',identity.email);headers.set('x-test-user-name',name);return nativeFetch(input,{...init,headers});};
window.fetch=((input:any,init?:RequestInit)=>new URL(String(input),location.href).pathname.startsWith('/api/')?apiFetch(input,init):nativeFetch(input,init)) as typeof fetch;
window.EventSource=class extends AuthenticatedStream{constructor(url:string){super(url,apiFetch);}} as any;
(window as any).__SHIFTLY_STANDALONE__={base:'/Shiftly/__test__/'};
if(query.get('layout')==='installed')for(const [edge,value] of Object.entries({top:62,bottom:34,left:0,right:0}))document.documentElement.style.setProperty('--safe-'+edge,value+'px');
createRoot(document.getElementById('root')!).render(<CalendarApp identity={identity}/>);
