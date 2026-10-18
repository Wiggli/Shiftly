'use client';
import {useLayoutEffect,useRef,useState} from 'react';

// Keep each screen's place in memory; never put roster data or drafts in history.
export function useAppPage(scope:string){
 const [page,setPage]=useState('Calendar');
 const current=useRef(page),positions=useRef<Record<string,number>>({}),activeScope=useRef(scope);
 useLayoutEffect(()=>{if(activeScope.current!==scope){positions.current={};activeScope.current=scope;}window.scrollTo({top:positions.current[page]||0,behavior:'instant'});},[page,scope]);
 function navigate(next:string){
  if(current.current===next){window.scrollTo({top:0,behavior:'instant'});return;}
  positions.current[current.current]=window.scrollY;current.current=next;setPage(next);
 }
 return [page,navigate] as const;
}
