# Stage5.13 backend corrections — local implementation

Authorization: VK-STAGE5-13-BACKEND-CORRECTIONS-20261011. Base: `7dbc4c7a41c5a539f2b7793d153868406a49d76d`. Branch: `codex/stage5-13-backend-corrections`. Workspace: `D:\VetKarjera-Staging\workspace\backend-stage5-13`. No production connection, migration, push or deploy.

## Clinic catalog

The previous five-entry catalog could not express walk-in patients, scheduled patients or night shifts. `regular_clinic` means “Įprasta klinika”, which does not establish daytime hours. It must not be silently converted to a daytime claim.

Eight current choices, in display order:

| Stored code | Label |
|---|---|
| daytime_clinic | Dienos metu dirbanti klinika |
| 24_7 | Visą parą dirbanti klinika |
| emergency | Skubi pagalba |
| walk_in | Gyva eilė |
| scheduled_patients | Registruoti pacientai |
| on_call | Budėjimai |
| night_shifts | Naktinės pamainos |
| inpatient | Stacionaras |

`regular_clinic` remains active/valid in the database and keeps its original label. The JSON catalog marks it `deprecatedForNewSelection: true`, order9. There are nine valid DB entries: eight current choices and one legacy value. No saved answer, type revision or organization control row is rewritten. Cardinality stays multi-select; daytime and 24/7 are not exclusive. All other type groups remain unchanged.

Frontend alignment: display eight current choices for new selection, retain/show an existing `regular_clinic` as “Įprasta klinika” until the owner deliberately changes it. Do not discard hidden legacy selections while saving another field. The DB does not block legacy clients from resaving that code. This is backward compatibility, not conversion to daytime hours.

## Verification submission

Existing RPC names, signatures, DTO and server action remain compatible. Only the request branch of `private.org_verification` changes:

* `request_employer_verification(organization_id, expected_row_version, payload: {scope:'identity'})` submits identity without evidence.
* `request_representation_verification(organization_id, expected_row_version, payload: {})` submits representation without evidence. The wrapper sets representation scope.
* Generic request RPC also accepts `{scope:'representation'}`.

The new request has pending status, real requester/subject/revisions, method NULL and zero submitted-reference evidence rows. Absence of evidence is a legitimate review task, not invented evidence. Admin review can see pending requests through its existing restricted context. Admin approval still requires an independently obtained method/reference and an independent trusted administrator. No owner access to admin review context/reasons is added.

Legacy payloads containing a real method/reference pair remain valid and retain submitted evidence. If either key is sent, both must be non-empty valid values; omit both for the new flow. Blank/null/partial pairs, unknown fields and invalid scopes are rejected.

Duplicate semantics stay unchanged: stale rowVersion fails40001. Resubmission with a fresh rowVersion cancels an existing pending request of that scope and creates a new pending request. It does not create two simultaneous pending requests for the same scope. Existing approved/needs_info history stays readable. New submission from needs_info returns pending. Aggregate unverified/pending/verified/needs_info and identityApproved/representationApproved/capabilities remain unchanged.

Frontend: remove method/reference controls and replace them with the approved explanatory copy plus “Pateikti patikrinimui”. Retain the current scope sequencing: request identity when not approved, then representation using the newly returned rowVersion. Use returned context; do not fabricate metadata or call admin context. Keep “Patikrinimui reikia papildomos informacijos.” and “Peržiūrėti duomenis”. No frontend component was modified in this backend task.

## Migration and executor

New migration: `supabase/migrations/20261011144348_stage5_13_backend_corrections.sql`, generated with the installed Supabase CLI. Historical migration files are unchanged relative to the base commit.

Migration SHA-256 (canonical LF bytes): `21807ab300659f2a7fee14335398681af4961fac8fba7787dd19fff8976850f4`.

The Stage5 foundation closes postgres SET/INHERIT and private CREATE on the internal writer. This migration reuses its transaction-scoped ownership window: temporarily grants SET/INHERIT and private CREATE, replaces the existing function as its original writer owner, then restores NO SET/INHERIT and no CREATE before commit. No API permissions are widened. CREATE OR REPLACE preserves function owner/ACL/search_path. Role membership records and private schema ACL were compared exactly before/after the upgrade. Admin resolve/legal/state branches remain source-equivalent. No ownership transfer or Auth change.

## Local QA

* Native PostgreSQL17.11 clean chain: PASS401 assertions.
* Native PostgreSQL17.11 production-equivalent nonsuperuser executor upgrade: PASS452 assertions, including67 correction assertions, synthetic legacy selections and pending/approved/needs_info evidence preservation, exact permission/membership comparison, unchanged managed Auth catalog, RLS/session boundaries and two-connection concurrency.
* PGlite clean/organization behavior: PASS377 assertions, including67 correction assertions. Engine18.3; native PG17 is the target-major proof.
* Organization media regression: PASS157 assertions, synthetic/mocked transport.
* Employer server action/privacy/admission: PASS55 assertions; verifies evidence-free payloads are forwarded without fabricated fields.
* Auth regression: PASS37 deterministic mocked-transport tests.
* Profile action/session regression: PASS33 assertions.
* Lint, TypeScript, production build: PASS.
* Local advisors on clean and executor databases: ERROR0/WARN0. INFO findings remain informational (clean49/executor48).

Reports: workspace `.staging-results/stage5-native-executor.json`, `stage5-native-clean.json`, `stage5-pglite.json`, `stage5-media.json`. Native executor evidence: `D:\VetKarjera-Staging\qa-private\stage5-native-1791730288709-yHVPWM`.

Limitations: synthetic SQL Auth/session and Storage models; no real GoTrue/PostgREST HTTP or production browser/manual QA in this local task. Fresh production minor version/executor/history and migration hash must be rechecked under separate rollout authorization. Existing production leaked-password warning was not rechecked or changed.

## Rollout and recovery

CEO reviews this backend result and frontend contract first. Frontend developer aligns only the approved controls/catalog behavior and runs affected QA. After separate authorization, refresh production baseline and required backup safety gate; apply only the new migration atomically, perform read-only post-verification, then push/deploy the approved combined application changes. Paulius completes manual production QA. Stage5 remains open until blockers and manual QA are complete.

SQL failure rolls back the entire transaction, including the temporary executor window, then STOP. If app deployment fails, the previous frontend remains compatible with the new backend. Revert application release only after approval as needed; no automatic destructive down migration. Do not delete new catalog rows after users select them. Retain old/new selections and review history. DB/Storage restore requires separate incident authorization; this task authorizes none.

Verdict: READY FOR FRONTEND ALIGNMENT REVIEW. No remaining local blocker. Production unchanged. No production migration, main push or deploy.
