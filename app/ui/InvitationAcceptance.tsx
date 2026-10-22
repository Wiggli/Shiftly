'use client';
import {useEffect,useState} from 'react';
import SignInLink from './SignInLink';
import {Sheet} from './primitives';
import {accessLabel,scheduleIdentity} from '../../lib/schedule-identity';
export default function InvitationAcceptance({token,identity,command,onAccept,onClose}:any){
 const [info,setInfo]=useState<any>(null),[receipt,setReceipt]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{if(!identity)return;let alive=true;command({action:'invitationInfo',token}).then((data:any)=>{if(alive)setInfo(data);}).catch((e:any)=>{if(alive)setError(e.message);});return()=>{alive=false;};},[token,identity?.id]);
 const target=info&&scheduleIdentity({owner_name:info.ownerName},{name:info.rosterName},info.role);
 async function accept(){setBusy(true);try{setReceipt(await command({action:'accept',token}));}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 async function view(){setBusy(true);try{await onAccept(receipt);}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 return <Sheet title={receipt?'Schedule added':'Shared with you'} onClose={onClose}>{!identity?<><p>Sign in with the Google account the invitation was sent to.</p><SignInLink className="primary full">Sign in with Google</SignInLink></>:!info&&!error?<p>Checking your invitation…</p>:info&&<><h3>{target.title}</h3>{target.detail&&<p>{target.detail}</p>}<p><strong>{accessLabel(info.role)}</strong></p><p>{receipt?`${info.ownerName||'The owner'} shared this schedule with you. It is now under Shared with me.`:'Your own schedule stays separate. Updates appear here when the owner makes changes.'}</p>{info.wholeCalendar&&<p className="hint">This invitation includes all of this owner’s schedules, including any added later.</p>}<button className="primary full" disabled={busy} onClick={receipt?view:accept}>{busy?'Opening…':receipt?'View '+target.title:'Accept invitation'}</button></>}{error&&<p className="danger" role="alert">{error}</p>}</Sheet>;
}
