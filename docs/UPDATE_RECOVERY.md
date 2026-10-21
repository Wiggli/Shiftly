# Installed PWA update recovery

Shiftly publishes `/Shiftly/recover.html` as a deliberately small recovery bootstrap outside the normal app-shell precache.

Use it only when an installed PWA is stuck on an old bundle and cannot bootstrap the repaired in-app updater. The recovery page requests a fresh service worker with `updateViaCache: 'none'`, activates a waiting worker when available, and as a last resort unregisters only the Shiftly service-worker registration before registering the current worker again.

The recovery flow must never clear IndexedDB, localStorage, Supabase data, or user roster records. Its job is to reset the application shell, not user data.
