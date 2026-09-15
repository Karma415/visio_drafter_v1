# Phase 1 security review — 2026-09-13

## Inspected scope

Application source, entry HTML, Vite configuration, dependency manifest and lockfile, and the new file/recovery/state boundaries. This is a source and dependency review, not a penetration test or a claim of absolute security.

The inspected app has no Supabase integration, auth implementation, remote application API calls, payment integration, or secret handling. No new network data service or dependency was added. npm audit returned zero known vulnerabilities for the installed production and development dependency tree on the review date. The audit queried npm package metadata, not apartment drawings.

## Controls

- No API key is required to draft an apartment. Never put private keys into frontend source or Vite-exposed variables; browser code is inspectable.
- `.env`, `.env.*`, and `*.karma.json` are ignored for future source-control use. This directory was not a Git repository during inspection. Ignore rules are not a substitute for a secret manager or a security audit.
- Drawing import accepts only the versioned JSON format and rebuilds known fields. It does not evaluate expressions, HTML, scripts, or external resources.
- IDs must be unique, supported types explicit, colors hexadecimal, and geometry finite and bounded.
- Limits: 2 MB serialized file, 2,000 shapes, 10,000 characters per text field, 0.1–1,000,000 mm sizes; coordinates within ±1,000,000 mm.
- Every committed document must remain valid and serializable within the file limit.
- Text is rendered as text, never injected as HTML.
- Local recovery failures are visible and do not silently clear existing stored data.
- File-open replacement requires an in-app confirmation. The download path is controlled by the browser; choose an E-drive directory there.
- Production preview used for verification binds to 127.0.0.1 only. Do not expose the development server publicly.

## Privacy and limitations

Local browser storage and exported JSON are not encrypted by this app. Someone with access to the same OS/browser profile or downloaded files may access the drawing. Use an appropriately secured computer/profile and filesystem. Clearing browser data can remove recovery; downloaded files are the durable backup.

Recovery is scoped to the exact browser origin, including hostname and port. `localhost:5173` and `127.0.0.1:4173` have separate storage. Use one consistent app address, and use downloaded files to move between addresses.

No hosting, financial integrations, cloud storage, credentials, authentication, schema, or RLS changes are part of Phase 1. Any future remote integration needs an explicit security design before implementation.

The production bundle currently exceeds Vite's 500 KB warning threshold. This is a non-blocking bundle-size warning, not a discovered security vulnerability.
