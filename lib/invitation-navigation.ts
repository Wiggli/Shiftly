// Preserve only an invitation identifier across the same OAuth storage boundary.
const key='shiftly-pending-invitation',valid=(token:unknown)=>typeof token==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(token);
type StorageLike=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function rememberInvitation(url:URL,storage:StorageLike,now=Date.now()){
 const token=url.searchParams.get('invite');if(valid(token))storage.setItem(key,JSON.stringify({token,at:now}));
}
export function restoreInvitation(url:URL,storage:StorageLike,now=Date.now()){
 let pending:any;try{pending=JSON.parse(storage.getItem(key)||'null');}catch{}storage.removeItem(key);
 if(!url.searchParams.has('invite')&&valid(pending?.token)&&Number.isFinite(pending.at)&&now>=pending.at&&now-pending.at<7*86400000)url.searchParams.set('invite',pending.token);
 return url.href;
}
