'use client';
import React,{useEffect,useState} from 'react';
import {Settings,Share2,Shield,LogOut,ChevronRight} from 'lucide-react';
import {Sheet} from './primitives';
import SignInLink from './SignInLink';
import {cacheRemoveAccount} from '../../lib/offline';

export function AccountAvatar({identity,large=false}:any){
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[identity?.avatarUrl]);
  const name=identity?.name||'Personal';
  const initials=name.includes('@')?name[0]:name.trim().split(/\s+/).slice(0,2).map((word:string)=>word[0]).join('');
  return <span className={'avatar account-avatar '+(large?'large':'')} aria-hidden="true">{identity?.avatarUrl&&!failed?<img src={identity.avatarUrl} alt="" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:initials.toUpperCase()}</span>;
}

export default function AccountPanel({identity,status,calendar,role,command,onClose,onSettings,onSharing}:any){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function signOut(){setBusy(true);setError('');try{await command({action:'sessionCheck'});const r=await fetch('/auth/signout',{method:'POST'});const data:any=await r.json();if(!r.ok)throw Error(data.error||'Sign-out could not be completed.');localStorage.removeItem('shiftly-last-identity');window.dispatchEvent(new Event('shiftly-signed-out'));await cacheRemoveAccount(identity.id);location.assign(data.next);}catch(e:any){setError(e.message);setBusy(false);}}
  return <Sheet title={identity?'Your account':'Your personal calendar'} onClose={onClose}><div className="profile-summary"><AccountAvatar identity={identity} large/><div><h3>{identity?.name||'Personal calendar'}</h3><p>{identity?.email||'Saved on this device'}</p>{identity&&<span className="profile-provider">{identity.provider==='google'?'Signed in with Google':'Existing Shiftly account'}</span>}</div></div>{identity?<><div className="profile-status"><span className="profile-status-dot"/><span>{status}</span></div><div className="profile-calendar"><span className="eyebrow">CURRENT CALENDAR</span><strong>{calendar.name}</strong><small>{role==='owner'?'Owner':role==='editor'?'Editor':'Viewer'} · {calendar.timezone}</small></div><p className="profile-privacy"><Shield size={18}/>Your calendars are private until you invite someone. An invitation only gives access to the calendar you choose.</p>{identity.provider==='legacy'&&<form method="post" action="/auth/google"><p>Connect Google to keep your existing calendars and private notes under your Google account.</p><button className="primary" type="submit">Connect Google to this account</button></form>}<div className="profile-actions"><button className="settings-link" onClick={onSettings}><Settings size={18}/><span>Account & app settings</span><ChevronRight size={17}/></button><button className="settings-link" onClick={onSharing}><Share2 size={18}/><span>People & access</span><ChevronRight size={17}/></button><button className="settings-link danger" disabled={busy} onClick={signOut}><LogOut size={18}/><span>{busy?'Signing out…':'Sign out'}</span></button></div>{error&&<p role="alert" className="danger">{error}</p>}</>:<><p>Your calendar works on this device without an account. Sign in with Google for your private cloud calendars, sync and invitations.</p><SignInLink className="primary">Sign in with Google</SignInLink><button className="settings-link" onClick={onSettings}><Settings size={18}/>App settings<ChevronRight size={17}/></button></>}</Sheet>;
}
