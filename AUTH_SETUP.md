# Authentication setup

Shiftly uses Supabase Google authentication with PKCE. The frontend is https://wiggli.github.io/Shiftly/ and must be an allowed redirect in Supabase. The browser stores the managed session; every backend request validates the bearer token with Supabase before applying calendar ownership and membership rules.

Only the public project URL and publishable key belong in browser configuration. Service credentials remain in the backend environment. Calendar passwords are generated per account and stored as hashes. Matching an email address never transfers calendar ownership.

Verify a real Google sign-in and an actual iPhone Calendar connection before final cutover; see MIGRATION.md.
