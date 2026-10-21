# PWA bootstrap recovery audit

Added a network-served recovery bootstrap for installations that predate the repaired updater and remain trapped behind a stale service worker. It resets only the Shiftly service-worker shell and deliberately preserves IndexedDB, localStorage, authentication and roster data. Normal in-app update handling remains the primary path; `/Shiftly/recover.html` is the escape hatch for legacy stuck installations.
