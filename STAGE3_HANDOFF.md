# Stage 3 Auth implementation checkpoint — 2026-09-08

Status: implementation and local verification are ready for review. Stage 3 is NOT complete. This checkpoint has not been pushed or deployed. The production application baseline is commit 4bd9e1bda095f9cff1b6b2c35da1834fb90aa48d (Stage 2); the database migration and Auth configuration below have already been applied to the existing hosted Supabase project.

## Targets

- GitHub: vetdarbai/vetkarjera-oss, main.
- Vercel: paulius1/vetkarjera; https://www.vetkarjera.lt.
- Supabase: pirezwaggwlfhwmdzisu. No new project, SMTP provider or privileged application key.

## Implemented

- Specialist and employer signup from existing questionnaires; only account basics and the allowlisted role are transmitted. Full profile integration is deferred.
- Mandatory email confirmation, verification resend, login, global logout, SSR cookies/session validation, forgotten-password request and password update.
- Default Supabase email templates supported through PKCE code exchange. The browser requesting the email must retain its verifier cookie and open the link in that browser. Optional token_hash callbacks are supported for future custom templates.
- Server validation, passwords of 8–128 characters, neutral account-existence responses, fixed production email redirect, safe internal redirect allowlist, private response no-store and callback no-referrer.
- Signed-in login page contains “Esate prisijungęs” and an outlined secondary “Atsijungti” button with a 20px gap. Successful logout sends the browser to the homepage.
- Navigation, homepage, global CSS, job data and package dependencies are unchanged. No Stage 4 work.

## Database changes already applied

Migration: supabase/migrations/20260908142249_stage3_auth_accounts.sql. Hosted migration version: 20260908142249, name stage3_auth_accounts. Do not apply it again.

A signup trigger provisions only specialist/employer profiles and rejects absent/invalid/admin role choices. Later user metadata updates do not change the stored application role. Restrictive RLS policies add a confirmed-email and live-auth-session requirement to the five existing private tables. Existing ownership/admin restrictions remain in effect; revoked sessions cannot use stale JWTs to read private data.

The Stage 2 schema source remains supabase/sql/stage2_backend_foundation.sql, outside the migrations directory. The migration directory alone is not a blank-project bootstrap. The historical stage2_rls.sql assumes pre-auth provisioning; run stage3_rls.sql for the current schema. It includes the baseline isolation checks plus the Auth changes, with all fixtures rolled back.

## Configuration

The existing project's Site URL was changed from localhost to https://www.vetkarjera.lt; the exact /auth/confirm production URL was added to the redirect list. Email confirmation is enabled and anonymous sign-in is disabled. Email link expiry was 3600 seconds at inspection. Minimum password length was set to 8; the final saved state is recorded separately if reconfirmed below.

Vercel Production has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for the existing project. Values are not included in this report. No .env file is committed; no service_role key is used. Supabase default email remains a test-only configuration; custom SMTP is not configured.

## Verification evidence

| Check | Result and scope |
| --- | --- |
| Lint | PASS; Next.js lint-command deprecation warning only |
| TypeScript | PASS |
| Production build | PASS with Next.js 15.5.24 |
| Auth logic | 23 deterministic tests PASS; mocked Auth transport, not live end-to-end accounts |
| Local production HTTP | PASS: public/auth routes, dynamic job, cache headers, invalid callbacks, cross-origin action rejection, role tampering and unauthenticated password change |
| Supabase connection | PASS using actual server helper and public anon configuration; private profile access denied |
| RLS | PASS against hosted database in a rolled-back transaction: baseline ownership/isolation, signup role restrictions, metadata immutability, unconfirmed accounts and revoked sessions |
| Supabase security advisor | No lints returned at inspection |
| Browser | Local production desktop/mobile pages inspected; no horizontal overflow on inspected pages, no captured browser console errors |
| Signed-in UI | Actual component server-render test PASS; authenticated browser appearance still pending |
| Client bundle | 33 JavaScript chunks scanned; no privileged-key patterns found |
| Live specialist signup | Accepted; unconfirmed login/session denied |
| Verification delivery | User confirmed receiving the signup email |
| Password-reset request | Supabase accepted the real request; delivery/link/password-change not yet verified |

The first build exposed use of a non-publicly-typed SDK response field. It was replaced with the public PASSWORD_RECOVERY event, and the final build and tests passed. Expected rejection tests intentionally exercise failing requests. Initial sandbox network attempts failed; authorized network reruns passed.

One authorized test account remains unconfirmed; no questionnaire/organization records were created. Its generated test password was not retained. An attempted direct DB confirmation-token read was rejected by automatic safety review and abandoned. No token was read and no email confirmation was bypassed. Old technical-test email links cannot establish the user's browser session because that browser did not originate the PKCE request. Use a fresh browser request after deployment; do not paste tokens or links into chat.

## Still required before Stage 3 completion

1. Paulius reviews the exact commit and approves its push to main, per task section 18.
2. Push and verify GitHub main; deploy to the existing Vercel project and verify the production commit.
3. Run the user-driven email flows in the production browser: fresh verification/resend, both account roles, duplicate signup, verified login, session persistence, logout, private-data denial, reset delivery/link and actual password change. The user enters and submits their own new password.
4. Inspect production runtime logs and repeat relevant production desktop/mobile checks, including authenticated UI.
5. If default-email restrictions block these tests, stop and present an SMTP recommendation; do not add a provider or credentials without authorization.

## Reproduction

Run npm run lint, npm run typecheck and npm run build. This environment used the equivalent local package executables through Node because npm was not on PATH.

- node scripts/test-auth.cjs
- node --conditions=react-server scripts/check-supabase.cjs
- Start the production build on 127.0.0.1:4320, then node scripts/test-auth-http.cjs.
- Run supabase/tests/stage3_rls.sql against the intended existing project as one transaction; it ends with ROLLBACK.

Changed paths are available from git show --stat of this checkpoint commit. Application changes are confined to Auth routes/components/helpers, questionnaire account submission, Supabase SSR helpers, middleware and their verification scripts, SQL and documentation.
