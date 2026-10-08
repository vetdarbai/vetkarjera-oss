# Stage 4.7 photo replacement: local fix and QA

Authorization: VK47-PHOTO-REPLACE-FIX-NOW-20261008-29.
Date: 2026-10-08. Base: ae23f425863f6800fc424eca9aa690ca265a7ee7.
Scope: local source fix, technical QA and local commit only. No production access,
production write, migration, push, deployment, rollback or Stage 5 work.

## Failure and correction

The previous PUT wrote processed bytes successfully, then downloaded the same
Storage path to construct its response. A stale immediate read could therefore
return the previous content hash and overwrite client state with old metadata.
The image URL was also identical across replacements; a React key alone did not
give the browser a distinct image resource URL.

The regression script loads the original source from the base commit in memory
and deterministically reproduces this failure with the actual Storage SDK and a
synthetic stale-read transport: stored bytes change, but PUT returns the old hash
and unchanged URL. This proves the code failure mode; it does not claim that a
production PUT response or a specific production CDN cache layer was captured.

The fix:

1. After successful upload, PUT derives metadata from the exact processed bytes
   that were uploaded. It performs no immediate Storage download.
2. Private image URLs include `v=<processed WebP SHA-256>`.
3. Read authorization accepts one strictly validated hash parameter, independently
   of the owner/admin authorization target. Mutations still reject all queries.
4. The authenticated Storage SDK download receives the validated hash as its
   supported `cacheNonce`, so versioning also reaches the Storage request.

The existing React component consumes the returned metadata without modification.
The bucket stays private; the owner path remains `<owner UUID>/profile.webp`.
Live-session checks, owner/admin access rules, service-role mutation confinement,
Sharp validation/compression and private no-store response headers are unchanged.
No public/signed URL, global cache setting, schema, policy or grant change.

## Final local results

| Check | Result |
|---|---|
| Legacy stale-read reproduction | PASS: original code failure reproduced |
| Actual React/Next Image browser and route regression | PASS: 75 assertions / 6 groups |
| First upload, immediate A -> B -> C | PASS: decoded pixels, dimensions, URL version and stored hash checked before reload |
| Normal reload retains C | PASS |
| Delete, re-upload, failed replacement and retry | PASS |
| Owner/trusted-admin read; foreign/anonymous deny | PASS: actual authorization code with synthetic identity/DB transports |
| Revoked live capability, foreign origin, mutation query deny | PASS |
| Invalid types/bytes/oversized input; failed write preservation | PASS |
| Storage SDK/error/delete regression | PASS: 17 assertions |
| Default `npm test` | PASS |
| Auth/action checks inside default suite | PASS: 35 Auth cases, 33 profile action/session assertions |
| New default-suite photo route checks | PASS: 32 assertions |
| PostgreSQL/WASM profile suite | PASS: 168 assertions, including notice_period save/read and profile save preserving it |
| Alignment PostgreSQL/WASM suite | PASS: 280 assertions |
| Generated DB types | PASS: 39 tables, 11 RPCs |
| Local DB security audit | PASS: all seven checks |
| Frontend projection/PATCH suite | PASS: 50 assertions, including notice_period projection |
| Lint | PASS: no ESLint warnings/errors |
| TypeScript | PASS: tsc --noEmit |
| Next production build | PASS: synthetic public build configuration only |
| Git whitespace check | PASS |
| Client chunks / source scope | Privileged Storage environment name absent; migrations/types/components/dependency lock unchanged |

Browser: isolated headless Edge 154.0.4258.62. The fixture bundles the actual
ProfilePhoto/Next Image component, calls the actual HTTP route handlers, runs real
Sharp processing and uses the installed Supabase Storage SDK. Auth/DB and object
persistence transports are synthetic. All browser requests are constrained to
the loopback fixture origin; unexpected external requests = 0. No production
credentials or existing browser profile are used. Browser and HTTP server are
closed on exit.

The existing full local-Supabase `test-profile-ui.cjs` was strengthened to assert
B and C before reload and C after reload. That Docker/WSL-dependent suite was NOT
rerun: recovery runtime retries remain outside this task. The executed native
browser fixture and PGlite SQL suites must not be represented as a new live
GoTrue/PostgREST/Storage RLS integration run.

## Test-only changes and environment

The pre-existing DB test used the host's default `localeCompare` against database
code ordering. The Lithuanian Windows locale sorted two technical codes
differently. The test now uses explicit SQL C collation and binary JS code order;
it still compares every code and label. Product catalog data/order is unchanged.

Dependencies were installed from the unchanged package-lock.json using npm ci.
An accidental pnpm auto-install was stopped and the lockfile-based npm install
was restored before final QA. Initial fixture bundler/encoding issues were
corrected before the final passing browser result. No package versions changed.
The install reported 14 dependency audit alerts (3 moderate, 11 high); no audit-fix
or dependency upgrade was attempted in this narrowly scoped repair.

## Reproduction commands

Run from the repository root with the existing compatible Node runtime:

```powershell
npm test
node scripts/test-profile-view.cjs
node scripts/test-photo-replacement.cjs --prove-legacy
npm run lint
npm run typecheck
npm run build
```

For browser QA, use an already available Playwright module/browser through
`PROFILE_PLAYWRIGHT_MODULE` and `PROFILE_BROWSER_EXECUTABLE`, then run:

```powershell
npm run test:photo
```

No .env is read by the replacement fixture. The build used a synthetic HTTPS
Supabase URL and synthetic publishable key, not production configuration.
Browser evidence is ignored by Git under `.staging-results/photo-replacement/`:
`result.json` and `immediate-c.png`. No photo bytes or credentials are committed.

## Remaining validation and next step

READY FOR PHOTO REPLACEMENT FIX ROLLOUT AUTHORIZATION.

CEO review and separate main-push/production-deploy authorization are next.
After authorized rollout, confirm replacement against hosted Storage/CDN and
perform the agreed focused production smoke/manual QA. Local testing does not
prove the behavior of the hosted CDN. No further Paulius-led diagnostic A/B/C
cycle was requested during this repair.

Production unchanged by this task. No production migration. No main push.
No production deploy. Stage 5 NOT started.
