'use client';
import {useEffect,useState} from 'react';
import SignInLink from './SignInLink';
import {Sheet} from './primitives';
export default function InvitationAcceptance({token,identity,command,onAccept,onClose}:any){
 const [info,setInfo]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{if(!identity)return;let alive=true;command({action:'invitationInfo',token}).then((data:any)=>{if(alive)setInfo(data);}).catch((e:any)=>{if(alive)setError(e.message);});return()=>{alive=false;};},[token,identity?.id]);
 return <Sheet title="Join a shared schedule" onClose={onClose}>{!identity?<><p>Sign in with the Google account the invitation was sent to.</p><SignInLink className="primary full">Sign in with Google</SignInLink></>:error?<p className="danger" role="alert">{error}</p>:!info?<p>Checking your invitation…</p>:<><h3>{info.rosterName||info.calendarName}</h3><p>{info.wholeCalendar?'All rosters in this calendar, including future rosters.':'Only this roster and its shared entries.'}</p><p>You can {info.role==='editor'?'edit shifts, patterns and shared entries':'view the schedule and its updates'}. Your own calendars remain separate, and private notes remain private.</p><button className="primary full" disabled={busy} onClick={async()=>{setBusy(true);try{const result=await command({action:'accept',token});await onAccept(result.id);}catch(e:any){setError(e.message);}finally{setBusy(false);}}}>{busy?'Joining…':'Accept invitation'}</button></>}</Sheet>;
}
