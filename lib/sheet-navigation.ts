export type SheetHistory={state:any;pushState:(state:any,title:string)=>void;back:()=>void;go:(delta:number)=>void};
const key='shiftlySheetNavigation';
// Store screen names only. Notes, drafts and account data never enter history.
export class SheetNavigation {
 stack:string[]=[];
 pending=false;
 override:(()=>void)|null=null;
 constructor(private history:SheetHistory,private notify:(stack:string[])=>void,private session:string){}
 private publish(stack:string[]){this.stack=[...stack];this.notify(this.stack);}
 private state(stack=this.stack){return {...this.history.state,[key]:{session:this.session,stack}};}
 open(name:string){if(this.pending||name===this.stack.at(-1))return;this.publish([...this.stack,name]);this.history.pushState(this.state(),'');}
 back(){if(this.pending||!this.stack.length)return;this.pending=true;this.history.back();}
 closeAll(){if(this.pending||!this.stack.length)return;this.pending=true;this.history.go(-this.stack.length);}
 pop(state:any){
  const marker=state?.[key];
  const next=marker?.session===this.session&&Array.isArray(marker.stack)&&marker.stack.every((name:any)=>typeof name==='string')?marker.stack:[];
  if(!this.pending&&this.override&&this.stack.length){this.history.pushState(this.state(),'');this.override();return;}
  this.pending=false;this.publish(next);
 }
}
