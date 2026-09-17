// Real local GoTrue + PostgREST + PostgreSQL integration. Never loads .env.
// Requires an already running dedicated local stack; does NOT reset databases.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {Client}=require('pg');
const {createClient}=require('@supabase/supabase-js');
const Module=require('node:module');
const ts=require('typescript');
const {spawnSync,spawn}=require('node:child_process');
const project='vetkarjera-stage4-3-isolated';
const out=path.resolve(process.env.STAGING_REPORT_DIR||'.staging-results');
const mode=process.argv[2]||'clean';
const run=Date.now().toString(36);
let db,authClient,key,api,mail,phase='preflight';
const report={mode,startedAt:new Date().toISOString(),scenarios:[],versions:{}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function check(ok,label){if(!ok)throw new Error(label);}
// SDK transport is real, but every outbound request must stay on this local stack.
const nativeFetch=globalThis.fetch;
globalThis.fetch=(input,options)=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
 check(['127.0.0.1','localhost'].includes(url.hostname)&&['54321','54324'].includes(url.port),'Refusing external QA request');
 return nativeFetch(input,{...options,redirect:'error'});
};
async function scenario(name,fn){phase=name;await fn();report.scenarios.push({name,status:'PASS'});console.log('PASS '+name);}
function local(url,port){const u=new URL(url);check(['127.0.0.1','localhost'].includes(u.hostname)&&u.port===String(port),'Refusing non-local endpoint');return url;}
function client(){return createClient(api,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});}
async function connect(){const c=new Client({host:'127.0.0.1',port:54322,user:'postgres',password:'postgres',database:'postgres',application_name:'vetkarjera-stage43-qa',connectionTimeoutMillis:10000});await c.connect();return c;}
async function rpc(c,name,args={}){const r=await c.rpc(name,args);check(!r.error,`RPC ${name}: ${r.error?.code||'failed'}`);return r.data;}
async function denied(c,name,args={}){const r=await c.rpc(name,args);check(!!r.error,`Expected denial: ${name}`);}
function specialist(role='veterinary_assistant'){return {first_name:'Staging',last_name:'Testas',professional_role_code:role,...(role==='other_veterinary_specialty'?{specialty_free_text:'Testinė specialybė'}:{})};}
const employer={organization_name_input:'Staging klinika',organization_type_code:'veterinary_clinic'};
const step2=()=>({home_location_code:'lt_vilniaus_m',experience_band_code:'no_experience',job_search_status_code:'actively_looking',start_option_code:'immediately',profile_visibility:'application_only',animal_groups:['small_animals'],activity_areas:['clinical'],work_locations:['lt_vilniaus_m'],workloads:['full_time'],languages:[{language_code:'lt',proficiency_code:'native'}]});
async function fetchJson(url){const res=await fetch(url,{signal:AbortSignal.timeout(10000),redirect:'error'});check(res.ok,'Local mail API failed');return res.json();}
async function confirm(c,email){
 for(let n=0;n<30;n++){
  const list=await fetchJson(mail+'/api/v1/messages');
  const found=(list.messages||[]).find(m=>(m.To||[]).some(to=>to.Address===email));
  if(found){
   const msg=await fetchJson(mail+'/api/v1/message/'+found.ID);
   const content=(msg.HTML||'')+' '+(msg.Text||'');
   const token=content.match(/[?&]token=([^&"\s<>]+)/)?.[1];
   check(!!token,'Local confirmation mail has no verification token');
   const result=await c.auth.verifyOtp({token_hash:decodeURIComponent(token),type:'signup'});
   check(!result.error&&!!result.data.session,'Local mail verification failed');return;
  }await sleep(250);
 }throw new Error('Local mail delivery timeout');
}
let accountIndex=0;
async function account(kind='specialist',{legacy=false,unconfirmed=false,role='veterinary_assistant'}={}){
 const email=`stage43-${run}-${++accountIndex}@example.test`,password='Stage43-'+crypto.randomBytes(18).toString('hex')+'!';
 const c=client();
 if(legacy){const r=await c.auth.signUp({email,password,options:{data:{account_role:kind,first_name:'Legacy',last_name:'Testas'}}});check(!r.error&&!r.data.session,'Legacy GoTrue signup failed');}
 else{authClient=c;const r=await registration.registerProfileAccount({kind,profile:kind==='specialist'?specialist(role):employer,email,password,confirmPassword:password,agreedToTerms:true});check(r.ok,'Real V2 registration action failed');}
 const before=await c.auth.signInWithPassword({email,password});check(!!before.error,'Unconfirmed login must fail');
 if(unconfirmed)return {c,email,password};
 await confirm(c,email);
 const login=await c.auth.signInWithPassword({email,password});check(!login.error&&login.data.session,'Confirmed login failed');
 return {c,email,password,id:login.data.user.id,token:login.data.session.access_token,claims:JSON.parse(Buffer.from(login.data.session.access_token.split('.')[1],'base64url'))};
}
const load=Module._load;
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,file);
Module._load=function(name,parent,main){
 if(name==='server-only')return {};
 if(name==='react')return {cache:fn=>fn};
 if(name==='@/lib/supabase/server')return {createClient:async()=>authClient};
 if(name.startsWith('@/'))return load.call(this,path.resolve(name.slice(2)),parent,main);
 return load.call(this,name,parent,main);
};
const registration=require('../app/auth/profile-registration.ts');
const session=require('../lib/auth/session.ts');
async function as(c,a){await c.query('begin');await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(a.claims)]);await c.query('set local role authenticated');}
async function waitBlocked(pid){for(let n=0;n<100;n++){const r=await db.query("select wait_event_type from pg_stat_activity where pid=$1",[pid]);if(r.rows[0]?.wait_event_type==='Lock')return;await sleep(30);}throw new Error('Expected real PostgreSQL lock wait');}
async function concurrency(owner,admin){
 const a=await connect(),b=await connect();
 try{
  const pidA=(await a.query('select pg_backend_pid() id')).rows[0].id,pidB=(await b.query('select pg_backend_pid() id')).rows[0].id;check(pidA!==pidB,'Connections must have different backend PIDs');
  await as(a,owner);await as(b,owner);
  await a.query('select public.create_second_profile($1,$2)',['employer',JSON.stringify(employer)]);
  const pending=b.query('select public.create_second_profile($1,$2)',['employer',JSON.stringify({...employer,organization_name_input:'Must not overwrite'})]);
  await waitBlocked(pidB);await a.query('commit');await pending;await b.query('commit');
  const r=await db.query('select organization_name_input from public.employer_profiles where user_id=$1',[owner.id]);check(r.rows.length===1&&r.rows[0].organization_name_input===employer.organization_name_input,'Concurrent second profile invariant');
  await rpc(owner.c,'save_specialist_step1',{payload:specialist('veterinarian')});await rpc(owner.c,'save_license',{number_input:'STAGING-LICENSE-ONE'});
  await as(a,owner);await as(b,admin);await a.query('select public.save_license($1)',['STAGING-LICENSE-TWO']);
  const review=b.query('select public.review_license($1,$2,$3)',[owner.id,1,'verified']).then(()=>null,e=>e.code);
  await waitBlocked(pidB);await a.query('commit');check(await review==='40001','Concurrent stale review must fail');await b.query('rollback');
  const license=await rpc(owner.c,'read_license',{target_user_id:owner.id});check(license.revision===2&&license.verification_status==='pending','Concurrent license revision invariant');
 }catch(error){
  // PostgreSQL permission diagnostics contain object names, never fixture values.
  if(error.code==='42501')throw new Error('Concurrency permission: '+error.message+'; '+(error.where||''));
  throw error;
 }finally{await a.query('rollback').catch(()=>{});await b.query('rollback').catch(()=>{});await a.end();await b.end();}
}
async function main(){
 check(['clean','upgrade'].includes(mode),'Invalid test mode');
 check(fs.readFileSync('supabase/config.toml','utf8').includes(`project_id = "${project}"`),'Wrong local project');
 check(!fs.existsSync('supabase/.temp/project-ref'),'Refusing a linked project');
 fs.mkdirSync(out,{recursive:true});
 const cli=spawnSync(process.execPath,['node_modules/supabase/dist/supabase.js','status','--output','json'],{encoding:'utf8',env:{...process.env,SUPABASE_TELEMETRY_DISABLED:'1'},windowsHide:true});
 check(cli.status===0,'Local stack status failed');const status=JSON.parse(cli.stdout.slice(cli.stdout.indexOf('{')));
 api=local(status.API_URL,54321);mail=local(status.INBUCKET_URL||status.MAILPIT_URL,54324);key=status.ANON_KEY||status.PUBLISHABLE_KEY;check(!!key,'Missing local public key');
 db=await connect();const v=(await db.query('show server_version')).rows[0].server_version;report.versions.postgresql=v;check(v.startsWith('17.'),'PostgreSQL 17 required');
 const health=await fetch(api+'/auth/v1/health',{headers:{apikey:key}});check(health.ok,'GoTrue health');report.versions.gotrue=(await health.json()).version;
 await scenario('PostgreSQL 17 / GoTrue health / local target guard',async()=>{});
 if(mode==='upgrade'){
  const legacy=[];
  await scenario('Stage 3 real GoTrue legacy fixtures',async()=>{for(let n=0;n<6;n++)legacy.push(await account(n<3?'specialist':'employer',{legacy:true}));});
  const legacyAdmin=await account('specialist',{legacy:true});
  await db.query("update public.profiles set role='admin' where id=$1",[legacyAdmin.id]);
  const org=crypto.randomUUID();
  await db.query("insert into public.organizations(id,name) values($1,'Isolated legacy clinic')",[org]);
  await db.query('insert into public.employer_profiles(user_id,organization_id) values($1,$2)',[legacy[3].id,org]);
  await db.query('insert into public.jobs(organization_id,created_by) values($1,$2)',[org,legacy[3].id]);
  const snapshot=(await db.query('select id,email,encrypted_password from auth.users order by id')).rows;
  const blocker=await connect(),migrator=await connect();
  await scenario('Migration lock timeout rolls back before cutover',async()=>{
   try{await blocker.query('begin; lock table auth.users in row exclusive mode');const t=Date.now();let code;try{await migrator.query(fs.readFileSync('supabase/migrations/20260915162557_stage4_3_profiles.sql','utf8'));}catch(e){code=e.code;}
    check(code==='55P03'&&Date.now()-t>=4500,'Expected migration lock timeout');await migrator.query('rollback');check((await db.query("select to_regclass('public.professional_roles') as t")).rows[0].t===null,'Failed cutover leaked schema');
   }finally{await blocker.query('rollback');await blocker.end();await migrator.end();}
  });
  await scenario('Stage 3 to Stage 4.3 migration chain / credentials / sessions',async()=>{
   const gate=await connect();let child,signup;
   try{
    await gate.query('begin; lock table auth.users in row exclusive mode');
    const fd=fs.openSync(path.join(out,'upgrade-migration.log'),'w',0o600);
    child=spawn(process.execPath,['node_modules/supabase/dist/supabase.js','migration','up','--local'],{env:process.env,stdio:['ignore',fd,fd],windowsHide:true});
    fs.closeSync(fd);
    const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
    let queued=false;
    for(let n=0;n<500;n++){
     const r=await db.query("select 1 from pg_locks where relation='auth.users'::regclass and mode='ShareRowExclusiveLock' and not granted");
     if(r.rowCount){queued=true;break;}await sleep(20);
    }
    check(queued,'Migration did not queue for cutover lock');
    // A real GoTrue signup queues behind the migration, then sees the new trigger.
    signup=account('specialist',{legacy:true});signup.catch(()=>{});
    let authQueued=false;
    for(let n=0;n<100;n++){
     const r=await db.query("select 1 from pg_locks where relation='auth.users'::regclass and mode='RowExclusiveLock' and not granted");
     if(r.rowCount){authQueued=true;break;}await sleep(20);
    }
    await gate.query('commit');
    check(await done===0,'Local upgrade CLI failed');
    const during=await signup;
    check(authQueued,'GoTrue signup did not wait for cutover');
    check((await rpc(during.c,'account_capabilities')).hasSpecialistProfile,'Cutover signup lost profile');
   }finally{await gate.query('rollback').catch(()=>{});await gate.end();if(child&&child.exitCode===null)child.kill();}
   const preserved=(await db.query('select id,email,encrypted_password from auth.users where id=any($1::uuid[]) order by id',[snapshot.map(x=>x.id)])).rows;
   check(JSON.stringify(preserved)===JSON.stringify(snapshot),'Auth credentials changed during upgrade');
   for(let n=0;n<6;n++){const caps=await rpc(legacy[n].c,'account_capabilities');check(caps.id===legacy[n].id&&(n<3?caps.hasSpecialistProfile:caps.hasEmployerProfile),'Legacy profile/session backfill failed');}
   check((await rpc(legacyAdmin.c,'account_capabilities')).isAdmin,'Trusted legacy admin not preserved');
   check((await db.query('select count(*)::int n from public.organization_memberships where user_id=$1 and organization_id=$2',[legacy[3].id,org])).rows[0].n===1,'Legacy membership not preserved');
   check((await db.query('select count(*)::int n from public.jobs where created_by=$1 and organization_id=$2',[legacy[3].id,org])).rows[0].n===1,'Legacy job not preserved');
   check((await db.query('select professional_role_code from public.specialist_profiles where user_id=$1',[legacy[0].id])).rows[0].professional_role_code===null,'Legacy profession fabricated');
  });
 }
 await scenario('Migration chain history',async()=>{const r=await db.query('select version from supabase_migrations.schema_migrations order by version');for(const version of ['20260905075153','20260908142249','20260915162557','20260915210103'])check(r.rows.some(x=>x.version===version),'Missing migration history '+version);});
 await scenario('Migration temporary privileges removed / restricted writer',async()=>{
  const r=(await db.query("select rolsuper,rolbypassrls,rolcanlogin from pg_roles where rolname='vetkarjera_profile_writer'")).rows[0];
  check(r&&!r.rolsuper&&!r.rolbypassrls&&!r.rolcanlogin,'Writer is privileged or login-enabled');
  const grants=(await db.query("select has_schema_privilege('vetkarjera_profile_writer','private','CREATE') as ddl, pg_has_role(current_user,'vetkarjera_profile_writer','USAGE') as inherited,pg_has_role(current_user,'vetkarjera_profile_writer','SET') as can_set")).rows[0];
  check(!grants.ddl&&!grants.inherited&&!grants.can_set,'Temporary migration privileges persisted');
  for(const role of ['anon','authenticated','authenticator'])check(!(await db.query("select pg_has_role($1,'vetkarjera_profile_writer','MEMBER') as member",[role])).rows[0].member,'API role inherited writer');
 });
 let s,e,admin;
 await scenario('V2 specialist signup / local email / confirmed login',async()=>{s=await account();const caps=await rpc(s.c,'account_capabilities');check(caps.hasSpecialistProfile&&!caps.hasEmployerProfile&&!caps.isAdmin,'Specialist capabilities');});
 await scenario('V2 employer signup / local email / confirmed login',async()=>{e=await account('employer');const caps=await rpc(e.c,'account_capabilities');check(caps.hasEmployerProfile&&!caps.hasSpecialistProfile&&!caps.isAdmin,'Employer capabilities');});
 await scenario('GoTrue refresh / real session helper',async()=>{const r=await s.c.auth.refreshSession();check(!r.error&&r.data.session,'Refresh failed');authClient=s.c;check((await session.getActiveUser())?.id===s.id,'Server session helper rejected real user');});
 await scenario('Second profile both directions / idempotence',async()=>{
  await rpc(s.c,'create_second_profile',{kind:'employer',payload:employer});await rpc(e.c,'create_second_profile',{kind:'specialist',payload:specialist()});
  await rpc(s.c,'create_second_profile',{kind:'employer',payload:{...employer,organization_name_input:'Must not overwrite'}});
  for(const x of [s,e]){const caps=await rpc(x.c,'account_capabilities');check(caps.id===x.id&&caps.hasSpecialistProfile&&caps.hasEmployerProfile,'Dual capabilities');}
  const row=(await db.query('select organization_name_input,organization_id from public.employer_profiles where user_id=$1',[s.id])).rows[0];check(row.organization_name_input===employer.organization_name_input&&row.organization_id===null,'Second profile overwrote state / created organization');
 });
 await scenario('PostgREST anon / owner / foreign reads, count and embedding',async()=>{
  await denied(client(),'account_capabilities');
  for(const table of ['profiles','specialist_profiles','employer_profiles']){
   const anon=await client().from(table).select('*');check(!!anon.error||anon.data.length===0,'Anon data disclosure');
   const other=await e.c.from(table).select('*',{count:'exact'}).eq(table==='profiles'?'id':'user_id',s.id);check(!other.error&&other.count===0&&other.data.length===0,'Foreign row/count disclosure');
  }
  const own=await s.c.from('profiles').select('id,specialist_profiles(user_id),employer_profiles(user_id)');check(!own.error&&own.data.length===1&&own.data[0].id===s.id,'Owner embedded read failed');
  const foreign=await e.c.from('profiles').select('id,specialist_profiles(user_id)').eq('id',s.id);check(!foreign.error&&foreign.data.length===0,'Embedded foreign disclosure');
  const hidden=await fetch(api+'/rest/v1/specialist_licenses',{headers:{apikey:key,Authorization:'Bearer '+s.token,'Accept-Profile':'private'}});check(!hidden.ok,'Private schema exposed');
 });
 await scenario('PostgREST writes / metadata escalation / default-deny CV',async()=>{
  for(const result of [await e.c.from('profiles').update({role:'admin'}).eq('id',e.id),await e.c.from('specialist_profiles').insert({user_id:s.id}),await e.c.from('specialist_profiles').delete().eq('user_id',s.id)])check(!!result.error||!result.data?.length,'Unauthorized write result');
  check((await db.query('select count(*)::int n from public.specialist_profiles where user_id=$1',[s.id])).rows[0].n===1,'Foreign delete succeeded');
  check((await db.query('select role from public.profiles where id=$1',[e.id])).rows[0].role==='employer','Direct role escalation succeeded');
  await e.c.auth.updateUser({data:{isAdmin:true,role:'admin',account_role:'admin'}});check(!(await rpc(e.c,'account_capabilities')).isAdmin,'Metadata escalation');
  await rpc(s.c,'save_specialist_step2',{payload:{...step2(),profile_visibility:'registered_employers'}});
  const r=await e.c.from('specialist_profiles').select('*').eq('user_id',s.id);check(!r.error&&r.data.length===0,'Visibility leaked foreign CV');
 });
 await scenario('STEP 2 required selections / completeness / atomic failure',async()=>{
  await rpc(s.c,'save_specialist_step2',{payload:step2()});check((await rpc(s.c,'profile_completeness')).total===70,'Minimal required profile must be 70');
  for(const field of ['animal_groups','activity_areas']){
   for(const value of [[],undefined]){await denied(s.c,'save_specialist_step2',{payload:{...step2(),[field]:value}});check((await rpc(s.c,'profile_completeness')).step2===50,'Failed save changed valid state');}
   await db.query(`delete from public.specialist_${field} where user_id=$1`,[s.id]);check((await rpc(s.c,'profile_completeness')).step2===0,'Incomplete legacy selection received 50');await rpc(s.c,'save_specialist_step2',{payload:step2()});
  }
 });
 await scenario('STEP 3 choices / 0–5 completeness / role history',async()=>{
  const choices=require('../lib/profiles/step3-options.json');
  for(const [role,options] of Object.entries(choices.development)){await rpc(s.c,'save_specialist_step1',{payload:specialist(role)});await rpc(s.c,'save_specialist_step3',{payload:{development_areas:options.map(([code])=>code)}});}
  for(const [role,options] of Object.entries(choices.autonomy)){await rpc(s.c,'save_specialist_step1',{payload:specialist(role)});for(const [code] of options)await rpc(s.c,'save_specialist_step3',{payload:{autonomy_code:code}});}
  for(const role of ['veterinary_student','veterinary_pharmacy','animal_health_commerce']){await rpc(s.c,'save_specialist_step1',{payload:specialist(role)});await denied(s.c,'save_specialist_step3',{payload:{autonomy_code:'independent'}});}
  // STEP 3 is a full replacement within the current profession. Seed history
  // after autonomy-only saves, which intentionally clear development selections.
  await rpc(s.c,'save_specialist_step1',{payload:specialist()});
  await rpc(s.c,'save_specialist_step3',{payload:{development_areas:choices.development.veterinary_assistant.map(([code])=>code)}});
  await rpc(s.c,'save_specialist_step1',{payload:specialist('other_veterinary_specialty')});
  for(let n=0;n<=5;n++){await rpc(s.c,'save_specialist_step3',{payload:{custom_competencies:Array.from({length:n},(_,i)=>({name:'Staging '+i,level:'independent'}))}});check((await rpc(s.c,'profile_completeness')).step3===Math.min(n,3)*10,'Custom completeness mismatch');}
  await denied(s.c,'save_specialist_step3',{payload:{custom_competencies:Array.from({length:6},(_,i)=>({name:'Staging '+i,level:'independent'}))}});
  await rpc(s.c,'save_specialist_step1',{payload:specialist()});const saved=await s.c.from('specialist_development_areas').select('*').eq('professional_role_code','veterinary_assistant');check(!saved.error&&saved.data.length===8,'Role history lost');
 });
 await scenario('License privacy / review / revision / stale and self-review',async()=>{
  admin=await account();await db.query("insert into private.account_admins(user_id,source) values($1,'isolated test fixture')",[admin.id]);
  check((await rpc(admin.c,'account_capabilities')).isAdmin,'Trusted admin unavailable');
  await rpc(s.c,'save_specialist_step1',{payload:specialist('veterinarian')});await rpc(s.c,'save_education',{payload:{institution_code:'lsmu'}});await rpc(s.c,'save_license',{number_input:'STAGING-ONE'});
  await denied(e.c,'read_license',{target_user_id:s.id});await denied(client(),'read_license',{target_user_id:s.id});
  await rpc(admin.c,'review_license',{target_user_id:s.id,expected_revision:1,decision:'verified'});await rpc(s.c,'save_license',{number_input:'STAGING-ONE'});check((await rpc(s.c,'read_license',{target_user_id:s.id})).verification_status==='verified','Identical license invalidates review');
  await rpc(s.c,'save_license',{number_input:'STAGING-TWO'});const r=await rpc(s.c,'read_license',{target_user_id:s.id});check(r.revision===2&&r.verification_status==='pending','License revision reset');
  await denied(admin.c,'review_license',{target_user_id:s.id,expected_revision:1,decision:'verified'});await denied(admin.c,'review_license',{target_user_id:admin.id,expected_revision:1,decision:'verified'});
  await rpc(s.c,'save_specialist_step1',{payload:specialist()});check((await rpc(s.c,'read_license',{target_user_id:s.id})).revision===2,'License history lost');
 });
 await scenario('Two actual DB connections / second profile and license lock races',async()=>{const owner=await account();await concurrency(owner,admin);});
 await scenario('All specialist child tables: real PostgREST owner/foreign/anon boundaries',async()=>{
  const tables=(await db.query("select table_name from information_schema.columns where table_schema='public' and column_name='user_id' and table_name like 'specialist_%' order by table_name")).rows;
  for(const {table_name:table} of tables){
   const owner=await s.c.from(table).select('*').eq('user_id',s.id);check(!owner.error,'Owner child read '+table);
   const other=await e.c.from(table).select('*',{count:'exact'}).eq('user_id',s.id);check(!other.error&&other.count===0&&other.data.length===0,'Foreign child disclosure '+table);
   const anon=await client().from(table).select('*').eq('user_id',s.id);check(!!anon.error||anon.data.length===0,'Anon child disclosure '+table);
  }
  const trusted=await admin.c.from('specialist_profiles').select('user_id').eq('user_id',s.id);check(!trusted.error&&trusted.data.length===1,'Trusted admin read failed');
 });
 await scenario('Expired session / revoked session / GoTrue logout',async()=>{
  const expired=await account();await db.query("update auth.sessions set not_after=now()-interval '1 second' where id=$1",[expired.claims.session_id]);await denied(expired.c,'account_capabilities');
  const expiredRows=await expired.c.from('profiles').select('id');check(!!expiredRows.error||expiredRows.data.length===0,'Expired session leaked rows');
  const revoked=await account();const old=client();await old.auth.setSession((await revoked.c.auth.getSession()).data.session);const signedOut=await revoked.c.auth.signOut({scope:'global'});check(!signedOut.error,'GoTrue logout failed');await denied(old,'account_capabilities');authClient=old;check(await session.getActiveUser()===null,'Revoked server session accepted');
  const revokedRows=await old.from('profiles').select('id');check(!!revokedRows.error||revokedRows.data.length===0,'Revoked session leaked rows');
 });
}
main().catch(error=>{report.scenarios.push({name:phase,status:'FAIL',reason:error.code||error.message});console.error('FAIL '+phase+': '+(error.code||error.message));process.exitCode=1;}).finally(async()=>{if(db)await db.end();report.finishedAt=new Date().toISOString();fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,`staging-${mode}.json`),JSON.stringify(report,null,2));});
