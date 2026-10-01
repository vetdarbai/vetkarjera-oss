// Dedicated unlinked local stack only. No hosted DB URL, production env or account.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const mode = process.argv[2];
const baseline = ['20260905075153','20260908142249','20260915162557','20260915210103','20260930060436','20260930060437'];
const version = '20261001091441';
const code = 'notice_period', label = 'Po įspėjimo termino (20 kalendorinių dienų)';
const oldRows = [
  ['immediately','Iš karto',1], ['two_weeks','Per 2 savaites',2],
  ['one_month','Per 1 mėnesį',3], ['two_three_months','Per 2–3 mėnesius',4],
  ['specific_date','Konkreti data / vėliau',5],
].map(([code,label_lt,sort_order])=>({code,label_lt,sort_order,is_active:true}));
let db, checks = 0;
const eq = (a,b) => { assert.deepEqual(a,b); checks++; };
function cli(args) {
  const r = spawnSync(process.execPath,['node_modules/supabase/dist/supabase.js',...args], {encoding:'utf8',env:{...process.env,SUPABASE_TELEMETRY_DISABLED:'1'}});
  if(r.status !== 0) throw Error('Local CLI failed (no credential-bearing output printed)');
  return r.stdout;
}
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input,init) => {
  const u = new URL(typeof input==='string'||input instanceof URL ? input : input.url);
  assert.ok(['127.0.0.1','localhost'].includes(u.hostname) && u.port==='54321','Non-local request refused');
  return nativeFetch(input,{...init,redirect:'error'});
};
async function rows() { return (await db.query('select code,label_lt,sort_order,is_active from public.start_options order by sort_order')).rows; }
async function security() {
  return (await db.query(`select jsonb_build_object(
    'functions',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'identity',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),'owner',p.proowner,'acl',p.proacl::text) order by n.nspname,p.oid::regprocedure::text) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prokind='f'),
    'relations',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,'rls',c.relrowsecurity,'force',c.relforcerowsecurity,'owner',c.relowner,'acl',c.relacl::text) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private','storage') and c.relkind in ('r','p','v')),
    'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p where schemaname in ('public','private','storage')),
    'triggers',(select jsonb_agg(jsonb_build_object('table',c.oid::regclass::text,'definition',pg_get_triggerdef(t.oid)) order by c.oid::regclass::text,t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and not t.tgisinternal),
    'constraints',(select jsonb_agg(jsonb_build_object('table',c.oid::regclass::text,'name',con.conname,'definition',pg_get_constraintdef(con.oid)) order by c.oid::regclass::text,con.conname) from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private')),
    'default_acl',(select jsonb_agg(to_jsonb(d) order by oid) from pg_default_acl d),
    'memberships',(select jsonb_agg(to_jsonb(m) order by roleid,member,grantor) from pg_auth_members m)
  ) as value`)).rows[0].value;
}
async function fixture(codeSuffix, start) {
  const admin = new Client({host:'127.0.0.1',port:54322,user:'postgres',password:'postgres',database:'postgres'});
  await admin.connect();
  try {
    const id = '74000000-0000-4000-8000-'+String(codeSuffix).padStart(12,'0');
    await admin.query(`insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values($1,$2,'{"account_role":"specialist"}',now())`,[id,'start-option-'+codeSuffix+'@example.test']);
    await admin.query('insert into auth.sessions(id,user_id) values($1,$1)',[id]);
    await admin.query('update public.specialist_profiles set start_option_code=$2 where user_id=$1',[id,start]);
    return id;
  } finally { await admin.end(); }
}
async function profileSnapshot() { return (await db.query('select * from public.specialist_profiles order by user_id')).rows; }
async function main() {
  assert.ok(['clean','upgrade'].includes(mode));
  assert.ok(fs.readFileSync('supabase/config.toml','utf8').includes('project_id = "vetkarjera-stage4-3-isolated"'));
  assert.ok(!fs.existsSync('supabase/.temp/project-ref'),'Linked project refused');
  const text = cli(['status','--output','json']);
  const status = JSON.parse(text.slice(text.indexOf('{')));
  assert.ok(['localhost','127.0.0.1'].includes(new URL(status.API_URL).hostname) && new URL(status.API_URL).port==='54321');
  db = new Client({host:'127.0.0.1',port:54322,user:'postgres',password:'postgres',database:'postgres'}); await db.connect();
  const postgres = (await db.query('show server_version')).rows[0].server_version;
  assert.match(postgres,/^17\./);
  const history = async () => (await db.query('select version from supabase_migrations.schema_migrations order by version')).rows.map(x=>x.version);
  let ids = [];
  if(mode==='upgrade') {
    eq(await history(),baseline); eq(await rows(),oldRows);
    for(let i=0;i<oldRows.length;i++) ids.push(await fixture(101+i,oldRows[i].code));
    const before = await profileSnapshot(), permissions = await security();
    cli(['migration','up','--local']);
    eq(await profileSnapshot(),before); eq(await security(),permissions);
  } else {
    eq(await history(),[...baseline,version]);
    ids.push(await fixture(201,'immediately'));
  }
  eq(await history(),[...baseline,version]);
  eq(await rows(),[...oldRows,{code,label_lt:label,sort_order:6,is_active:true}]);
  eq((await db.query('select count(*)::int total,count(distinct code)::int codes,count(distinct sort_order)::int positions from public.start_options')).rows[0],{total:6,codes:6,positions:6});
  eq((await db.query('select count(*)::int n from public.specialist_profiles p left join public.start_options s on s.code=p.start_option_code where p.start_option_code is not null and s.code is null')).rows[0].n,0);
  await assert.rejects(()=>db.query('update public.specialist_profiles set start_option_code=$2 where user_id=$1',[ids[0],'nonexistent_start']),{code:'23503'}); checks++;
  await db.query('begin; set local role anon');
  eq((await db.query('select code,label_lt from public.start_options where code=$1',[code])).rows,[{code,label_lt:label}]);
  await db.query('rollback');
  const client = createClient(status.API_URL,status.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const catalog = await client.from('start_options').select('code,label_lt,sort_order,is_active').order('sort_order');
  assert.ifError(catalog.error); eq(catalog.data,await rows());
  // Real authenticated-role RPC and independent connection reload; no RPC changed.
  const uid = ids[0], sessionClaims = JSON.stringify({sub:uid,session_id:uid,role:'authenticated'});
  const reload = new Client({host:'127.0.0.1',port:54322,user:'postgres',password:'postgres',database:'postgres'}); await reload.connect();
  try {
    for(const choice of [...oldRows.map(r=>r.code),code,null]) {
      await db.query('begin'); await db.query("select set_config('request.jwt.claims',$1,true)",[sessionClaims]); await db.query('set local role authenticated');
      await db.query('select public.save_specialist_step2($1)',[JSON.stringify({start_option_code:choice})]); await db.query('commit');
      eq((await reload.query('select start_option_code from public.specialist_profiles where user_id=$1',[uid])).rows[0].start_option_code,choice);
    }
  } finally { await reload.end(); }
  eq((await db.query('select count(*)::int n from public.specialist_profiles p left join public.start_options s on s.code=p.start_option_code where p.start_option_code is not null and s.code is null')).rows[0].n,0);
  eq((await rows()).filter(r=>r.code!==code),oldRows);
  const report = {status:'PASS',mode,postgres,checks,baselineHistory:baseline,finalHistory:await history(),code,label,oldRowsUnchanged:true,rpcRlsGrantsComparison:mode==='upgrade'?'PASS':'Not applicable: clean installation',saveReload:'all existing values, new value and null PASS',createdAt:new Date().toISOString()};
  fs.mkdirSync('.staging-results',{recursive:true}); fs.writeFileSync('.staging-results/start-option-'+mode+'.json',JSON.stringify(report,null,2));
  console.log('PASS '+mode+' start-option local PostgreSQL '+postgres+': '+checks+' assertions');
}
main().catch(e=>{console.error(e.message,e.code||'');process.exitCode=1;}).finally(async()=>{await db?.query('rollback').catch(()=>{});await db?.end();});
