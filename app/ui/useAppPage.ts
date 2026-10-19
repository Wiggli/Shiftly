'use client';
import {useLayoutEffect,useState} from 'react';

// Open tabs at their heading so sticky chrome cannot conceal page actions.
function resetScroll(){window.scrollTo({top:0,behavior:'instant'});document.querySelector<HTMLElement>('.content')?.scrollTo({top:0,behavior:'instant'});}
export function useAppPage(scope:string){
 const [page,setPage]=useState('Calendar');
 useLayoutEffect(resetScroll,[page,scope]);
 function navigate(next:string){
  if(page===next)resetScroll();
  else setPage(next);
 }
 return [page,navigate] as const;
}
