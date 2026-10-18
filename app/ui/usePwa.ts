'use client';
import {useEffect,useRef,useState} from 'react';
import {canActivateUpdate} from '../../lib/pwa-update';
type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
export function usePwa(){
 const [installed,setInstalled]=useState(false),[ios,setIos]=useState(false),[mobile,setMobile]=useState(false),[prompt,setPrompt]=useState<InstallPrompt|null>(null),[ready,setReady]=useState(false),[update,setUpdate]=useState(false),[online,setOnline]=useState(true),[error,setError]=useState(''),[dismissed,setDismissed]=useState(true),[persistent,setPersistent]=useState<boolean|null>(null),[updating,setUpdating]=useState(false);
 const registration=useRef<ServiceWorkerRegistration|null>(null),refreshRequested=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{
  let alive=true;const standalone=matchMedia('(display-mode: standalone)'),platformIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  setIos(platformIOS);setMobile(platformIOS||/Android/.test(navigator.userAgent));
  try{setDismissed(Date.now()-Number(localStorage.getItem('shiftly-install-dismissed')||0)<7*86400000);}catch{setDismissed(false);}
  const display=()=>{const value=standalone.matches||!!(navigator as any).standalone;setInstalled(value);document.documentElement.dataset.standalone=String(value);};display();standalone.addEventListener('change',display);
  const connection=()=>setOnline(navigator.onLine);connection();window.addEventListener('online',connection);window.addEventListener('offline',connection);
  const before=(e:Event)=>{e.preventDefault();setPrompt(e as InstallPrompt);};const complete=()=>{setInstalled(true);setPrompt(null);document.documentElement.dataset.standalone='true';};window.addEventListener('beforeinstallprompt',before);window.addEventListener('appinstalled',complete);
  const viewport=()=>{const v=window.visualViewport;const height=Math.round(v?.height||innerHeight),inset=Math.max(0,innerHeight-height-(v?.offsetTop||0));document.documentElement.style.setProperty('--visible-height',height+'px');document.documentElement.style.setProperty('--visible-top',Math.max(0,v?.offsetTop||0)+'px');document.documentElement.style.setProperty('--keyboard-inset',inset+'px');const active=document.activeElement;document.documentElement.dataset.keyboard=String(!!active&&/INPUT|TEXTAREA|SELECT/.test(active.tagName)&&((innerHeight-height)>120));};viewport();window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);window.addEventListener('resize',viewport);document.addEventListener('focusin',viewport);document.addEventListener('focusout',viewport);
  navigator.storage?.persisted?.().then(value=>{if(alive)setPersistent(value);}).catch(()=>{});
  let controlled=!!navigator.serviceWorker?.controller;let lastCheck=0;const check=()=>{if(document.visibilityState!=='visible'||!navigator.onLine||Date.now()-lastCheck<60000)return;lastCheck=Date.now();registration.current?.update().catch(()=>{});};
  const changed=()=>{if(refreshRequested.current){location.reload();return;}if(alive){setReady(true);if(controlled)setUpdate(true);controlled=true;}};
  if('serviceWorker' in navigator){navigator.serviceWorker.addEventListener('controllerchange',changed);navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(reg=>{if(!alive)return;registration.current=reg;if(reg.active)setReady(true);if(reg.waiting)setUpdate(true);const watch=(worker:ServiceWorker|null)=>{if(!worker)return;worker.addEventListener('statechange',()=>{if(!alive)return;if(worker.state==='installed'&&navigator.serviceWorker.controller)setUpdate(true);if(worker.state==='activated')setReady(true);});};watch(reg.installing);reg.addEventListener('updatefound',()=>watch(reg.installing));check();}).catch(()=>{if(alive)setError('Offline preparation failed. Reconnect and reopen the app to try again.');});}
  document.addEventListener('visibilitychange',check);window.addEventListener('online',check);window.addEventListener('pageshow',check);const interval=setInterval(check,5*60*1000);
  return()=>{alive=false;standalone.removeEventListener('change',display);window.removeEventListener('online',connection);window.removeEventListener('offline',connection);window.removeEventListener('beforeinstallprompt',before);window.removeEventListener('appinstalled',complete);window.visualViewport?.removeEventListener('resize',viewport);window.visualViewport?.removeEventListener('scroll',viewport);window.removeEventListener('resize',viewport);document.removeEventListener('focusin',viewport);document.removeEventListener('focusout',viewport);document.removeEventListener('visibilitychange',check);window.removeEventListener('online',check);window.removeEventListener('pageshow',check);clearInterval(interval);if(timer.current)clearTimeout(timer.current);navigator.serviceWorker?.removeEventListener('controllerchange',changed);};
 },[]);
 async function install(){if(!prompt)return false;try{await prompt.prompt();const result=await prompt.userChoice;setPrompt(null);return result.outcome==='accepted';}catch{setError('Use your browser’s Install app or Add to Home Screen menu instead.');return false;}}
 function dismiss(){setDismissed(true);try{localStorage.setItem('shiftly-install-dismissed',String(Date.now()));}catch{}}
 async function protect(){try{const value=await navigator.storage?.persist?.();setPersistent(!!value);if(!value)setError('Your browser manages storage automatically. Keep a backup of important rosters.');}catch{setError('Your browser manages storage automatically. Keep a backup of important rosters.');}}
 async function applyUpdate(){if(!online||refreshRequested.current)return;setUpdating(true);setError('');refreshRequested.current=true;const waiting=registration.current?.waiting;if(waiting){waiting.postMessage({type:'ACTIVATE_UPDATE'});timer.current=setTimeout(()=>{refreshRequested.current=false;setUpdating(false);setError('The update is still preparing. Close other Shiftly windows, then try again.');},10000);}else location.reload();}
 async function checkUpdate(){try{await registration.current?.update();if(registration.current?.waiting)setUpdate(true);}catch{setError('Reconnect to check for an update.');}}
 return {installed,ios,mobile,canPrompt:!!prompt,install,ready,update,online,error,dismissed,dismiss,persistent,protect,applyUpdate,updating,checkUpdate};
}

export function useAutomaticUpdate(pwa:ReturnType<typeof usePwa>,safe:boolean){
 const latest=useRef({pwa,safe});latest.current={pwa,safe};
 const attempted=useRef(false);
 useEffect(()=>{
  if(!pwa.update){attempted.current=false;return;}
  if(!safe||!pwa.online||pwa.updating||attempted.current)return;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const schedule=()=>{
   if(timer)clearTimeout(timer);
   timer=setTimeout(()=>{
    const {pwa:current,safe:allowed}=latest.current;
    const active=document.activeElement;
    const editing=!!active&&(!!(active as HTMLElement).isContentEditable||/INPUT|TEXTAREA|SELECT/.test(active.tagName));
    if(attempted.current||!canActivateUpdate({ready:current.update,safe:allowed,online:current.online,visible:document.visibilityState==='visible',editing,updating:current.updating}))return;
    attempted.current=true;void current.applyUpdate();
   },10000);
  };
  const events=['pointerdown','keydown','focusin','focusout','scroll','visibilitychange'];
  events.forEach(event=>document.addEventListener(event,schedule,{passive:true}));schedule();
  return()=>{if(timer)clearTimeout(timer);events.forEach(event=>document.removeEventListener(event,schedule));};
 },[pwa.update,pwa.online,pwa.updating,safe]);
}
