'use client';
import {useLayoutEffect,useState} from 'react';

// Open tabs at their heading so sticky chrome cannot conceal page actions.
export function useAppPage(scope:string){
 const [page,setPage]=useState('Calendar');
 useLayoutEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[page,scope]);
 function navigate(next:string){
  if(page===next)window.scrollTo({top:0,behavior:'instant'});
  else setPage(next);
 }
 return [page,navigate] as const;
}
