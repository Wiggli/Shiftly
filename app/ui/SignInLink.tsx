'use client';
import React,{useEffect,useState} from 'react';
export default function SignInLink({children,className='primary'}:{children:React.ReactNode;className?:string}){
 const [returnTo,setReturnTo]=useState('/');
 useEffect(()=>{setReturnTo(location.pathname+location.search+location.hash);},[]);
 return <a className={className} href={'/auth/google?return_to='+encodeURIComponent(returnTo)} target="_top">{children}</a>;
}
