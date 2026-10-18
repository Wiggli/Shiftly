import {Copy,ClipboardPaste,Undo2,Check} from 'lucide-react';
import {fmt} from './primitives';

export default function EditModeDock({paint,multi,count,selected,hasClipboard,moving,onCopy,onPaste,onUndo,onDone}:any){
 return <div className="edit-mode-dock" role="region" aria-label="Edit mode quick actions"><div className="edit-dock-status" aria-live="polite"><strong>{paint?'Painting duties':multi?`${count} dates selected`:moving?'Move destination':'Paste destination'}</strong><span>{paint?'Tap or drag across dates':multi?'Copy, then choose where to paste':fmt(selected,{day:'numeric',month:'short'})}</span></div><div className="edit-dock-actions">{paint?<button className="quiet-button" onClick={onUndo}><Undo2 size={18}/>Undo</button>:multi?<button className="primary" disabled={!count} onClick={()=>onCopy(false)}><Copy size={18}/>Copy</button>:<button className="primary" disabled={!hasClipboard} onClick={onPaste}><ClipboardPaste size={18}/>{moving?'Move':'Paste'}</button>}<button className="quiet-button" onClick={onDone}><Check size={18}/>Done</button></div></div>;
}
