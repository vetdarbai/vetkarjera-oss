# Stage 4.5 specialist profile — local implementation / technical QA

Verdict: **STAGE 4.5 IMPLEMENTATION TECHNICAL QA PASS**

Backend base: `ac4dcab812d28876bb37073ac4567d16d2bb783b`.
Frontend branch: `codex/stage4-5-frontend`. Frontend SHA is this report's local implementation commit (`git rev-parse HEAD`).
No main push or production deployment is authorized by the resume specification.

## Implementation and integration

- `/profilis`: protected owner view with identity/photo, server readiness, structured professional sections and owner management. Existing employer-only account page retained; no Stage 5 CTA.
- STEP 1: nullable partial drafts, name/profession/Other specialty, profession-change confirmation, optional single photo.
- STEP 2: location, role-context education, LSMU/Other/student course/pharmacy qualification, experience, animal groups, activity areas, 500-character About, role-catalog interests, actual work preferences, languages and visibility.
- STEP 3: all six real backend profession matrices; veterinarian groups, student-specific scale, autonomy/development, Other custom competencies with explicit level selection. No invented competency entries or preselected demo answers.
- Backend-only completeness contract V2, `missingRequired`, readiness and 20/70/100 labels. The UI does not derive required rules or recompute percentages. Missing field codes are mapped to Lithuanian labels.
- Approved existing actions/RPCs are reused. STEP 1/2 and education send changed keys only; null clears nullable scalars; empty arrays clear collections. STEP 3 retains the existing full role-context replacement contract.
- Owner-only veterinarian license management: missing/pending/verified/rejected, private number only in the owner editor, no URL/browser storage/logging/public or employer disclosure. Verification does not affect readiness.
- Photo uses only existing app routes: GET/PUT/DELETE `/api/profilis/nuotrauka` and GET `/api/profilis/nuotrauka/vaizdas`. Upload/replace/remove/reload/file errors/retry work. No browser Storage mutation. Photo does not affect completeness.
- Manual save, unsaved/saving/saved states, inline field validation, generic form/network errors, retained input/retry. A successful write followed by a failed read is not misreported as a failed write or resent; subsequent edits survive read retry.
- Desktop three-step navigation; mobile selector, one column, competency accordions retaining answers, >=44px form controls and no horizontal overflow at 390/768/1440px. Approved existing brand/header and shared color/font tokens reused.
- Specialist-only header hides publishing using `hasEmployerProfile`, not legacy role. Auth/session/capability architecture is unchanged.

## Changed / new files

1. `app/profilis/page.tsx`
2. `app/profilis/profilis.css`
3. `app/profilis/read.ts`
4. `components/Navigation.tsx`
5. `components/SpecialistProfile.tsx`
6. `components/ProfileFields.tsx`
7. `components/ProfileProfessional.tsx`
8. `components/ProfileCompetencies.tsx`
9. `components/ProfileOwnerAssets.tsx`
10. `lib/profiles/read.ts`
11. `lib/profiles/view-model.ts`
12. `scripts/test-auth.cjs`
13. `scripts/test-profile-view.cjs`
14. `scripts/test-profile-ui.cjs`
15. `scripts/audit-profile-ui.cjs`
16. `scripts/run-profile-local.cjs`
17. `docs/STAGE4_5_LOCAL_QA.md`

The old Stage 3 placeholder-only profile test was updated to exercise the real owner view while preserving anonymous denial and privacy assertions; capability/header assertions were strengthened. Existing tests were not deleted or disabled.
No package/lockfile, migration, RPC implementation, RLS/grant, auth/session implementation, existing photo route, job-data or unrelated page changes.

## Executed local QA

| Check | Result |
|---|---|
| `npm run lint` | PASS, no ESLint warnings/errors; existing Next 15 `next lint` deprecation notice only |
| `npm run typecheck` | PASS |
| `npm run build` | PASS, optimized Next 15.5.24 build, all routes generated |
| Existing auth tests (`npm test`) | PASS, 35 deterministic tests with mocked Auth transport |
| Existing profile action/session/registration tests | PASS, 33 assertions |
| Existing profile DB / security regression | PASS, 166 PostgreSQL/PGlite assertions |
| Alignment regression | PASS, 280 PGlite assertions |
| Real alignment stack (`npm run test:alignment:local -- clean`) | PASS, 379 real Auth/PostgREST/Postgres17/Storage assertions against the already aligned, unlinked local stack; no reset/new migration |
| Types / DB audit | PASS, 39 tables, 11 RPCs; all 7 security checks |
| Frontend projection/PATCH (`node scripts/test-profile-view.cjs`) | PASS, 42 assertions |
| Browser + real HTTP/cookies/RPC/Storage (`node scripts/test-profile-ui.cjs`) | PASS, 125 assertions, both dev server and local optimized build |
| Client bundle/security (`node scripts/audit-profile-ui.cjs`) | PASS, 68 assertions / 51 built assets, actual local privileged key absent |
| Scope / whitespace | PASS, `git diff --check`; changed files limited to the list above |

Browser tests include partial clear/save/reload, free step navigation, exit/profession dialogs, real photo lifecycle/failed upload retry, all four license states, foreign/employer/anonymous denials, 20/70/100 and step gating, six professions, custom 1/2/3+ server percentages, LSMU/Other education/student course, language/animal/visibility clear/reload, saving state, transport/form/session failure, retained inputs, retry, successful-write/read-failure recovery, login/reload/logout and protected profile. Browser screenshots were visually inspected at 1440 and 390px; overflow also checked at 768px.

All accounts are randomized synthetic fixtures in the isolated local stack. No real Gmail signup, hosted Supabase mutation, production credentials or private real license numbers are used. Ignored `.staging-results` contains QA screenshots/results and temporary local TLS files, not committed source.

## Local execution / safety

The original opened folder has an unborn Git repository and unrelated untracked user files. The verified backend base was found in `D:/VetKarjera-Staging/workspace/backend`; its pre-existing documentation edits were preserved. Implementation uses an isolated local clone/feature branch. The read-only source is never reconstructed from an earlier report.

The local runner targets only the unlinked `/opt/vetkarjera-stage43` stack in WSL `VetKarjera-Stage43`. A loopback TLS proxy keeps the application's existing HTTPS-only environment guard intact. No app auth/security override or new dependency was added. Local build verification uses `http://localhost:4345/profilis`, not a public preview.

Next.js, Supabase, React and browser-verification skills guided server/client separation, owner reads, authenticated private image rendering, credential isolation and end-to-end QA. No schema/security workaround was required.

## Remaining limits / exact next step

1. This is LOCAL technical QA, not production readiness confirmation. Production still lacks the aligned migrations, private photo bucket and privileged server environment configuration. CEO CONSULT must separately authorize the rollout sequence and production smoke tests.
2. Unsaved warnings cover local step/back/header/footer navigation plus native refresh/tab-close. SPA browser-history Back is not globally intercepted; no risky router/history monkey-patch was added.
3. Education and STEP 2 use the two existing RPC transactions. They are not falsely presented as one atomic DB transaction. A failure retains fields and allows an idempotent retry; no new combined RPC was introduced.
4. The local TLS certificate is short-lived and generated only for QA. It is not production infrastructure. Browser tests use existing bundled Playwright plus installed Chrome, not a new project dependency.

Exact next step: CEO CONSULT reviews this local implementation commit and QA, then explicitly authorizes (or rejects) production backend + storage/environment + frontend rollout. Do not push/deploy or begin Stage 5 before that decision.

READY TO COPY TO CEO CONSULT

Stage 4.5 local implementation complete.
Production unchanged.
No production migration executed.
No main push.
No production deploy.
Stage 5 NOT started.
