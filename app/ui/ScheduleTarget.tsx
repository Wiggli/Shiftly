'use client';
import {createContext} from 'react';
export const ScheduleTargetContext=createContext<any>(null);
export function ScheduleTarget({target}:any){return target?.shared?<div className="schedule-target" role="note"><strong>{target.role==='editor'?'Editing ':'Viewing '}{target.title}</strong><span>{[target.detail,target.permission].filter(Boolean).join(' · ')}</span></div>:null;}
