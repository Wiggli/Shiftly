# Shiftly security and privacy review

Reviewed 11 October 2026. This is an application review, not a guarantee against every vulnerability or an independent penetration test.

## Access boundaries checked

- Google uses PKCE, server-only HTTP-only cookies, verified Google identities, and managed Auth `getUser()` validation. User-editable metadata supplies display details only.
- Supabase verifies Google sessions server-side; browser-supplied identity headers do not authorize production requests.
- Calendar data resides in the private Supabase schema. All six tables have RLS enabled, and the transaction bridge is executable only by the service role. Every API read, mutation and live subscription also checks calendar ownership or a current membership.
- Viewer edits, cross-account IDs, single-roster scope escapes, shared-definition changes and invitation reuse are denied. Invitations are bound to a recipient email, expire after seven days, and are invalidated on replacement, revocation or permission changes.
- Private events are returned to their author only, including when another account owns the calendar. Private notes attached to shared events are redacted for others and preserved when another editor updates public fields. Editors cannot delete another author's event when doing so would erase its private notes.
- Revision guards and atomic D1 batches prevent an outdated roster mutation from overwriting newer changes. Revocation and permission changes increment the revision.

## Improvements made

- Request streams are limited to 200 KB before JSON parsing, even without a Content-Length header. Invalid JSON, non-object payloads, unbounded operation IDs and unsupported link protocols are rejected.
- Auth, API and personalised page responses consistently use private/no-store headers, including failures. Referrers are suppressed so invitation and OAuth parameters do not accompany external requests. MIME sniffing is disabled, HTTPS has HSTS, and object/base/form/frame restrictions are applied without blocking the framework's inline scripts.
- Internal database/runtime errors are replaced by a generic response; logs contain a categorical failure reason rather than request bodies, tokens or SQL detail.
- A fresh permission downgrade or roster narrowing replaces the broader cached snapshot and removes obsolete unsynced operations, with a visible explanation. Another author's newly private event or note is not resurrected from an optimistic cache after refresh.
- Sign-out clears the active view across open tabs and waits for outstanding offline writes before purging local account data.
- Supabase migration `restrict_rls_event_trigger_execution` revoked PUBLIC, anon and authenticated EXECUTE privileges on public.rls_auto_enable(). The event trigger still automatically enables RLS. Post-change queries confirmed neither API role can execute the function, and the two related advisor findings disappeared.

## Dependency audit

Updated Next.js to 16.3.8, React/React DOM/React Server Components to 19.2.8, and Vite to 8.0.16. Compatible supporting packages were pinned to patched versions in the lockfile and package-manager overrides. The final production dependency audit reports zero known vulnerabilities. The all-dependency audit still flags `braces` 3.0.3 in development-only glob tooling, with no patched release listed. Its callers consume repository/build globs rather than user calendar input, and development tooling is not served publicly. This remains an upstream build-tool risk rather than a reason to label the entire dependency tree vulnerability-free.

## Practical limits and remaining items

- This is access-controlled cloud storage, not end-to-end encryption. Privileged hosting/database operators can technically access stored records. Ordinary app users, including the app creator's ordinary account, have no special calendar access.
- Offline data is intentionally retained on an unlocked device until sign-out. A recipient who is disconnected cannot immediately learn that sharing has been revoked; access is checked again on reconnection. Screenshots, exports and already-read information cannot be remotely recalled.
- Device storage relies on browser and operating-system protection; an app-specific biometric lock and encrypted local store are not implemented.
- Supabase still reports leaked-password protection disabled. Shiftly accepts verified Google identities only, so email/password identities cannot authorise its calendar API. The setting would need review before adding password sign-in, and availability may depend on the Supabase plan.
- Full account deletion/retention controls, comprehensive abuse-rate limiting, a strict nonce-based script CSP and an external penetration test remain future hardening work. Request-size limits are not a replacement for rate limiting.
- Local fixture tests exercise the real Worker/API with disposable local identities and databases; they do not use colleagues' accounts or production calendar records. Browser/device visual tests were unavailable in this environment.

## Repository privacy review, 19 October 2026

Secret scanning and push protection are enabled. Public archival preservation is disabled. A local scan of 299 historical file versions found no matches for the checked private-key, GitHub-token, server-key, AWS-key or JWT patterns; pattern scanning is not a guarantee that no secret exists.

The browser configuration contains a public publishable key by design. Service credentials, calendar-password hashes and user records remain outside the repository. Browser code delivered to users cannot be made secret.

The repository is still public. The account currently uses GitHub Free, which requires a public repository for Pages hosting; visibility has not been changed because it would interrupt the live application. Existing history has not been rewritten, and previously distributed copies cannot be recalled.
