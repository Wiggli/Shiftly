import React from 'react';
import {createRoot} from 'react-dom/client';
import CalendarApp from '../app/ui/CalendarApp';
import '../app/globals.css';
import '../app/apple-ui.css';
import '../app/calendar-screen.css';
let identity=null;try{identity=JSON.parse(localStorage.getItem('shiftly-last-identity')||'null');}catch{}
createRoot(document.getElementById('root')!).render(<CalendarApp identity={identity}/>);
