type AccountSource={
 session:()=>Promise<{user:{id:string}}|null>;
 user:()=>Promise<{id:string}|null>;
 identity:()=>Promise<any>;
 cached:()=>any;
 online:()=>boolean;
 timeoutMs?:number;
};

// A server/network failure is not evidence that the user chose a guest calendar.
// Cached identity is presentation only and must belong to the local auth session.
export async function loadAccountIdentity(source:AccountSource){
 let timer:ReturnType<typeof setTimeout>|undefined;
 const task=async()=>{
  let session:{user:{id:string}}|null=null;
  try{
   session=await source.session();
   if(!session)return null;
   const user=await source.user();
   if(!user||user.id!==session.user.id)throw Error('Account changed');
   const identity=await source.identity();
   if(!identity?.id)throw Error('Account unavailable');
   return {...identity,authUserId:user.id};
  }catch{
   if(!source.online()){
    const cached=source.cached();
    if(cached?.id&&(!session||cached.authUserId===session.user.id||cached.id==='google_'+session.user.id))return cached;
   }
   throw Error(source.online()?'Your account could not be reached. Your saved calendar is safe; try again.':'Reconnect once to open your account, then your saved calendar will be available offline.');
  }
 };
 try{return await Promise.race([task(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Opening your account is taking longer than usual. Your saved calendar is safe; try again.')),source.timeoutMs??15000);})]);}
 finally{if(timer)clearTimeout(timer);}
}
