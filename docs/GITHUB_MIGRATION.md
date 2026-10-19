# Source and deployment

The canonical repository is Wiggli/Shiftly. GitHub Actions builds the PWA and publishes GitHub Pages; Supabase hosts authentication, private database records and the calendar API.

The repository contains application source, tests, schema definitions, original assets, dependency manifests and the lockfile. Dependencies, build output, environment files, personal calendar exports and server credentials must never be committed.

The previous deployment is preserved pending final parity and device checks. See ../MIGRATION.md for current verification status.
