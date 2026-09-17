const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
// A real PostgreSQL engine in WASM. Auth transport is not simulated here:
// only the documented Auth tables/JWT SQL helpers needed by the application.
const bootstrap = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; grant usage on schema auth to authenticated,anon;
create table auth.users(id uuid primary key, email text unique, encrypted_password text, raw_user_meta_data jsonb, email_confirmed_at timestamptz);
create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade,not_after timestamptz,created_at timestamptz,updated_at timestamptz);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
-- Match Supabase's actual auth.uid(): do not add a nested auth.jwt() lookup
-- that incorrectly requires runtime namespace USAGE for restricted writer roles.
create function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
grant execute on function auth.jwt(),auth.uid() to authenticated,anon;
`;
async function createDatabase({ stage3Only = false } = {}) {
  const db = new PGlite();
  await db.exec(bootstrap);
  const files = fs.readdirSync(path.resolve('supabase/migrations')).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (stage3Only && file.includes('stage4_3')) continue;
    try { await db.exec(fs.readFileSync(path.resolve('supabase/migrations', file), 'utf8')); }
    catch (error) { console.error('Migration failed:',file,error.message,'position',error.position); throw error; }
  }
  return db;
}
module.exports = { createDatabase };
if (require.main === module) createDatabase().then(async db => {
  console.log('Clean isolated migration PASS'); await db.close();
}).catch(() => { process.exitCode = 1; });
