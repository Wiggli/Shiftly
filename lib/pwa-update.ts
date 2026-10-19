export function canActivateUpdate(state:{ready:boolean;safe:boolean;online:boolean;visible:boolean;editing:boolean;updating:boolean}){
 return state.ready&&state.safe&&state.online&&state.visible&&!state.editing&&!state.updating;
}

export async function inspectAppUpdate({online,preview,currentBuild,registration,loadVersion,workerTimeoutMs=15000}:{online:boolean;preview:boolean;currentBuild:string;registration?:{waiting?:unknown;installing?:unknown;update:()=>Promise<unknown>}|null;loadVersion:()=>Promise<string>;workerTimeoutMs?:number}){
 if(preview)return {update:false,message:'This is a sample preview. Open the app to check for updates.'};
 if(!online)throw Error('You are offline. Reconnect, then check again.');
 let published:string;
 try{published=JSON.parse(await loadVersion()).build;}catch{throw Error('Could not verify the published version. Please try again.');}
 if(typeof published!=='string'||!/^([a-f0-9]{6,64})$/i.test(published))throw Error('Could not verify the published version. Please try again.');
 if(registration){
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{await Promise.race([registration.update(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('The update check timed out. Please try again.')),workerTimeoutMs);})]);}
  finally{if(timeout)clearTimeout(timeout);}
 }
 if(registration?.waiting||published!==currentBuild)return {update:true,message:'A newer version is available. Tap Update app when your edits are saved.'};
 if(registration?.installing)return {update:false,message:'An update is downloading. Keep Shiftly open until it is ready.'};
 return {update:false,message:`You’re up to date. Build ${published}.`};
}
