/** Keep redirects on this origin and outside authentication routes. */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/';
  try {
    const url = new URL(value, 'https://app.local');
    if (url.origin !== 'https://app.local' || /^\/(auth(?:\/|$)|callback|signin-with-chatgpt|signout-with-chatgpt)/.test(url.pathname)) return '/';
    return url.pathname + url.search + url.hash;
  } catch { return '/'; }
}
export function verifiedGoogleUser(user: any): boolean {
  return !!user?.id && !!user.email && !!user.email_confirmed_at && user.identities?.some((identity: any) => identity.provider === 'google');
}
export function googlePrincipal(id: string): string { return 'google_' + id; }
