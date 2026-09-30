const { createDatabase } = require('./profile-test-db.cjs');
const fs=require('node:fs');
async function run(){
 const db=await createDatabase();
 try {
  const checks={
   exposed_tables_without_rls:`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`,
   public_security_definers:`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef`,
   anonymous_rpc_execute:`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and has_function_privilege('anon',p.oid,'EXECUTE')`,
   unsafe_function_search_path:`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prosecdef and not coalesce(p.proconfig @> array['search_path=""'],false)`,
   private_table_client_grants:`select table_name,grantee,privilege_type from information_schema.role_table_grants where table_schema='private' and grantee in ('PUBLIC','anon','authenticated')`,
   private_fields_in_public:`select table_name,column_name from information_schema.columns where table_schema='public' and column_name in ('license_number','reviewed_by','reviewed_revision','verification_status','encrypted_password')`,
   unindexed_foreign_keys:`select c.conrelid::regclass::text as table_name,c.conname from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where c.contype='f' and n.nspname in ('public','private') and not exists(select 1 from pg_index i where i.indrelid=c.conrelid and i.indisvalid and i.indpred is null and (i.indkey::smallint[])[0:cardinality(c.conkey)-1] @> c.conkey)`
  };
  let failed=false;
  for(const [name,sql] of Object.entries(checks)){
   const rows=(await db.query(sql)).rows;
   console.log(name,rows.length?JSON.stringify(rows):'PASS');
   if(rows.length)failed=true;
  }
  for(const name of fs.readdirSync('supabase/migrations').filter(name=>name.includes('stage4') && name.endsWith('.sql'))){
   const migration=fs.readFileSync(`supabase/migrations/${name}`,'utf8').replace(/^\s*--[^\n]*(?:\n|$)/gm,'').trim();
   if(!migration.startsWith('begin;') || !migration.endsWith('commit;'))throw new Error(`Migration must be atomic: ${name}`);
  }
  if(failed)process.exitCode=1;
 }finally{await db.close();}
}
run().catch(e=>{console.error(e.message);process.exitCode=1;});
