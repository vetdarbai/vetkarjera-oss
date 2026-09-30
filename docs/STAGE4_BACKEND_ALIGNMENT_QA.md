# Stage 4 alignment — reproducible local QA

Use only the existing VetKarjera-Stage43 Ubuntu WSL2 distro on D:, /opt/vetkarjera-stage43, and config project_id vetkarjera-stage4-3-isolated. Keep an Ubuntu terminal open while running the local stack. Do not link, use production credentials, or point any test to a hosted URL.

The tested CLI is pinned to 2.117.0. Official --help confirms --network-id as a global flag. All published Docker ports must be 127.0.0.1. Existing isolated stack start/reset must retain --network-id vetkarjera-stage43-local.

Prerequisites: existing Docker Engine and synthetic local Supabase stack; npm ci from the reviewed package-lock.json. No platform installation/reconfiguration in this procedure.

Run inside that workcopy:

```bash
test ! -f supabase/.temp/project-ref
node node_modules/supabase/dist/supabase.js db reset --local --version 20260915210103 --no-seed --network-id vetkarjera-stage43-local
node scripts/test-alignment-local.cjs upgrade
node node_modules/supabase/dist/supabase.js db reset --local --no-seed --network-id vetkarjera-stage43-local
node scripts/test-alignment-local.cjs clean
npm run lint
npm run typecheck
npm test
npm run build
node node_modules/supabase/dist/supabase.js db advisors --local --type all --level info --output-format json --network-id vetkarjera-stage43-local
```

Reset is destructive ONLY to the approved synthetic isolated stack. Never run it in another checkout/with --linked/--db-url/--project-ref. Capture CLI reset/start diagnostics privately under ignored .staging-results; start/status output can contain local keys, so do not copy it to chat or public artifacts.

test-alignment-local.cjs refuses a linked target and non-local fetches. It reads CLI local keys into memory; confirms synthetic example.test accounts through the LOCAL GoTrue admin API. It does not send production email or retain credentials in its public reports. A broad permissive Storage policy is created only as an adversarial LOCAL QA fixture and removed in finally; restrictive production-intended policies must still block access/mutation.

Reports:
- docs/qa/stage4_alignment/clean.json
- docs/qa/stage4_alignment/upgrade.json
- docs/qa/stage4_alignment/technical.json
- docs/qa/stage4_alignment/advisors.json

The original Stage4.3 PGlite regression matrix deliberately runs against the original four migrations. The new alignment matrix runs the latest application migrations. PGlite does not emulate the Storage platform; actual Storage RLS/operations are covered by the real local stack. Storage-specific helper/policies are not claimed as PGlite coverage.

For the HTTP-based local stack only, route tests inject the cookie-authenticated client and the privileged Storage wrapper's local endpoint. The application's production HTTPS guard is not relaxed. Manual production and actual browser/Next HTTP cookie checks remain outside this local technical QA result.

No secret, production data or private logs belong in docs/qa or Git.
