# Stage 5.3 employer backend — local implementation review

HANDOFF ID: VK-STAGE5-3-STORAGE-COMPATIBILITY-QA-PASS-20261009
FROM: Backend Developer
TO: CEO CONSULT
STATUS: READY FOR PRODUCTION ROLLOUT AUTHORIZATION.

Authorization: VK-STAGE5-3-LOCAL-IMPLEMENTATION-QA-AUTHORIZATION-20261009.
Compatibility authorization: VK-STAGE5-3-STORAGE-COMPATIBILITY-AMENDMENT-APPROVED-20261009, LOCAL ONLY.
Source of truth: approved canonical Stage5.2 architecture, VK-STAGE5-2-ARCHITECTURE-TYPE-LOCK-APPLIED-20261009, plus final Stage5.1 Product Lock.
Workspace: D:\VetKarjera-Staging\workspace\frontend-stage4-7.
Feature branch: codex/stage5-employer-backend.
Reviewed starting HEAD: c439b89b37001e7d7bc3dbecbc7dfb36be6dfe09.
Original implementation checkpoint:35a9e78046a53065a23c4e6d97e21b3aea5000cc. This updated report is included in the local compatibility checkpoint; its final SHA is provided in the accompanying CEO handoff. Local review is complete; production rollout still requires separate authorization.

## Implemented contract

- STEP1=20; STEP2=50 only when STEP1 is complete; required70 publishes ACTIVE regardless of verification. Optional description10/logo5/cover5/current type5/benefit5; max100. Website/contacts/social/employee size0. Missing required fields return draft/private; suspended/archived never auto-resume.
- Exactly14 primary types,26 attribute groups,143 options. Locked AND rules for clinic/farm/pharmacy, other with nonempty current text, remaining matrix and revision isolation. SQL catalog codes/labels match JSON. Original specialist catalog JSON remains unchanged.
- Multi-city draft/save/remove/reload, normalized duplicate prevention, standard/custom benefits (max10 custom), partial saves and server-derived capabilities/state/score.
- Private legal identity/current representative/verification evidence and audit. Identity verification permanently locks direct legal editing; revision-checked legal change requests. Approved review actor snapshots preserve provenance after deletion of a non-owning account. No public verification badge.
- Live-session membership ownership, deferred exactly-one-owner invariant, V1 one organization/account, atomic transfer/cancel/decline/expiry. New owner remains read-only until representation PASS. Current owning account cannot be deleted; pending target deletion cancels pending transfer. Admin review/fallback backend preparation only; no admin UI or production promotion.
- Stable UUID, Lithuanian slug generation/collision/history, old308 only for currently public organization. Public GET /darbdaviai/<slug> and /api/organizacijos/slug/<slug> return backend JSON; no employer page UI/directory was implemented. Empty optional sections and private PII are omitted from public DTO.
- Private organization-profile-media bucket, versioned immutable logo/cover paths, current-key RLS, no direct client writes. Server validates/compresses single-frame JPEG/PNG/WebP; bounded input/output; no-store reads; successful PUT returns new authoritative src/version; exact-path failure compensation and obsolete-object cleanup. Existing server-only Storage key mechanism reused, no new credentials.
- Narrow NOLOGIN/NOSUPERUSER/NOCREATEROLE/NOCREATEDB/NOREPLICATION/NOBYPASSRLS/NOINHERIT writer/reader roles; final postgres membership has no SET/INHERIT; API roles are not members; private CREATE removed. All new tables RLS, explicit grants, private qualified helpers, public invoker wrappers. Jobs FK/workflows and all previous migration files remain unchanged.

## Changed files

Created migration: supabase/migrations/20261009134719_stage5_employer_foundation.sql.
Raw local file SHA-256: df47ada0ecada148836e913225fda6645b7f6d531314274fe7800240e364d457 (Git checkout newline normalization can change byte hashes; executor must compare the actual execution artifact).
One atomic migration, lock_timeout5s, empty reviewed organizations/memberships baseline required; no fabricated organization backfill.

Created: lib/organizations/{catalogs.json,contracts.ts,server.ts,media.ts}; app/api/organizacijos/[id]/media/[kind]/route.ts; app/api/organizacijos/slug/[slug]/route.ts; app/darbdaviai/[slug]/route.ts.
Created QA: scripts/{organization-cases.cjs,organization-concurrency.cjs,organization-native-db.cjs,test-organizations-db.cjs,test-organization-media.cjs}.
Compatibility correction modifies only the NEW Stage5 SQL, scripts/{test-organizations-db.cjs,test-organization-media.cjs,organization-native-db.cjs}, this report; creates scripts/organization-storage-access.cjs. No product application code or historical migration changed in this correction.
Modified: scripts/{profile-test-db.cjs,generate-profile-types.cjs,audit-profile-db.cjs}, types/database.ts, package.json.
Generated types:50 public tables/42 public RPCs, including invoker projection view and default-null optional arguments.
QA fixture now applies original Stage4 Storage policies instead of skipping them; anonymous RPC audit allows only3 reviewed public-read RPCs. New test:organizations/* scripts expose Stage5 tests separately; existing npm test is Stage4 regression suite, not a substitute for Stage5 media QA.

## Final local QA

| Check | Result |
|---|---|
| Native PostgreSQL17.11 clean8-migration chain | PASS,334 assertions |
| Native7→8 upgrade, synthetic16 Auth/profiles,13 specialist/3 employer | PASS,345 assertions; full original row/ID snapshots unchanged |
| Two actual DB connections, concurrent edit stale40001 | PASS |
| Cutover lock timeout55P03 | PASS, whole transaction/history/new-role rollback; local test releases lock then applies normally |
| PGlite organization behavior/catalogs | PASS,205 assertions (embedded PG18.3; native17 tests are compatibility evidence) |
| All14 positive/negative type rules, legal/ownership/security/invariants | PASS within native/embedded suites |
| Actual Next organization/specialist GET handlers+sharp+SQL RLS | PASS,157 assertions; upload/replacement/delete/validation/compensation and compatibility access checks |
| Approved Stage4 role split | PASS, applied locally only in new Stage5 migration |
| Dedicated Storage SQL access assertions | PASS,105 on native PG17; additionally6 exact policy/helper preservation assertions in upgrade |
| Stage4 affected Auth/errors/replacement regression | PASS,35/17/32 assertions, rerun after amendment |
| Stage4 actions/profiles/alignment unaffected regression | Prior checkpoint PASS,33/168/280; retained, not rerun unnecessarily |
| lint/typecheck | PASS, rerun after amendment |
| Next15.5.24 build | Prior implementation PASS; retained because this amendment changes only SQL/QA/docs, no app source/types/packages |
| Generated types consistency/SQL security audit | PASS |
| Supabase CLI2.117.0 local DB advisors | ERROR0/WARN0;49 INFO (48 unused-index + existing private.account_admins RLS/no-policy) |
| Production/manual/browser QA | NOT RUN; not authorized |

Advisor initially identified one new auth_rls_initplan WARN in org_shell_bootstrap. Changed only new policy to user_id=(select auth.uid()); both final native suites assert exit0 AND no ERROR/WARN. Prior incorrect interim claim of no WARN was corrected.
Local implementation failures found during testing (trigger branching, LT case normalization, optional generated argument types, FK-null approved-history preservation) were corrected before the original final runs. The anon Storage blocker is now resolved under explicit CEO approval; the media suite expects200 rather than accepting the former503.
During additional concurrent QA, two processes received the same millisecond-based native directory and one initdb failed with existing nonempty directory. No policy conflict occurred. Fixed only the QA helper to atomically create a unique directory via mkdtempSync and always remove its synthetic init-password file in finally. Final clean/upgrade reruns used independent directories and passed; interrupted evidence remains preserved. No system/Docker/WSL configuration changed.

Test limitations: native PostgreSQL17.11 is real SQL/RLS/concurrency, but Auth/Storage schemas are explicit synthetic SQL fixtures. Next route/Sharp tests run actual handlers with a Storage byte-transport fixture and forbidden external fetch. No live GoTrue/PostgREST/Storage HTTP stack was started, no new Docker/WSL recovery attempt. Immediate refresh is proven by newly returned immutable URL and its current bytes; no employer UI exists to claim browser repaint E2E. Historical production PG17.6 is not an exact-minor native test.

Evidence: ignored .staging-results/stage5-{native,native-clean,pglite,media}.json. Protected final native data/logs remain under D:\VetKarjera-Staging\qa-private\stage5-native-1791558872642-FL6Coo (upgrade) and stage5-native-1791558913134-rNwTZG (clean), loopback-only, random synthetic SCRAM credentials, current-user DACL, servers stopped. Existing recovery artifacts/tooling preserved. The PGlite205 organization result is prior-checkpoint evidence; native suites and embedded route suite are the fresh affected QA.

## Approved Storage compatibility amendment — applied locally

Original blocker: Stage4 specialist_photo_read_guard was restrictive SELECT TO anon,authenticated and invoked private.can_read_specialist_photo(name), whose EXECUTE is authenticated-only. This rejected anon organization-media reads with503. CEO explicitly approved the two-policy compatibility amendment below; it is now included only in the new unapplied Stage5 migration.

The approval amends the earlier Stage4 RLS lock only for this exact scope. No private helper EXECUTE/schema privilege expansion, public bucket, signed URL, service-role generic read, or broader Storage grant was introduced.

Exact SQL diff in the NEW, UNAPPLIED Stage5 migration (historical SQL unchanged):

```sql
ALTER POLICY specialist_photo_read_guard ON storage.objects TO authenticated;
CREATE POLICY specialist_photo_anon_read_guard ON storage.objects
AS RESTRICTIVE FOR SELECT TO anon
USING (bucket_id <> 'specialist-profile-photos');
```

Original authenticated predicate remains identical. Native before/after comparison proves every preexisting specialist Storage policy unchanged except the approved read-guard role list; helper definition and ACL are identical. New anon guard is exactly restrictive SELECT/anon/bucket-not-specialist. Authenticated owner/admin specialist read remains allowed; foreign/anon/missing/expired/revoked session denied, restored live session allowed. Anon has no helper EXECUTE and no private schema USAGE.
For both logo/cover, active public media returns200 to anon/owner/authenticated foreign; draft/private/suspended/archived deny anon/foreign, while owner/admin private current read remains allowed. Old/orphan keys denied, including with broader permissive policy. Direct INSERT/UPDATE/DELETE denied for anon/owner/foreign, including while public current rows are visible. No remaining local blocker.

## Proposed production sequence — authorization still required

1. CEO reviews the completed local compatibility amendment and full implementation checkpoint, then grants separate production preflight/safety-gate/rollout authorization. No further compatibility decision is pending.
2. Separate production preflight authorization: refresh target pirezwaggwlfhwmdzisu, actual Git/deployment SHA, current PG version/executor privileges, expected7 history, Auth/profiles/capabilities/counts/IDs, organizations/memberships/jobs baseline, roles/default ACL/RLS/functions/triggers, bucket/runtime/current objects. Historical2026-10-08 baseline was16/16,13+3, organizations/memberships/jobs/admin0; it is NOT fresh. Unexpected existing organizations/memberships abort migration and require mapping review; do not silently invent backfill.
3. Separately authorized simplified safety gate: fresh read-only DB backup + private Storage bytes/metadata/path/version/hash inventory and manifest; validate nonempty archive/integrity. Apply approved photo quiescence operational rules if capturing existing photos. Full DR rehearsal remains DEFERRED, not claimed PASS.
4. Separately authorized APPLY: only reviewed20261009134719_stage5_employer_foundation.sql in existing checked postgres executor model; record eighth history entry atomically. On failure rollback and STOP. No SQL workaround.
5. Read-only DB post-verification: data/IDs, catalogs, state/score/ownership constraints, RLS/grants/roles/functions/triggers, private fields/current-media policies and advisors. No production synthetic org/user/admin creation.
6. Only with separate main-push/deploy approval: push reviewed Stage5 commits, deploy existing paulius1/vetkarjera project. No new infrastructure/project. Technical smoke Auth/session/existing specialist/employer shell, expectedRPC/schema/permission/logs; public/read/write organization scenarios require authorized test data/user flows.
7. Paulius manual production QA after rollout/frontend integration: required20/50→70 activation, optional100, type rules/Other, multicity, privacy, legal locks/transfers/read-only successor, logo/cover immediate replacement/reload/delete/reupload, public slug308, mobile/desktop, Stage4 photo/notice_period/session. Blockers fixed before closure; no automatic scope growth.

Rollback: migration SQL failure is transaction rollback+STOP. Deployment failure keeps/reverts last verified Stage4 release while assessing additive DB compatibility. Postdeploy critical FAIL stops rollout and proposes verified prior app release; no automatic destructive down. New Stage5 durable data must be preserved. DB or Storage restore only under separate incident authorization with point-in-time loss bounds and complete bytes+metadata; backups are not a reason for automatic restore. Never repeat historical migrations or modify Jobs FK.

## Decision and next step

READY FOR PRODUCTION ROLLOUT AUTHORIZATION.
BLOCKERS: NONE in the implemented local contract. Remaining verification boundaries: native17.11 versus historical production17.6 exact minor/executor, synthetic Auth/Storage transport, frontend/browser/production integration and freshness not yet checked. These are documented rollout gates, not claims of completed production QA.
CEO CONSULT must review this local result and explicitly authorize the next fresh production preflight/safety gate and reviewed migration/app rollout scope. Until that authorization, no production action. Paulius manual QA remains mandatory after rollout/frontend integration. No Stage7 UI/Stage8 Jobs/Applications added. No unrelated feature.

Production unchanged. No production connection or production credentials used in this work. No freeze/backup/production migration/main push/deploy. Full recovery rehearsal remains deferred.
