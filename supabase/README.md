# Stage 2 backend foundation

Existing project: `pirezwaggwlfhwmdzisu` (Vetkarjera, eu-west-1).

## Audit baseline

Audited main: `9372d2efaf10498ba1b9ce6480f464892d90026b`.
Next.js 13.5.6 App Router, React 18, TypeScript, Tailwind.
Forms keep state in React and do not call a backend. Jobs come from
`data/jobs.ts`; that source and all UI files remain unchanged.
No prior Supabase packages, environment files, database tables or migrations.
Both existing Next config files have identical settings and are left untouched.
GitHub reported the baseline deployment successful in `paulius1/vetkarjera`.

## Reproduce the database

The exact SQL is `sql/stage2_backend_foundation.sql`. It was applied to the
existing hosted project with migration name `stage2_backend_foundation`,
version `20260905075153`. Do not run it a second time against that project.
The repository had no migrations framework; this audited SQL is the source of
truth. On a fresh Supabase project, apply the file as a single migration using
the Supabase migration API or CLI. Do not apply it to unrelated databases.
No signup triggers, seed data, authentication changes or Storage changes exist.

## Access model

All five tables use RLS and explicit grants. Database roles `anon` and
`authenticated` are distinct from the application's `profile_role` enum.

| Table | Anonymous | Authenticated owner/member | Admin profile |
| --- | --- | --- | --- |
| profiles | No access | Read own | Read all |
| specialist_profiles | No access | Read own; update own updated_at | Read all |
| employer_profiles | No access | Read own; update own updated_at | Read all |
| organizations | No access | Read own organization | Read all |
| jobs | SELECT returns no rows | Read own organization's rows | Read all |

Only `updated_at` is updateable in the two profile shells: no editable personal
fields exist yet. The database trigger supplies the actual timestamp. When
private profile fields are added later, explicitly grant UPDATE on only those
fields. Never grant users UPDATE on role, IDs, membership or created_at.
No application role can insert or delete records in stage 2.

Roles and memberships require trusted provisioning, currently postgres or the
Supabase service role. No privileged key is required or loaded by the app.
`private.is_admin()` checks the current auth.uid() against a database-assigned
role, with a fixed empty search_path. Its tightly scoped SECURITY DEFINER lookup
avoids recursive profiles RLS; it is outside the exposed schema and anon cannot
invoke it. User metadata never grants authority. Admin browser sessions have
read access, not a general permission to change roles or create data.

An employer belongs to one organization through employer_profiles. A composite
foreign key ensures a job's creator belongs to that exact organization. Deletion
of organizations/memberships referenced by jobs is restricted, pending a later
approved deletion/reassignment workflow.

Jobs remain private until publication fields and an explicit public policy are
approved. Do not add a blanket public SELECT policy to the current shell.
Future admin-only license numbers belong in a separately protected table: an
owner-readable specialist row must not contain that field.

## Local connection and checks

Copy `.env.example` to `.env.local` and supply the existing project's
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Use the anon key (or a public publishable key); never a service/secret key.
Actual env values are not committed. Local files are ignored by Git.
The official packages are pinned and require Node 22 or 24.

```sh
npm ci
node --conditions=react-server scripts/check-supabase.cjs
npm run lint
npm run typecheck
npm run build
```

The connection check invokes both actual helper modules and checks anonymous
job isolation, denial of private reads and rejection of privileged keys.
It exercises the browser helper in Node; it does not replace a real browser test.
Execute `tests/stage2_rls.sql` as postgres on an empty test database to verify
ownership, role escalation, membership, admin reads and foreign keys. It uses a
transaction with ROLLBACK; it does not call Auth APIs or leave users behind.
If any assertion fails, ensure the transaction is rolled back before retrying.

## Stage boundary

Both helpers intentionally operate anonymously. No existing page imports them.
The server module is guarded by `server-only`, creates a fresh client per call,
does not accept user cookies and disables fetch caching. The browser helper does
not persist or refresh sessions. Auth cookie adapters, token validation and
Next.js middleware belong to stage 3 and must be implemented together before
these helpers are used for authenticated operations.

There is no public health endpoint, new page, form integration, middleware,
login/logout, email flow, CV, uploads, job creation/editing, notifications or AI.

## Production gate

Use only the existing Vercel project `paulius1/vetkarjera` and repository
`vetdarbai/vetkarjera-oss`, main. Before publishing, set both env variables for
Production in that project, confirm Node 22/24 and run the connection checks
with the production build environment. NEXT_PUBLIC values are captured at build
time: redeploy after changing them. Verify the resulting main commit deployment
and https://www.vetkarjera.lt. Do not create a new hosting project.

At the time of implementation, Vercel management access was not connected;
production environment configuration and release verification remain pending.

## Verification on 2026-09-05

- Baseline and final lint, TypeScript and production build: passed.
- Actual server and browser helper modules: live Supabase requests passed in Node.
- SQL isolation/privilege/foreign-key tests: passed; all fixtures rolled back.
- Supabase security advisor: no findings. Performance advisor only reports the
  three new FK indexes as unused on these empty tables.
- Secret scan: no actual env key in deliverable files; no privileged key markers
  in the browser bundle. `.env.local` is ignored.
- All 26 built browser JavaScript/CSS assets are byte-identical to the baseline.
- Seven main local production routes returned HTTP 200.
- Existing production home was inspected in the browser. The browser denied
  navigation to the local server, so browser execution of the new client and
  a post-release visual check remain pending with the production gate.

Existing Next.js 13.5.6 reports a known security vulnerability on installation.
Its upgrade was deliberately excluded from this stage's minimal diff. Resolve
that separately before enabling real authentication and private-data workflows.

References: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Node 20 deprecation](https://supabase.com/changelog/45715-deprecation-notice-dropping-support-for-node-js-20).
