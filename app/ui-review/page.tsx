'use client';
import {useState} from 'react';
import './review.css';
const sizes=[{name:'Small',width:320,height:568},{name:'Standard',width:390,height:844},{name:'Large',width:430,height:932},{name:'iPhone 18 Pro Max',width:440,height:956}];
export default function PhoneReview(){
 const [size,setSize]=useState(sizes[3]),[landscape,setLandscape]=useState(false);
 const width=landscape?size.height:size.width,height=landscape?size.width:size.height;
 return <main className="phone-review"><header><div><h1>Shiftly · Phone review</h1><p>Live layout preview, not an iOS simulator. Safari, display zoom, status bar and safe areas may differ on your iPhone; edits here are saved.</p></div><a href="/" target="_blank" rel="noreferrer">Open full app</a></header><div className="review-controls" role="group" aria-label="Preview size">{sizes.map(option=><button type="button" key={option.name} aria-pressed={size.name===option.name} onClick={()=>setSize(option)}>{option.name}<small>{option.width} × {option.height}</small></button>)}<button type="button" aria-pressed={landscape} onClick={()=>setLandscape(!landscape)}>{landscape?'Landscape':'Portrait'}</button></div><div className="review-stage"><iframe title="Shiftly phone preview" src="/?preview=phone" style={{width,height}}/></div></main>;
}
