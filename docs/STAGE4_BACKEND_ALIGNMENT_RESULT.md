# Stage 4 backend alignment — local implementation and QA

Base review commit: 95ea4fbf5d36fbd3241785218a466e2b64a28a26.
Branch: codex/stage4-backend-alignment.
Scope: local implementation only. CEO G1 variant 2 and G2 owner + trusted admin decisions are implemented. This report supersedes the unresolved G1/G2 status in the historical alignment plan.

## Implementation

- STEP1/STEP2/education use transactional partial PATCH: omitted preserves, NULL clears permitted nullable scalar, [] clears a supplied collection; invalid supplied types/catalogs/length/date fail.
- Partial STEP1 cannot create a new specialist capability. V2 registration and second-profile creation remain strict and separate from draft saves.
- No generic draft subsystem or stable row-ID redesign. A chosen language may have NULL proficiency; no chosen language means no row. Education requires explicit profession context.
- Existing visibility remains NOT NULL. registered_employers does not grant foreign profile/photo reads.
- License number stays private owner/trusted-admin. Missing number allows veterinarian draft save but prevents STEP2 readiness. pending/verified/rejected do not change completeness; existing revision/history rules remain.
- App save responses add completeness + completenessStatus. A successful write with failed follow-up completeness read is still success/unavailable, not a false write failure.

## Migrations and functions

Two separate CLI-created migrations; original four migrations unchanged:

1. 20260930060436_stage4_draft_readiness_alignment.sql
2. 20260930060437_stage4_specialist_photo_access.sql

Changed private functions: save_specialist_step1, save_specialist_step2, save_education, create_second_profile, profile_completeness. Added private.profile_required_state() and private.can_read_specialist_photo(text). Existing 11 public RPC signatures are unchanged.

Removed completeness-only constraints: specialist_other_text, specialist_start, education_shape, specialist_languages_check; removed language proficiency NOT NULL. specialist_home becomes a non-nationwide validation. Other FK/PK/UNIQUE/length/range/type rules remain. No photo column/table or additional row identifier added.

Writer privileges are temporarily elevated only inside the reviewed atomic migration model, then returned to NOLOGIN/NOSUPERUSER/NOBYPASSRLS/NOINHERIT, no private CREATE, postgres cannot SET ROLE writer, API roles not writer members.

## Server required-state / readiness

profile_completeness() retains existing numerical fields and adds:
step1Complete, step2Complete, missingRequired [{field, step, reason:"required"}], readyToApply, readinessState ("not_ready"|"ready"|"complete"), contractVersion:2.

Missing codes cover STEP1 names/profession/Other text; STEP2 location and conditional abroad country/city, experience, search/start/date, visibility, animal/activity/work location/workload/language collections, incomplete language fields, profession-specific education and veterinarian license presence.

STEP1 credits 20 only if complete. STEP2 credits 50 only when STEP1 AND STEP2 are complete. STEP3 may be saved anytime and credits 0–30. Other custom competencies: 1=10, 2=20, 3+=30.
Thus STEP1 incomplete total <=30; STEP1 complete / STEP2 incomplete total <=50; both complete total >=70. total >=70 always ready; 100 complete. No independent 80%-but-not-ready case.

## Photo architecture / boundary

Private bucket specialist-profile-photos; one <auth-user-uuid>/profile.webp. No originals/gallery/employer logo.
GET/PUT/DELETE /api/profilis/nuotrauka and GET /api/profilis/nuotrauka/vaizdas are Node server routes. They validate verified identity, live session, specialist existence and owner/admin authorization. Mutation target is always the active owner. Exact same-origin header is required; user-supplied mutation target/query is rejected.

Reads use the caller's Supabase client and Storage RLS. Foreign employer/anon denied regardless of profile_visibility. Trusted admin may read, not mutate another owner's photo.
Restrictive Storage policies block direct client insert/update/delete even in the presence of broader permissive policies. Signed upload/copy/move attempts are tested too.

Only lib/supabase/storage-admin.ts uses SUPABASE_STORAGE_SERVICE_ROLE_KEY, marked server-only and exposing a dedicated Storage bucket client. No profile/license RPC uses it. No NEXT_PUBLIC secret, actual production credential, .env or token is committed. This server env and bucket have NOT been configured in production.

Input: JPEG/PNG/WebP, real signature+decode, 3 MiB body, 16 MP, single-frame only. Reject SVG/forged/truncated/animated/oversized inputs. Sharp 0.35.5 rotates, resizes within 512px, encodes WebP, removes metadata; <=250 KiB output, 8s processing timeout. Original bytes never enter Storage.
Metadata returns deterministic reference, byte SHA-256 version and authenticated image route; no signed public URL. Responses private/no-store, nosniff, no-referrer. Missing object differs from provider failure (unavailable/503).

Replace/delete concurrency has one deterministic object and no retained original; same-path last completed Storage operation wins. Metadata read after mutation can reflect a concurrent operation. There is no claim of a cross-service DB + Storage transaction.

## Verification boundary

Real GoTrue signup/confirmation/login/session, PostgREST RPC/RLS and Storage API transport are exercised in the isolated local PG17 stack. The test harness loads the actual route handlers, injects the request cookie client, disables React request memoization and supplies the local HTTP endpoint ONLY to the privileged Storage wrapper. Production's existing HTTPS configuration guard is unchanged. This is not a browser/manual production QA or a complete Next HTTP cookie integration test.

The earlier local reset DNS issue was resolved by the CLI's documented --network-id parameter. No infrastructure redesign, Windows security change or Podman troubleshooting was performed. All published stack ports bind 127.0.0.1.


## Final results — READY TO COPY TO CEO CONSULT

**STAGE 4 BACKEND ALIGNMENT LOCAL QA PASS**

| Check | Result |
|---|---|
| PostgreSQL / Auth / PostgREST / Storage | 17.6 / 2.196.0 / 16.2 / 1.72.1 |
| Supabase CLI / Docker / Ubuntu / Node | 2.117.0 / 29.8.1 / 24.04.5 LTS / 22.23.2 |
| Clean migration chain + real integration | PASS — 379 assertions, 2026-09-30 10:37:10.573–10:37:26.287 UTC |
| Stage4.3 upgrade + real integration | PASS — 384 assertions, 2026-09-30 10:35:32.493–10:35:52.757 UTC |
| Genuine DDL lock timeout rollback / two-connection PATCH | PASS |
| Existing account/profile preservation | PASS — pre-upgrade synthetic fixture unchanged |
| Strict specialist + employer V2 signup / second profiles | PASS |
| Draft / missing-required / readiness / license privacy and revision | PASS |
| Owner/admin photo; foreign/anon; direct mutation / broad-policy bypass | PASS |
| File signature/decode/animation/pixel/body limits / metadata removal | PASS |
| Expired/revoked sessions / CSRF / IDOR / replace-delete races | PASS |
| Provider failure and missing privileged key fail closed | PASS |
| Photo bytes recovery roundtrip, owner mapping and SHA-256 | PASS — local synthetic fixture only |
| Lint / typecheck / build | PASS — no lint warnings/errors |
| Mocked Auth tests | PASS — 35 |
| Profile action/session/registration assertions | PASS — 33 |
| Historical Stage4.3 PGlite regression assertions | PASS — 166 |
| Latest alignment PGlite assertions | PASS — 280 |
| Types / DB security audit | PASS — 39 tables, 11 public RPCs; 7 audit categories |
| Client bundle privileged key boundary | PASS — 49 emitted static files scanned |
| Original four migration files | Unchanged |
| Advisors | 0 ERROR, 0 WARN; 29 unused-index INFO + private account_admins no-policy INFO |
| UI / production / main / deploy / Stage5 | Unchanged / not executed |

The private admin table's no-policy INFO is intentional: no direct client reads/writes; trusted admin checks use the established private function model. No indexes or leaked-password settings were changed in response to INFO/production warnings. Local DB advisors do not certify hosted Auth leaked-password configuration.

### Recovery

See STAGE4_BACKEND_ALIGNMENT_RECOVERY.md for exact capture -> owner/hash manifest -> joint DB+bytes restore -> privacy/integrity validation. A pg_dump alone does not recover photo bytes. Consistency requires an authorized operational write freeze and durable-state comparison; no freeze feature or recurring backup infrastructure was added. RPO is the age of the last COMPLETE jointly verified set, not a promised fixed interval.

### Changed files

- app/profilis/actions.ts
- app/api/profilis/nuotrauka/route.ts
- app/api/profilis/nuotrauka/vaizdas/route.ts
- lib/profiles/contracts.ts
- lib/profiles/photo.ts
- lib/supabase/storage-admin.ts
- package.json
- package-lock.json
- scripts/alignment-cases.cjs
- scripts/test-alignment-db.cjs
- scripts/test-alignment-local.cjs
- scripts/setup-specialist-photo-storage.cjs
- scripts/profile-test-db.cjs
- scripts/test-profiles-db.cjs
- scripts/test-profile-actions.cjs
- scripts/audit-profile-db.cjs
- types/database.ts
- supabase/migrations/20260930060436_stage4_draft_readiness_alignment.sql
- supabase/migrations/20260930060437_stage4_specialist_photo_access.sql
- docs/STAGE4_BACKEND_ALIGNMENT_PLAN.md
- docs/STAGE4_BACKEND_ALIGNMENT_RESULT.md
- docs/STAGE4_BACKEND_ALIGNMENT_RECOVERY.md
- docs/STAGE4_BACKEND_ALIGNMENT_QA.md
- docs/qa/stage4_alignment/clean.json
- docs/qa/stage4_alignment/upgrade.json
- docs/qa/stage4_alignment/advisors.json
- docs/qa/stage4_alignment/technical.json

Local commit SHA: the commit containing this report; obtain with git rev-parse HEAD. Its exact SHA is supplied in the final handoff message. No main push or remote branch push performed.

Pre-existing Stage4.3 report files and the previously dirty STAGE4_3_PRODUCTION_MIGRATION_PLAN.md are excluded from the alignment commit and left untouched.

### Open risks / next step

1. CEO reviews the local commit, both new migrations, route contracts and recovery runbook. Production rollout remains separately gated; this local QA authorization is not production authorization.
2. Before any approved rollout, prepare/validate fresh recovery as applicable, provision the private bucket via supported Storage API and configure SUPABASE_STORAGE_SERVICE_ROLE_KEY server-side only. None were done in production here.
3. No Next HTTP/browser cookie end-to-end or manual production QA is claimed by this harness. Actual route logic/Auth/RPC/Storage transports are tested; Paulius owns planned manual production QA after an authorized deployment.
4. No cross-service atomicity or fixed backup RPO is claimed. Same-path concurrent Storage mutations can affect the follow-up metadata response; one final object remains and the next read is authoritative.
5. Local CLI reset required its documented custom network flag, not any new infrastructure. Existing reviewed executor/writer privilege model must be preserved at a future fresh production pre-flight.

Exact next step: CEO CONSULT review of this LOCAL result. Wait for a separate, explicit production rollout decision; do not apply these migrations, push main or deploy automatically.

Production unchanged.
No production migration executed.
No main push.
No deploy.
Stage 5 NOT started.
