'use client';
import {createContext,useEffect,useRef,useState} from 'react';
import {SheetNavigation} from '../../lib/sheet-navigation';
export const SheetBackContext=createContext<{register:(callback:()=>void)=>()=>void}|null>(null);
export function useSheetNavigation(){
 const [stack,setStack]=useState<string[]>([]),controller=useRef<SheetNavigation|null>(null);
 // Navigation is invoked only by browser events/effects, after mounting.
 function get(){if(!controller.current)controller.current=new SheetNavigation(window.history,setStack,crypto.randomUUID());return controller.current;}
 const context=useRef({register:(callback:()=>void)=>{const nav=get();nav.override=callback;return()=>{if(nav.override===callback)nav.override=null;};}}).current;
 useEffect(()=>{const pop=(event:PopStateEvent)=>get().pop(event.state);window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[]);
 return {hasSheet:(name:string)=>stack.includes(name),modal:stack.at(-1)||'',setModal:(name:string)=>name?get().open(name):get().back(),closeAll:()=>get().closeAll(),context};
}
