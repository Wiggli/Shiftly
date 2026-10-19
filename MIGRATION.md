# Standalone migration

Target: GitHub Pages frontend and Supabase backend. No Sites build or deployment is needed.

## Verified

- Source recovered and preserved in GitHub.
- Supabase private tables with RLS and service-only transaction bridge.
- Deployed Edge Function validates Google sessions server-side, scopes shared access through the existing API and authenticates CalDAV separately.
- Live CalDAV discovery, prefixed resource URLs, stable overnight event UID, ETag update and multiget passed against an isolated fixture. Wrong credentials and unauthenticated app requests were denied.
- Frontend builds with repository-scoped assets, install QR, manifest and offline service worker. Cached API responses remain in the existing account-partitioned client store.

## Production verification, 19 October 2026

The production transfer reported in the previous session is now present in Supabase: 2 calendars, 127 records and 31 audit operations, with no members or pending invitations. The verified Google principal owns one calendar containing 119 records. The separate legacy principal retains its own calendar and 8 records; it has not been reassigned by email or silently merged. No identity-link rows are required for the calendar already owned by the verified Google principal.

Read-only checks found no orphaned records. RLS is enabled on all six private tables, and neither anon nor authenticated can execute the transaction bridge. The backend health endpoint responds successfully and the deployed Edge Function is active. The existing GitHub Pages workflow completed successfully.

The restored working tree had a dependency symlink into the removed Sites workspace. Dependencies were reinstalled directly in the GitHub checkout, after which all 105 unit tests, TypeScript checks and both production bundles passed. Standalone PWA regressions now check offline application/guide access, notification badge caching, private API bypass and isolation from other apps on the same GitHub Pages origin. These checks run after the Pages build in CI.

## Still required before final cutover

1. Complete a real Google sign-in on the Pages app and confirm that the existing calendar opens. The browser review in this session used the signed-out personal calendar.
2. Compare the final source/destination records and canonical hashes against a fresh source snapshot. Current counts and ownership checks alone do not prove byte-for-byte parity or include subsequent writes on the old app.
3. Resolve any pending offline writes on the original app before adopting the replacement as the only editing location.
4. Verify actual iPhone Calendar discovery and edits using the new backend address, as well as offline reload/reconnect and the iPhone keyboard and safe areas. Browser layout previews do not reproduce iOS behavior.
5. Keep the original live deployment available until these checks pass. No decommission is authorized by publishing the replacement source.

## Backend releases

`pnpm build:backend` generates the Edge Function bundle. Deploy it through Supabase under `shiftly-api` with `verify_jwt=false`; its own session and CalDAV authentication must remain enabled. Supabase supplies the private server environment. The generated bundle is excluded from git.
