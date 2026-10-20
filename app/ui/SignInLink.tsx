'use client';
import React,{useEffect,useState} from 'react';
export default function SignInLink({children,className='primary'}:{children:React.ReactNode;className?:string}){
 const [returnTo,setReturnTo]=useState('/');
 useEffect(()=>{setReturnTo(location.pathname+location.search+location.hash);},[]);
 return <a onClick={event=>{const standalone=(window as any).__SHIFTLY_STANDALONE__;if(typeof standalone?.signIn==='function'){event.preventDefault();void standalone.signIn().catch((error:Error)=>alert(error.message));}}} className={className} href={'/auth/google?return_to='+encodeURIComponent(returnTo)} target="_top">{children}</a>;
}
