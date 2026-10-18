'use client';
import {Layers,Plus} from 'lucide-react';
import {familiarRhythms} from '../../lib/setup';
export default function FamiliarRhythms({writable,onChoose}:any){return <div className="templates">{familiarRhythms.map(rhythm=><button disabled={!writable} key={rhythm.id} onClick={()=>onChoose(rhythm)}><Layers size={22}/><strong>{rhythm.name}</strong><p className="hint rhythm-sequence">{rhythm.items.map(role=>role[0].toUpperCase()+role.slice(1)).join(' → ')}</p><p className="hint rhythm-description">{rhythm.description}</p><span>{rhythm.items.length}-day cycle<Plus size={16}/></span></button>)}</div>;}
