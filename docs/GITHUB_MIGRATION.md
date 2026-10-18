# Shiftly source migration

Source recovered from the existing Sites project on 18 October 2026.

- Production: https://shiftly-calendar.bartoloandre.chatgpt.site/
- Sites project: `appgprj_6ac7eb8e14d0819199dd3de58d98351f`
- GitHub destination: `Wiggli/Shiftly`, branch `main`
- Recovered source commit: `fa3141a47249d474e1bb523693a8b777e11c6ea1`
- Existing production version at recovery: 75

## Deployment continuity

Copying this source to GitHub does not move hosting, authentication, the D1 database, runtime configuration, calendar credentials or user records. Preserve the existing Sites project identity and bindings in `.openai/hosting.json`. Do not create a replacement Site, reset the database, change the public URL, or deploy a fresh database as part of source migration.

The prepared fixes have not replaced the live deployment. GitHub access was restored by adding `Wiggli/Shiftly` to the existing ChatGPT Codex Connector installation, while preserving `Wiggli/Anaesthetic-roster`. An authenticated repository write test succeeded before source upload. Source migration uses a clean snapshot and preserves the destination repository initial commit; historical Sites commits are excluded to avoid importing old credentials or build artifacts.

## Reproduce the clean export

With the intended source files tracked in Git, run:

```sh
python3 scripts/export-source.py /absolute/output/Shiftly_Source.zip
```

The export contains source, tests, migrations, dependency manifests and lockfile, original image assets, patches, and the hosting identity. It excludes Git history, dotenv files and their detected values, installed dependencies, generated offline bundles, compiler cache, Worker output, local database state and private tool state. A SHA-256 file manifest accompanies the export. Credential scanning is a best-effort check and does not replace repository secret scanning.

Generated files in `public/offline-assets` are rebuilt from `offline/entry.tsx` by `npm run build`; their source remains included. The `build/` directory contains source code for Sites integration and must be retained.

## Local validation and setup

Use Node.js >=22.13.0 and the package manager declared in `package.json`. Install dependencies using the repository install helpers, preserving `pnpm-lock.yaml` and the Vinext patch. Never copy runtime environment values into tracked files.

```sh
npm run install:ci
node node_modules/typescript/bin/tsc --noEmit
node --test tests/engine.cjs tests/setup.cjs tests/security.cjs tests/auth.cjs tests/pwa.cjs tests/sharing.cjs tests/navigation.cjs tests/simple-ui.cjs
npm run build
node tests/run-caldav.mjs
node tests/run-caldav.mjs tests/edit-sync.cjs
```

The CalDAV runner uses a temporary local database and applies migrations; it does not use production records. Preserve existing auth, permissions, offline queues, audit logs, stable UIDs and deletion tombstones.

## Prepared continuation

- CalDAV multiget explicitly returns 404 for missing or hidden requested resources, including events removed between Apple's inventory and download.
- Multiget does not return data for a requested path belonging to a different collection or account; malformed resource encoding returns 400.
- Editing sheets follow the visual viewport's vertical offset, including keyboard panning.
- Month names truncate within their available width, preserving month navigation and profile access; primary month arrows and edit controls retain larger touch targets.

Validation completed: TypeScript checking, production build (including the offline bundle and service-worker fingerprint), 110 unit checks, and the CalDAV integration suite, including missing-resource, cross-account href and malformed-encoding regressions, all passed. The separate edit-sync integration also passed for duty changes, copy/paste, patterns, overtime, leave and note preservation. Physical iPhone appearance, keyboard behavior and safe areas remain unverified in this environment; no supported managed browser-control skill is available.
