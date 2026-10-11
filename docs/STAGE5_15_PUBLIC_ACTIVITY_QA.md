# Stage5.15 — public employer activity, local implementation and QA

Authorization: `VK-STAGE5-15-PUBLIC-ACTIVITY-IMPLEMENTATION-20261011`.
Approved design: `VK-S515-PUBLIC-ACTIVITY-DESIGN-20261011`.
Branch: `codex/stage5-15-public-activity`.
Baseline: `e742d74cf7687dab4954476c40b52e130c3ca7dd`.
Approved backend ancestor remains `537397e499e254136f39388eda248d98742a1511`.

## Implementation boundary

Only public `Organizacijos veikla` presentation changed: scoped section class and decorative `aria-hidden` 3x16px medical-blue markers, 12px title gap, titles 16/24px weight 600, values 16/24px weight 400 aligned below titles with a 6px gap. The existing H2 hierarchy remains; its first-group gap is 20px. Full-width 1px existing-token separators occur only between visible groups, with 18px desktop / 16px mobile spacing. The next section retains its single existing boundary. There are no cards or extra outer/horizontal padding.

Natural wrapping and min-width containment remain, with `overflow-wrap: anywhere` breaking otherwise unbreakable tokens only as needed. No fixed heights, ellipsis, line clamp, internal scrolling or expand action. Existing DTO mapping, group/value ordering, labels, dot separators, type adaptation and empty-group hiding are unchanged.

No changes to DTO/contracts/catalogs, completeness, visibility, STEP3 editor, contacts/sidebar, benefits, navigation, Auth, RLS, backend or migrations. No dependencies added.

## QA evidence

- Lint: PASS (`node node_modules/next/dist/bin/next lint`, equivalent to the package lint script).
- TypeScript: PASS (`node node_modules/typescript/bin/tsc --noEmit`).
- Employer action/admission/security tests: PASS, 78 assertions (`node scripts/test-employer-actions.cjs`).
- Focused actual Next/browser activity tests: PASS, 511 assertions (`node scripts/test-employer-frontend.cjs --public-activity-only`). Report has zero browser errors, zero browser warnings and zero attempted external browser requests.
- Existing nine employer frontend regression groups each passed during the broader affected-harness runs: owner creation and publication, all 14 adaptive editors, benefits/media, version conflict/slug/privacy, Stage5.14 corrections, verification/legal readonly, transfers, responsive editing/specialist CTA, and minimal public/unauthenticated access. Those broader executions initially stopped in the new QA fixture, not in these existing groups; do not describe them as a single completed full-suite PASS.
- Two new test-fixture assumptions were corrected: synthetic DOM title stress now waits for hydration; clearing activity explicitly submits empty options/custom values for each group because the existing RPC patches supplied groups and an empty groups array is a no-op. No product/backend fix was needed. The final focused run passed all affected activity cases.
- Production build: PASS (`node node_modules/next/dist/bin/next build`).
- `git diff --check`: PASS.

At 320, 360, 390 and 1440px: one group/one value; multiple groups; many values; longest actual catalog group title/type adaptation; synthetic multiline group title; natural long text and a pathological unbroken token; empty groups and fully empty section; no horizontal overflow; exact marker/font/gap metrics; full-width nonduplicated separators; unchanged contact/sidebar and benefit markup, styles and horizontal dimensions. Long lists increase normal-flow height. The synthetic title stress case modifies only local test DOM after hydration, is discarded on navigation, never changes a catalog/DTO, and is not used in deliverable screenshots.

The fixture reuses the existing ephemeral PostgreSQL WASM/RLS, loopback synthetic Auth/Storage HTTP transport and actual Next UI. It is not a claim of native Supabase-service or production E2E QA. Only localhost:4368 and 127.0.0.1:4369 are used, with synthetic users, test keys and `.example.invalid` contacts; no production credentials or records are used. Verification/Supabase/environment guidance kept checks scoped and isolated; no production environment pull was performed.

## Real visual evidence

Ignored local output directory: `.staging-results/stage5-15-frontend`.

- `10-public-activity-desktop.png`: actual 1440x1186 full-height viewport.
- `11-public-activity-mobile.png`: actual 390x1769 full-height viewport.
- `report.json`: final focused PASS and capture metadata.
- `next.log`: local runtime evidence.

Both captures show About → Activity → Benefits with realistic synthetic Lithuanian veterinary content. They are screenshots of implementation, not mockups, and are surfaced inline in the chat. The small Next development indicator is tooling, not product UI. No visual blocker observed.

## Next gate

CEO final Stage5 visual review of these actual local screenshots. Any coordinated backend/frontend production rollout needs separate explicit authorization. No main push, production deployment, production migration or Stage5 closure is authorized or performed. Stage7/Stage8 not started.

Production unchanged.
