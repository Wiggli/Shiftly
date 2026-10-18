import type { Metadata } from 'next';
import './globals.css';
import './apple-ui.css';
import './calendar-screen.css';
export const metadata:Metadata={title:'Shiftly · Your shift calendar',description:'Your shifts, your life, beautifully in sync.',applicationName:'Shiftly',manifest:'/manifest.json',appleWebApp:{capable:true,title:'Shiftly',statusBarStyle:'black-translucent'},formatDetection:{telephone:false},icons:{icon:'/favicon.svg?v=4',shortcut:'/icons/icon-192.png?v=4',apple:[{url:'/icons/apple-touch-icon.png?v=4',sizes:'180x180',type:'image/png'}]}};
export const viewport={width:'device-width',initialScale:1,viewportFit:'cover',interactiveWidget:'resizes-content',themeColor:[{media:'(prefers-color-scheme: light)',color:'#f2f2f7'},{media:'(prefers-color-scheme: dark)',color:'#000000'}],colorScheme:'light dark'};
const appearanceBoot="try{var t=localStorage.getItem('shiftly-theme')||'system';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):t;}catch(e){}";
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:appearanceBoot}}/></head><body>{children}</body></html>;}
