# Stage5.14 frontend corrections — local QA

Authorization: `VK-STAGE5-14-FRONTEND-CORRECTION-PACKAGE-20261011`.
Scope: local implementation, affected QA and local commit only. No push/deploy, production data, migrations, Auth/RLS changes, Stage7/8 or new infrastructure.

## History and integration

- Branch: `codex/stage5-14-frontend-corrections`.
- Production/base reference: `7dbc4c7a41c5a539f2b7793d153868406a49d76d`.
- Starting local frontend HEAD: `45507c1d1b3cd6c86c44fd69ba637c593024eca5` (specialist employer CTA).
- Approved backend: `537397e499e254136f39388eda248d98742a1511`.
- Non-fast-forward integration: `61751870a615d79f92853ac7fdc6cdbaa9b8e7ba`, parents `45507c1` and `537397e`.
- Both approved commits remain ancestors. Neither was amended.
- Approved migration canonical Git-blob SHA-256: `21807ab300659f2a7fee14335398681af4961fac8fba7787dd19fff8976850f4` — verified. Migration semantics/file were not edited. Windows CRLF checkout bytes differ from canonical LF bytes, as documented in the backend handoff.

## Implemented

- Overview reads the actual organization type. Active/completed states use subtle green; draft/incomplete/optional uncompleted STEP3 use amber. Secondary outlined step actions retain >=44px targets. Active preview copy is exactly `Peržiūrėti, kaip profilį mato kiti` on both layouts.
- Ownership renders only with a visible state/result, transfer or capability-based action. Existing permission and transfer operations are unchanged. Expiry uses Lithuanian month names and Vilnius-local hours/minutes, without seconds.
- Idle sticky Save status is empty, with disabled Save. Dirty/saving/error/conflict feedback remains meaningful. Success feedback outside the bar and immediate media statuses remain. Mobile padding is lighter; safe area, normal-flow reserved height and focused-field clearance remain.
- STEP2 privacy text is exact approved copy, 16px, with informational-blue background and readable line height.
- Clinic work-model choices use the eight approved catalog codes/order. Saved `regular_clinic` remains readable/selectable for removal, is preserved across unrelated writes and is never auto-mapped. Once deliberately removed, it is not offered as a new choice. Daytime + 24/7 are not mutually exclusive.
- Activity summary uses the current catalog's required-group matrix (AND), not a new completeness rule. A clinic needs animals and clinical areas; incomplete activity is amber.
- Website/social inputs accept bare domains and `www`, normalize to full HTTP(S) URLs before save, reject unsafe/malformed input without sending a mutation, and preserve entered values on failure. Server URL validation remains authoritative and unchanged.
- Verification dialog removes method/reference controls and uses the exact approved explanation. Identity uses `{scope:"identity"}` only when needed; representation uses `{}`. Each sequential request uses the last returned rowVersion. No fabricated/admin evidence is sent. `needs_info` remains neutral and exposes no reviewer notes.
- Public-only cover presentation is 4:1 desktop and 2.5:1 mobile, centered with object-fit cover. Stored media and editor presentation are unchanged. Logo stays connected to identity.
- Public contacts are lightweight, full-row links with semantic labels/chevrons, hover/focus and appropriate tel/mailto/HTTP(S) behavior. Only provided public DTO fields are rendered; private STEP2 information remains excluded.
- Duplicate-city validation appears at one conflicting field. Custom-benefit copy is `+ Pridėti dar vieną privalumą`; existing max10 limit remains.
- Prior specialist CTA implementation is unchanged: sidebar below steps on desktop, secondary element below content on mobile, correct existing flow and neutral copy when an employer profile already exists.

Public `Organizacijos veikla` redesign: **WAITING FOR DESIGN**. No final separate visual direction was supplied; current public functionality/presentation was deliberately preserved.

## Verification

Run from the repository root using Node entrypoints equivalent to package scripts (npm is not on this shell's PATH):

| Command | Result |
| --- | --- |
| `node node_modules/next/dist/bin/next lint` | PASS, no ESLint warnings/errors |
| `node node_modules/typescript/bin/tsc --noEmit` | PASS |
| `node node_modules/next/dist/bin/next build` | PASS, optimized build and all 15 static-generation steps |
| `node scripts/test-employer-actions.cjs` | PASS, 78 assertions |
| `node scripts/test-employer-frontend.cjs` | PASS, 240 assertions, 9 groups, no browser runtime errors |
| `node scripts/test-organizations-db.cjs` | PASS, 377 PGlite assertions including Stage5.13 alignment |
| `node scripts/test-organization-media.cjs` | PASS, 157 assertions |
| `node scripts/test-auth.cjs` | PASS, 37 deterministic tests, mocked Auth |
| `node scripts/test-profile-actions.cjs` | PASS, 33 assertions |
| `git diff --check` | PASS |

Browser fixture uses existing bundled Playwright via `PROFILE_PLAYWRIGHT_MODULE` and installed Edge via `PROFILE_BROWSER_EXECUTABLE`; no dependency was added. Scope is actual Next UI/actions + real ephemeral PostgreSQL WASM/RLS, with synthetic local Auth/Storage HTTP transport. This does not claim native GoTrue/PostgREST/Storage-service or production end-to-end QA.

Only localhost:4368 and loopback 127.0.0.1:4369 are used. Actors, sessions, contacts and images are synthetic; no real-user data or production requests are needed. Browser external-request guard had no external attempts. The test transport's specialist table reads are an explicit allowlist derived from the existing reader, execute as the authenticated actor and retain RLS.

Specific assertions A–P cover overview type; green/amber draft/active/STEP states; idle Save; exact privacy; eight choices; legacy read/preserve/remove; required-group summary; website/social normalization and unsafe rejection; evidence-free identity + representation and representation-only requests; latest version; no obsolete controls; ownership visibility; preview copy; cover ratios; one duplicate error; benefit copy; specialist CTA without/with employer profile.

Responsive checks cover 320, 360, 390, 899, 901 and 1440px; no horizontal overflow, long labels, 44px controls, STEP2/3, last field/phone helper above Save, unobscured footer, reduced 390x500 viewport and unsaved dialog focus. Existing media replacement/remove/failure recovery, stale-version retention, slug redirects, verification/needs_info/readonly legal requests, transfer cancel/decline/accept and restricted new-owner behavior also pass.

React quality review retained unconditional hooks, derived presentation, existing permission checks and scoped CSS; no new library/design system or unrelated refactor.

## Visual evidence

Ignored local outputs: `.staging-results/stage5-14-frontend/report.json`, `next.log` and screenshots. These are real local implementation captures, not mockups. Full-height capture viewports avoid sticky-bar stitching artifacts without altering DOM/CSS; sticky behavior is tested separately at 900px and reduced height.

1. `01-employer-overview-desktop.png` — 1440px.
2. `02-employer-overview-mobile.png` — 390px.
3. `03-step2-privacy.png` — 390px.
4. `04-verification-modal.png` — 390x900px.
5. `05-clinic-work-models.png` — actual work-model element in a 390px viewport.
6. `06-public-cover-mobile.png` — 390px.
7. `07-public-profile-desktop.png` — 1440px.
8. `08-specialist-cta-desktop.png` — 1440px.
9. `09-specialist-cta-mobile.png` — 390px.

Notes: the Next development indicator is not product UI; fixture media are simple synthetic color images for framing, not final organization branding. Existing Next15 development warnings about future Next16 images.localPatterns and unused loading-CSS preloads are nonblocking and were not expanded into unrelated configuration work. Production build passes.

## Next gate

No implementation blocker. CEO correction/visual review is next. Public activity needs a separate approved design. Any coordinated Stage5.13 backend migration + frontend release requires new explicit rollout authorization; this frontend should not be published against the old evidence-required verification contract. Stage5 is not declared closed.

Production unchanged. No production migration executed. No main push. No production deploy. Stage7/Stage8 NOT started.
