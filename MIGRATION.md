# Standalone migration

Target: GitHub Pages frontend and Supabase backend. No Sites build or deployment is needed.

## Verified

- Source recovered and preserved in GitHub.
- Supabase private tables with RLS and service-only transaction bridge.
- Deployed Edge Function validates Google sessions server-side, scopes shared access through the existing API and authenticates CalDAV separately.
- Live CalDAV discovery, prefixed resource URLs, stable overnight event UID, ETag update and multiget passed against an isolated fixture. Wrong credentials and unauthenticated app requests were denied.
- Frontend builds with repository-scoped assets, install QR, manifest and offline service worker. Cached API responses remain in the existing account-partitioned client store.

## Required before final cutover

1. Verify Supabase authentication allows the exact Pages redirect and complete Google sign-in on the new app.
2. Export the original production database using a read-only backup. It contains private data and must never enter this public repository.
3. Transfer calendars, members, records, invites and audit operations transactionally, preserving IDs, authors, privacy flags, revisions and hashed calendar credentials. Establish verified Google identity links rather than assigning ownership based on a browser-supplied email.
4. Compare source/destination counts and canonical hashes, then verify each owner's and shared user's access. Resolve pending offline writes before stopping writes on the original app.
5. Verify both iPhone layouts, offline reload and reconnect conflicts on the new frontend, plus actual iPhone Calendar discovery and edits.
6. Keep the original live deployment available until these checks pass. No decommission is authorized by publishing the replacement source.

No production data has been claimed as copied by these code changes. Database initialization alone does not migrate existing accounts or schedules.

## Backend releases

`pnpm build:backend` generates the Edge Function bundle. Deploy it through Supabase under `shiftly-api` with `verify_jwt=false`; its own session and CalDAV authentication must remain enabled. Supabase supplies the private server environment. The generated bundle is excluded from git.
