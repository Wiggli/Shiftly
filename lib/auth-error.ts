import {safeReturnPath} from './auth-policy';

export function authFailure(message:string,status:number,returnPath='/') {
  const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  const retry='/auth/google?return_to='+encodeURIComponent(safeReturnPath(returnPath));
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark"><title>Sign-in help · Shiftly</title><link rel="stylesheet" href="/offline-assets/app.css?v=auth-recovery-1"></head><body><main class="auth-recovery"><a class="auth-brand" href="/">shiftly<span>.</span></a><section aria-labelledby="auth-heading"><p class="eyebrow">YOUR CALENDAR IS SAFE</p><h1 id="auth-heading">Let’s get you signed in</h1><p>${escape(message)}</p><div class="auth-recovery-actions"><a class="primary" href="${escape(retry)}">Try Google again</a><a class="quiet-button" href="${escape(safeReturnPath(returnPath))}">Back to calendar</a></div><p class="auth-recovery-hint">If you opened Shiftly inside another app, open it in Safari or Chrome and start sign-in there.</p></section></main></body></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'self'; font-src 'self' https://fonts.gstatic.com; base-uri 'none'; frame-ancestors 'none'"}});
}

export function providerFailureMessage(error:string) {
  return error==='access_denied'
    ? 'Google sign-in was cancelled. You can try again when you’re ready.'
    : 'Google could not complete sign-in. Please try again. If this keeps happening, the app owner needs to check the Google sign-in configuration.';
}
