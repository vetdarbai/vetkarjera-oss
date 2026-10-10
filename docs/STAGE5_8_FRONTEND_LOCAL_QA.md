# Stage5.8 employer frontend — local implementation and QA

Date: 2026-10-10. Frontend/UI/UX scope only.

## Authority and baseline

- Branch: `codex/stage5-8-employer-frontend`.
- Parent baseline: `d98b98d24aad23bfd841c61d1bdf9eebf2dba7f1`.
- Consolidated authorization: `VK-STAGE5-8-CONSOLIDATED-FRONTEND-SOURCE-OF-TRUTH-20261010`.
- Latest correction: `VK-STAGE5-8-NEEDS-INFO-CEO-DECISION-20261010`.
- Existing Stage5 migration SHA-256 remains `63f6354e97994a9f2abce92740f1b8451f35bfbf97e03c0b5dd06f67298a80f6`.
- No existing DB migration, DB/RLS change, production access, main push or deploy. Stage7/8 not started.

## Implemented surface

- `/profilis/darbdavys`: owner overview, server-provided states/completeness/capabilities, independent three-step editing, partial saves, locked legal identity, legal-change request, verification submissions, and ownership transfer.
- `/profilis`: employer-only entry routes to the employer profile; the existing specialist page exposes an employer entry. BASIC second-profile creation reuses the existing Stage4 contract.
- `/darbdaviai/[slug]`: public organization DTO only. Current active slug returns 200; historic active slug redirects with HTTP 308; unavailable/invalid profiles return HTTP 404 without revealing state.
- Existing `/api/organizacijos/slug/[slug]` JSON contract and organization media APIs unchanged.
- All 14 type paths use existing catalog codes/cardinality. Other custom entries, distributor mixed/nonexclusive animal segments, and lab free-text entries remain backend-driven.
- Standard benefit display copy follows the approved UI; submitted values remain existing backend codes. Team sizes use existing `size_1`–`size_6` codes.
- Public contacts remain independent of private representative phone/Auth email. Legal fields, representative details, verification evidence and private DTO are never used as public-page fallbacks.
- Immediate logo/cover changes preserve unrelated unsaved input. Version preflight and response checks prevent silent rebasing; cleanup failure rereads real context without false success.
- Conflicts retain input, forbid silent retries, and require explicit refresh/discard confirmation. Navigation is blocked while a write is pending. Native dialogs and before-unload protect unsaved forms.
- `needs_info` shows only “Patikrinimui reikia papildomos informacijos.” and “Peržiūrėti duomenis”, with existing actions governed by capabilities. No admin review context or fabricated reason.
- No publication switch, transfer history, legal-request history, directory, branch management, verification badge, admin workflow or Stage8 jobs implementation.

## Local browser verification

`scripts/test-employer-frontend.cjs`: **PASS, 107 assertions**, zero browser runtime errors.

Actual Next server components/actions and media route handlers run against an HTTPS loopback-only fixture. RPCs execute the existing SQL in a fresh ephemeral PostgreSQL WASM/PGlite database with real roles, session claims and RLS. The fixture never forwards requests to production. Auth identities and Storage transport/bytes are synthetic. This is NOT native GoTrue/PostgREST/Storage-service or production QA.

Eight passing groups:

1. Employer entry, empty profile, step1 and step2 partial saves, server 20/70 completeness and active/public state.
2. All 14 adaptive types, Other custom entries, nonexclusive distributor segments, lab free-text groups.
3. Benefit code round-trip, public contact/size fields, logo/cover upload/replace/delete/read, invalid media rejection, unsaved-text preservation, cleanup-error recovery and 100% completion.
4. Stale-version conflict/input preservation, explicit refresh, active→draft→active, historic 308, draft/unknown 404 and public/private separation.
5. Real verification requests, pending/needs_info display, no admin reason exposure, verified identity lock and full legal-change request without replacing approved identity.
6. Ownership request/cancel/decline/accept, restricted new owner, allowed representative update, representation approval and expired pending-list removal.
7. 320/360/390/1440 responsive owner overview and all steps, expanded optional panels, long organization name, 44px touch targets, no horizontal overflow, dialog focus/leave warning.
8. Minimal 70% public profile at 390/1440, existing 16px/desktop content gutters, no missing-image/contact placeholders, anonymous owner denial, invalid paths and suspended/archived public 404.

Generated evidence (ignored, local only): `.staging-results/stage5-frontend/report.json`, `next.log`, `overview-{320,360,390,1440}.png`, `step-{1,2,3}-{320,360,390,1440}.png`, `public-minimal-{390,1440}.png`.

Visual inspection confirmed desktop step1, mobile overview/steps2/3, and minimal desktop/mobile public profile. Full-page captures can repeat/stitch sticky header/save controls at scroll positions; this is not horizontal overflow or a second component instance.

## Automated regression results

| Check | Result | Boundary |
| --- | --- | --- |
| Employer action/admission/security | PASS 45 | Mocked authenticated transport; allowlist/version/payload/error privacy |
| Auth | PASS 35 | Mocked Auth; login, session/header, confirmation, signup, reset/resend |
| Profile actions/session/registration | PASS 33 | Existing contract tests |
| Photo SDK/error/DELETE | PASS 17 | Existing synthetic transport regression |
| Photo replacement routes | PASS 32 | Existing route/security regression, synthetic transport |
| Specialist database | PASS 168 | PGlite; sessions, profile/readiness/preferences/photo regression and notice_period |
| Backend alignment database | PASS 280 | PGlite |
| Organization database | PASS 310 | PGlite; existing schema/RLS/capabilities/transfers/public projections |
| Organization media | PASS 157 | Existing handlers + SQL/RLS, synthetic Storage transport |
| Generated types | PASS | 50 tables, 42 RPCs; no generated diff |
| Database audit | PASS 7/7 | RLS, exposed definers, anonymous execute, search_path, private grants/public fields, FK indexes |
| Lint | PASS | No ESLint warnings/errors |
| TypeScript | PASS | `tsc --noEmit` |
| Optimized production build | PASS | Next 15.5.24; no deployment performed |

Native Auth/Storage integration, production smoke, real-phone virtual keyboard and CEO visual acceptance: **NOT RUN** in this local-only scope. Browser touch-target/viewport checks are not a real-device keyboard test.

Nonblocking notices: existing Next lint deprecation and webpack cache serialization advisory. New authenticated/versioned Next Image sources emit a Next16 `images.localPatterns` migration advisory in development; images use `unoptimized` and existing authorized API reads, not image-optimizer access. No Next16 migration/config expansion made.

The initial streamed employer-only `/profilis` redirect produced a Next router hook error; it is now resolved before streaming through the existing authenticated capability RPC. Anonymous/profile session gates and backend Auth semantics remain unchanged. The final browser run has no runtime errors.

## Changed files

Created: `app/profilis/darbdavys/{actions.ts,page.tsx,loading.tsx,darbdavys.css}`, `app/darbdaviai/[slug]/{page.tsx,public-profile.css}`, `components/{EmployerProfile,EmployerProfileFields,EmployerMedia,EmployerOwnership,PublicEmployerProfile}.tsx`, `lib/organizations/{frontend,owner-read}.ts`, `scripts/test-employer-{actions,frontend}.cjs`, and this report.

Modified: `app/profilis/page.tsx`, `components/SpecialistProfile.tsx`, `middleware.ts` (early public-status and employer-entry routing), `package.json` (two test commands only), `scripts/test-organization-media.cjs` (public JSON test import now targets the unchanged API route).

Deleted: `app/darbdaviai/[slug]/route.ts`, replaced by the public page; the API JSON endpoint remains.

No dependency, lockfile, backend RPC, migration, RLS, media API, Auth action, global design-system or environment file changes.

## Reproduction and next step

Normal project commands: lint, typecheck, build, existing test commands, `test:employer:actions`, `test:employer:ui`. The browser fixture currently requires the approved Windows/WSL workspace, WSL OpenSSL, available Playwright and a browser. Supply `PROFILE_PLAYWRIGHT_MODULE` / `PROFILE_BROWSER_EXECUTABLE` if they are bundled outside project dependencies. It uses only ports 4368/4369, generates a one-day ignored local test certificate, starts/closes its own Next process and ephemeral DB, and does not install packages or reconfigure infrastructure.

In this workspace npm was not on PATH, so checks ran with the bundled Node executable and the exact installed Next/TypeScript/script entry points.

Commit attempt failed because no Git author name/email is configured in this repository or the other existing local VetKarjera checkouts. No author identity was invented and no global Git configuration was changed. All 22 scoped files remain staged; HEAD remains the approved baseline. A human must provide the author name/email before the local implementation commit can be completed.

Exact next step: obtain the Git commit author name/email and finish the local commit. CEO CONSULT can then review the isolated frontend implementation and visual evidence before issuing any separate deploy authorization. No main push or production deploy is authorized by this report.

Verdict: BLOCKED — Git commit author name/email not configured. Implementation and local QA are complete; delivery commit is pending.
