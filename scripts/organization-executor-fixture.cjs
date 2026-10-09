// Synthetic-only native PG17 model of the reviewed production Auth boundary.
// Source evidence: Stage5.4 read-only executor/catalog preflight 2026-10-09.
// No production files, credentials, URLs, users or rows are loaded by this test.
const assert=require('node:assert/strict');
async function prepare(bootstrap,authSchemaOwner='supabase_admin'){
 if(!['supabase_admin','supabase_auth_admin'].includes(authSchemaOwner))throw Error('Unreviewed Auth owner fixture');
 await bootstrap.query(`
 alter database postgres owner to postgres;
 create role supabase_auth_admin nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
 create role supabase_admin nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
 alter schema auth owner to supabase_auth_admin;
 revoke all on schema auth from public,postgres,anon,authenticated,service_role;
 grant usage on schema auth to postgres,anon,authenticated,service_role;
 alter table auth.users owner to supabase_auth_admin;
 alter table auth.sessions owner to supabase_auth_admin;
 alter function auth.uid() owner to supabase_auth_admin;
 alter function auth.jwt() owner to supabase_auth_admin;
 revoke all on function auth.uid(),auth.jwt() from postgres;
 grant execute on function auth.uid(),auth.jwt() to public;
 revoke all on auth.users,auth.sessions from postgres;
 grant select on auth.users,auth.sessions to postgres with grant option;
 grant insert,update,delete,truncate,references,trigger,maintain on auth.users,auth.sessions to postgres;
 alter role postgres nosuperuser createdb createrole noinherit nobypassrls;
 `);
 await bootstrap.query('alter schema auth owner to '+authSchemaOwner);
 // ALTER OWNER rewrites the old implicit owner's ACL entry. Production also
 // explicitly grants its Auth object owner USAGE/CREATE on the namespace.
 await bootstrap.query('grant usage,create on schema auth to supabase_auth_admin');
}
async function verify(executor,authSchemaOwner='supabase_admin'){
 const state=(await executor.query(`select current_user executor,session_user session_user,
 (select rolsuper from pg_roles where rolname=current_user) superuser,
 (select r.rolname from pg_namespace n join pg_roles r on r.oid=n.nspowner where n.nspname='auth') auth_owner,
 has_schema_privilege('postgres','auth','USAGE') auth_usage,
 has_schema_privilege('postgres','auth','USAGE WITH GRANT OPTION') auth_usage_grantable,
 has_function_privilege('postgres','auth.uid()','EXECUTE') uid_execute,
 has_function_privilege('postgres','auth.uid()','EXECUTE WITH GRANT OPTION') uid_execute_grantable,
 pg_has_role('postgres','supabase_auth_admin','SET') auth_owner_set,
 pg_has_role('postgres','supabase_auth_admin','USAGE') auth_owner_inherited,
 exists(select 1 from pg_namespace n cross join lateral aclexplode(n.nspacl) a
 where n.nspname='auth' and a.grantee=0 and a.privilege_type='USAGE') public_auth_usage`)).rows[0];
 assert.deepEqual(state,{executor:'postgres',session_user:'postgres',superuser:false,auth_owner:authSchemaOwner,
 auth_usage:true,auth_usage_grantable:false,uid_execute:true,uid_execute_grantable:false,
 auth_owner_set:false,auth_owner_inherited:false,public_auth_usage:false});
 const helpers=(await executor.query(`select p.proname name,r.rolname owner,p.prosecdef definer,
 has_function_privilege('postgres',p.oid,'EXECUTE WITH GRANT OPTION') grantable
 from pg_proc p join pg_roles r on r.oid=p.proowner where p.pronamespace='private'::regnamespace
 and p.proname in('has_active_session','require_active','is_admin') order by p.proname`)).rows;
 assert.deepEqual(helpers,[{name:'has_active_session',owner:'postgres',definer:true,grantable:true},
 {name:'is_admin',owner:'postgres',definer:true,grantable:true},{name:'require_active',owner:'postgres',definer:false,grantable:true}]);
 return {state,helpers};
}
async function authCatalog(db){return(await db.query(`select jsonb_build_object(
 'namespace',(select jsonb_build_object('owner',nspowner::regrole::text,'acl',nspacl::text) from pg_namespace where nspname='auth'),
 'tables',(select jsonb_agg(jsonb_build_object('name',relname,'owner',relowner::regrole::text,'acl',relacl::text) order by relname)
 from pg_class where relnamespace='auth'::regnamespace and relkind='r'),
 'functions',(select jsonb_agg(jsonb_build_object('name',proname,'owner',proowner::regrole::text,'acl',proacl::text,'definition',pg_get_functiondef(oid)) order by proname)
 from pg_proc where pronamespace='auth'::regnamespace),
 'triggers',(select jsonb_agg(pg_get_triggerdef(t.oid) order by tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid
 where c.relnamespace='auth'::regnamespace and not t.tgisinternal)) value`)).rows[0].value;}
module.exports={prepare,verify,authCatalog};
