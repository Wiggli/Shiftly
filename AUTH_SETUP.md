# Google account rollout

Google OAuth registration is named Shifter. The dedicated Supabase project remains Shiftly (`mauptvodrrdmnzjcfwgq`); its display name does not affect OAuth addresses.

## Deployment prerequisites

The project Auth settings must return `external.google: true`. On 9 October 2026 the endpoint returned false and the Google provider form rejected activation because no Client ID was saved. The new authentication code is prepared, but must not replace the working sign-in until this is resolved.

Runtime values, stored through Sites environment configuration:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (publishable key only; no secret/service-role key)
- `APP_ORIGIN` (the exact existing production origin)

Google client ID and client secret belong only in the Supabase Google provider configuration. The app does not need either Google credential.

Google authorised origin: `https://shiftly-calendar.bartoloandre.chatgpt.site`

Google authorised redirect: `https://mauptvodrrdmnzjcfwgq.supabase.co/auth/v1/callback`

Supabase Site URL: `https://shiftly-calendar.bartoloandre.chatgpt.site`

Supabase allowed redirect: `https://shiftly-calendar.bartoloandre.chatgpt.site/auth/callback`

## Access and migration

Supabase manages authentication. Existing roster data remains in Sites D1. Every API request verifies the Google session with the managed Auth service, then applies the existing per-calendar owner/member permissions. The hosting owner receives no special access to users' calendars. Private records and private notes keep their existing access rules.

The new public sign-in action uses Google. Existing ChatGPT sessions remain a temporary migration path. An existing user explicitly selects **Connect Google to this account** in Settings. Both identities must be proven in the same ten-minute PKCE flow. Matching email addresses never cause automatic linking. A unique server-side alias preserves the existing principal, calendar ownership, memberships, note authors and IndexedDB cache keys. A Google account that already owns or participates in calendars cannot be silently merged into another account.

The forward-only D1 migration adds `identity_links` and expiring `auth_login_flows`; it does not rewrite roster records. OAuth uses the official pinned Supabase SDK with PKCE and HTTP-only same-site cookies. Proxy refreshes cookies before rendering. Redirects stay on the app origin, including invitations; unsolicited/replayed callbacks are rejected. Linking and logout require same-origin POST. Invalid Google sessions never downgrade into a legacy identity.

## Verification

- TypeScript, 23 calendar-engine tests and 2 auth-policy tests.
- Existing API permission, independent-account, sharing, realtime, multi-roster and private-note tests.
- An isolated managed-Auth fixture tests the actual built Worker: PKCE exchange, cookies, explicit linking, independent Google accounts, same-email isolation, invite redirects, replay rejection, CSRF, revocation and logout.
- A real Google round trip remains required after provider activation and deployment. The fixture is not evidence that Google Cloud registration is configured correctly.
- Set Google audience test users for initial validation, then review public audience and basic scopes before distributing. Disable unused Supabase email/password sign-in once Google is verified to enforce the requested Google-only provider setup.
