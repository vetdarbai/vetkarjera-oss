# Stage 5.4 local executor compatibility correction

Authorization: VK-STAGE5-4-EXECUTOR-COMPATIBILITY-LOCAL-FIX-AUTHORIZED-20261009.
Local compatibility QA: **PASS**. Production safety gate must be completed separately; this file does not authorize or claim a production migration, push or deployment.

## Problem and corrected boundary

The reviewed migration attempted Auth namespace USAGE and auth.uid EXECUTE grants which the real non-superuser postgres cannot delegate. Earlier synthetic native QA initialized postgres as a superuser and did not reproduce managed Auth ownership/ACL.

Only the new `20261009134719_stage5_employer_foundation.sql` changes. Historical migrations and app code remain unchanged.

- Remove Auth namespace, auth.uid and auth.users grants to organization writer/reader.
- Use existing postgres-owned `private.has_active_session()`, `private.require_active()` and `private.is_admin()`. Their definitions, ownership and existing API ACL semantics remain intact; only the two new internal roles receive controlled helper EXECUTE.
- Replace organization-side auth.uid references with the live validated actor. `org_live_actor()` is SECURITY INVOKER, returns NULL for absent sessions, and avoids exceptions in public read predicates.
- Add postgres-owned, private `stage5_confirmed_transfer_target(uuid,text)`, SECURITY DEFINER with empty search_path. It requires a live owner or trusted admin, returns only the confirmed transfer target UUID, and is executable only by the internal organization writer and its owner. No API/PUBLIC/organization-reader EXECUTE; no Auth writes.
- Put the existing organization account deletion guard on product-owned `public.profiles` BEFORE DELETE. Existing Auth-to-profile FK cascade enforces the same owner-transfer rule on Auth account deletion. Current-owner deletion deny, former-owner deletion and pending-transfer/history behavior pass. No new or changed Auth trigger/object.
- Keep all reviewed organization roles, RLS/session/privacy rules, Storage guard split, media keys and public RPC contracts.

Migration bytes SHA-256: `63f6354e97994a9f2abce92740f1b8451f35bfbf97e03c0b5dd06f67298a80f6`.
Exact SQL diff: `git diff 3a0a4eac3a984208bf24a637b5c2c05beae04c97 -- supabase/migrations/20261009134719_stage5_employer_foundation.sql`.

## Ownership evidence clarification

The preserved raw production catalog says auth namespace owner is **supabase_admin**, while auth.users, auth.sessions and auth.uid/auth.jwt are owned by **supabase_auth_admin**. The preceding executor-blocker prose incorrectly called the Auth object owner the namespace owner. The original missing-grant-option finding remains valid. Both ownership variants were tested locally; neither grants postgres Auth owner SET/inheritance or namespace/uid grant options. The fresh production preflight must reconfirm actual ownership.

## Native executor QA

Command: `node scripts/test-organizations-db.cjs native-executor` (also package script `test:organizations:executor`).
Evidence: `.staging-results/stage5-native-executor.json`; protected native evidence root `D:\VetKarjera-Staging\qa-private\stage5-native-1791562469286-1PcrhN`.

PostgreSQL **17.11**, SCRAM, loopback-only ephemeral server. Separate local bootstrap initializes synthetic seven-migration source and test users. It is never the eighth-migration executor. A distinct connection has current_user=session_user=postgres, NOSUPERUSER, no Auth owner membership/SET and no Auth namespace/uid grant options before and after Stage5 execution. It applies Stage5 and records history atomically; no superuser or SET ROLE shortcut for that execution.

Synthetic source baseline: 17 users/profiles, 13 specialist, 4 employer. Clean seven-migration construction + 7→8 upgrade PASS, all baseline rows preserved. Cutover lock failure rolls back without creating Stage5 roles/history; subsequent unlocked execution PASS.

**376 assertions PASS**, including 29 additional executor/session/privilege boundary assertions. Managed Auth schema/table/function ownership, ACL, definitions and application triggers remain identical before/after the migration. New roles have no Auth schema/table privileges and retain NOLOGIN/NOINHERIT/NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOREPLICATION/NOBYPASSRLS, no private CREATE, no API membership or final postgres SET/INHERIT. No unauthorized GRANT warnings.

Coverage: missing, expired, revoked, unconfirmed and forged-subject/session denial; live owner/admin; foreign and dual-profile mutation denial; private/legal/representative access; verification/transfers/deletion guard; current immutable organization media and specialist photo RLS; two real connections/concurrency; Stage4 native specialist saves and account capabilities. Alternate namespace owner supabase_auth_admin: 376 assertions PASS as well.

## Affected regression and code quality

- Organization media route/Sharp/synthetic transport: 157 PASS.
- Stage4 Auth: 35 PASS; profile actions/session/registration: 33 PASS.
- Photo error/delete: 17 PASS; photo replacement routes/security/persistence/version handling: 32 PASS.
- Profile DB: 168 PASS; alignment DB: 280 PASS.
- Generated types consistency and all seven SQL security audit checks PASS.
- Lint, TypeScript and Next15.5.24 optimized production build PASS.
- Supabase CLI2.117.0 native local advisors: ERROR0/WARN0/INFO49 (48 unused-index and existing private.account_admins RLS/no-policy). No new migration-caused ERROR/WARN.

The bundled runtime has no npm command; package script bodies were run directly with the bundled Node24.19.0 executable, without installation or package changes beyond the added test script.

Limits: native PG17.11 versus production17.6; Auth/Storage tables and transport are explicit synthetic fixtures, not live GoTrue/Storage HTTP. Native Storage fixture is postgres-owned; production uses managed ownership and its reviewed supautils.policy_grants allowance. Fresh preflight must reconfirm that allowance. No new Storage permission workaround is proposed. Expired/signed JWT transport handling is covered by existing route/auth tests; SQL tests validate actual live database sessions and subject ownership. No production login, test user, organization or admin is created for local QA.

## Next gate and stop rules

Resume separately authorized fresh read-only production preflight, then create a **new complete** timestamped DB/photo safety set. Previous `stage5-safety-20261009T153838Z` remains INCOMPLETE_STOPPED_NOT_A_VALID_SAFETY_SET; its old photo bytes are not reused. Reconfirm main/deployment, seven histories, executor/catalog/platform, counts/invariants, writers and current Storage objects. Use approved temporary PUT/DELETE-only photo freeze, fresh BEFORE bytes, native PG17/TLS verify-full/read-only shared snapshot, archive list/nonzero/hash checks, fresh AFTER bytes and equality/manifest, then remove only that freeze.

If any new executor privilege, schema/history/platform mismatch, unexpected organization/admin/job data, byte/metadata drift or unsafe capture occurs, STOP. No production permission repair. Full DR rehearsal remains deferred under the accepted pre-launch risk.

After the complete safety gate, report the new local commit, migration byte hash/execution copy and safety evidence to CEO CONSULT. Await a separate production migration authorization; then separate main push/deploy authorization. Use the previously reviewed transactional migration/verification/STOP and non-destructive app rollback plan. No automatic production restore.

No production migration, production Auth/schema/data write, main push or deployment performed by this local correction. No Stage7/8 scope added.
