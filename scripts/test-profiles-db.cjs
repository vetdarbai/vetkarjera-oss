const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createDatabase } = require('./profile-test-db.cjs');
let db, checks = 0;
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const q = (sql, args=[]) => db.query(sql,args);
async function as(n, claims={}) {
  await db.exec('reset role;');
  await q(`select set_config('request.jwt.claims',$1,false)`,[JSON.stringify({sub:id(n),session_id:id(n),role:'authenticated',...claims})]);
  await db.exec('set role authenticated;');
}
async function root() { await db.exec('reset role;'); }
async function rpc(name,args=[]) { const result=await q(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as value`,args.map(a=>typeof a==='object' && a!==null ? JSON.stringify(a):a)); return result.rows[0]?.value; }
async function rejected(fn,code) {
  let error; try { await fn(); } catch(e) { error=e; }
  assert.ok(error,'expected rejected operation'); if(code) assert.equal(error.code,code,error.message); checks++;
}
function equal(a,b) { assert.deepEqual(a,b); checks++; }
const step1 = role => ({first_name:'Testas',last_name:'Pavardė',professional_role_code:role,...(role==='other_veterinary_specialty'?{specialty_free_text:'Specialybė'}:{})});
const employer = {organization_name_input:'Deklaruota klinika',organization_type_code:'veterinary_clinic'};
const step2 = () => ({home_location_code:'lt_vilniaus_m',experience_band_code:'no_experience',job_search_status_code:'actively_looking',start_option_code:'immediately',profile_visibility:'application_only',animal_groups:['small_animals'],activity_areas:['clinical'],work_locations:['lt_vilniaus_m'],workloads:['full_time'],languages:[{language_code:'lt',proficiency_code:'native'}]});
async function fixture(n,role='specialist',confirmed=true,extra={}) {
  await q(`insert into auth.users(id,email,encrypted_password,raw_user_meta_data,email_confirmed_at) values($1,$2,'unchanged-fixture-hash',$3,$4)`,[id(n),`fixture-${n}@example.invalid`,JSON.stringify({account_role:role,...extra}),confirmed?'2026-01-01':null]);
  await q('insert into auth.sessions(id,user_id) values($1,$1)',[id(n)]);
}
async function run() {
  let clean=await createDatabase({stage43Only:true}); await clean.close(); checks++;
  db=await createDatabase({stage3Only:true});
  for(let n=1;n<=6;n++) await fixture(n,n<=3?'specialist':'employer',true,n===1?{first_name:'Legacy',last_name:'Vardas'}:{});
  await fixture(7); await q(`update public.profiles set role='admin' where id=$1`,[id(7)]);
  await fixture(8); await fixture(9,'specialist',false);
  await q(`insert into public.organizations(id,name) values($1,'A'),($2,'B')`,[id(101),id(102)]);
  await q('insert into public.employer_profiles(user_id,organization_id) values($1,$2),($3,$4)',[id(4),id(101),id(8),id(102)]);
  await q(`insert into public.specialist_profiles(user_id) values($1)`,[id(8)]);
  await q('insert into public.jobs(organization_id,created_by) values($1,$2)',[id(101),id(4)]);
  const before=(await q('select * from auth.users order by id')).rows;
  const migration=fs.readFileSync('supabase/migrations/20260915162557_stage4_3_profiles.sql','utf8');
  await db.exec(migration);
  const unchangedOptions=(await q("select 'autonomy' as kind,* from public.autonomy_options where professional_role_code='veterinarian' union all select 'development' as kind,* from public.development_areas where professional_role_code in ('veterinarian','veterinary_student') order by kind,professional_role_code,code")).rows;
  for(const file of fs.readdirSync('supabase/migrations').filter(f=>f.includes('stage4_3') && f>'20260915162557_stage4_3_profiles.sql').sort()) {
    await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
  }
  equal((await q("select 'autonomy' as kind,* from public.autonomy_options where professional_role_code='veterinarian' union all select 'development' as kind,* from public.development_areas where professional_role_code in ('veterinarian','veterinary_student') order by kind,professional_role_code,code")).rows,unchangedOptions);
  equal((await q('select * from auth.users order by id')).rows,before);
  equal((await q('select count(*)::int n from auth.sessions')).rows[0].n,9);
  equal((await q('select count(*)::int n from private.account_admins')).rows[0].n,1);
  equal((await q('select count(*)::int n from public.specialist_profiles where user_id=any($1::uuid[])',[ [id(1),id(2),id(3)] ])).rows[0].n,3);
  equal((await q('select count(*)::int n from public.employer_profiles where user_id=any($1::uuid[])',[ [id(4),id(5),id(6)] ])).rows[0].n,3);
  equal((await q('select professional_role_code,first_name from public.specialist_profiles where user_id=$1',[id(1)])).rows[0],{professional_role_code:null,first_name:'Legacy'});
  equal((await q('select count(*)::int n from public.organization_memberships')).rows[0].n,2);
  // Repeating the backfill must not overwrite any profile or duplicate accounts.
  const backfill=migration.split('-- No names, profession, organization or new authorization is fabricated.')[1].split('comment on column public.profiles.role')[0];
  const profilesBefore=(await q('select * from public.specialist_profiles order by user_id')).rows;
  await db.exec(backfill); equal((await q('select * from public.specialist_profiles order by user_id')).rows,profilesBefore);
  await as(1,{user_metadata:{role:'admin',isAdmin:true}});
  equal(await rpc('account_capabilities'),{id:id(1),hasSpecialistProfile:true,hasEmployerProfile:false,isAdmin:false});
  equal((await q('select count(*)::int n from public.profiles')).rows[0].n,1);
  equal((await q('select count(*)::int n from public.specialist_profiles')).rows[0].n,1);
  equal((await q('select count(*)::int n from public.employer_profiles')).rows[0].n,0);
  // SET ROLE uses session_user; this harness connects as postgres, so inspect
  // authenticated's membership rather than accidentally testing superuser rights.
  equal((await q("select pg_has_role('authenticated','vetkarjera_profile_writer','MEMBER') as member")).rows[0].member,false);
  await rejected(()=>rpc('save_specialist_step1',[{...step1('veterinarian'),first_name:123}]),'22023');
  for(const attack of [
    ()=>q(`update public.profiles set role='admin'`),
    ()=>q(`insert into private.account_admins(user_id,source) values($1,'forged')`,[id(1)]),
    ()=>q(`insert into public.organization_memberships values($1,$2,now(),null)`,[id(1),id(101)]),
    ()=>q(`update public.employer_profiles set organization_id=$1`,[id(101)]),
    ()=>q(`insert into public.specialist_profiles(user_id) values($1)`,[id(7)]),
    ()=>rpc('save_specialist_step1',[{...step1('veterinarian'),user_id:id(2)}]),
    ()=>rpc('save_specialist_step1',[{...step1('veterinarian'),is_admin:true}]),
    ()=>rpc('save_employer_step1',[{...employer,organization_id:id(101)}])
  ]) await rejected(attack);
  await rpc('create_second_profile',['employer',employer]);
  await rpc('create_second_profile',['employer',{...employer,organization_name_input:'must not overwrite'}]);
  equal((await q('select organization_name_input,organization_id from public.employer_profiles')).rows[0],{organization_name_input:employer.organization_name_input,organization_id:null});
  equal((await q('select count(*)::int n from public.organizations')).rows[0].n,0);
  equal((await rpc('account_capabilities')).hasEmployerProfile,true);
  await as(5); await rpc('create_second_profile',['specialist',step1('veterinary_assistant')]);
  equal((await rpc('account_capabilities')).hasSpecialistProfile,true);
  await root(); equal((await q('select count(*)::int n from auth.users')).rows[0].n,9);
  // Trusted role is independent of legacy role and metadata updates.
  await q(`update auth.users set raw_user_meta_data='{"account_role":"admin","is_admin":true}' where id=$1`,[id(2)]);
  await q(`update public.profiles set role='admin' where id=$1`,[id(2)]);
  await as(2); equal((await rpc('account_capabilities')).isAdmin,false);
  await as(7); equal((await rpc('account_capabilities')).isAdmin,true);
  equal((await rpc('account_capabilities')).hasSpecialistProfile,false);
  await as(9); equal((await q('select count(*)::int n from public.profiles')).rows[0].n,0);
  await rejected(()=>rpc('save_specialist_step1',[step1('veterinarian')]),'42501');
  await root(); await q('update auth.sessions set not_after=now()-interval \'1 second\' where id=$1',[id(2)]);
  await as(2); await rejected(()=>rpc('account_capabilities'),'42501');
  await root(); await q('delete from auth.sessions where id=$1',[id(3)]);
  await as(3); await rejected(()=>rpc('account_capabilities'),'42501');
  await as(1); await rpc('save_specialist_step1',[step1('veterinarian')]);
  await rejected(()=>rpc('save_education',[{institution_code:'lsmu',program_or_qualification:null,current_course:7}]));
  await rpc('save_education',[{institution_code:'lsmu'}]);
  await rpc('save_license',['LT-TESTAS Ω']);
  equal((await rpc('read_license',[id(1)])).verification_status,'pending');
  await rejected(()=>rpc('review_license',[id(1),1,'verified']),'42501');
  await rejected(()=>q(`update private.specialist_licenses set verification_status='verified'`),'42501');
  await as(4);
  await rejected(()=>rpc('read_license',[id(1)]),'42501');
  await rejected(()=>q('select count(*) from private.specialist_licenses'),'42501');
  await as(7); equal((await rpc('read_license',[id(1)])).license_number,'LT-TESTAS Ω');
  await rpc('review_license',[id(1),1,'verified']);
  await as(1); await rpc('save_license',['LT-TESTAS Ω']); equal((await rpc('read_license',[id(1)])).verification_status,'verified');
  await rpc('save_license',['LT-NAUJAS']); equal((await rpc('read_license',[id(1)])).revision,2); equal((await rpc('read_license',[id(1)])).verification_status,'pending');
  await as(7); await rejected(()=>rpc('review_license',[id(1),1,'verified']),'40001');
  await rpc('review_license',[id(1),2,'verified']);
  await as(1); await rpc('save_specialist_step2',[step2()]);
  equal((await rpc('profile_completeness')).total,70);
  // Required multi-selects are independent of optional interests. Missing and empty
  // payloads fail atomically; pre-existing incomplete data cannot earn STEP 2's 50%.
  for(const field of ['animal_groups','activity_areas']) {
    for(const empty of [[],undefined]) {
      await rejected(()=>rpc('save_specialist_step2',[{...step2(),[field]:empty}]),'22023');
      equal((await rpc('profile_completeness')).step2,50);
    }
    await root(); await q(`delete from public.specialist_${field} where user_id=$1`,[id(1)]);
    await as(1); equal((await rpc('profile_completeness')).step2,0);
    await rpc('save_specialist_step2',[step2()]); equal((await rpc('profile_completeness')).step2,50);
  }
  equal((await q('select can_work_nights,profile_visibility from public.specialist_profiles')).rows[0],{can_work_nights:null,profile_visibility:'application_only'});
  const valid2=step2();
  for(const patch of [{workloads:[]},{workloads:['full_time','full_time']},{work_locations:['abroad']},{work_locations:['invalid']},{about_me:'a'.repeat(501)},{can_work_nights:'false'},{languages:[{language_code:'other',proficiency_code:'good'}]},{home_location_code:'abroad'},{start_option_code:'specific_date'},{profile_visibility:'public'}, {isAdmin:true}]) await rejected(()=>rpc('save_specialist_step2',[{...valid2,...patch}]));
  equal((await rpc('profile_completeness')).total,70); // Failed RPCs roll back every child-table replacement.
  await rpc('save_specialist_step2',[{...valid2,can_work_nights:false,can_work_weekends:true,profile_visibility:'registered_employers'}]);
  await as(4); equal((await q('select count(*)::int n from public.specialist_profiles')).rows[0].n,0);
  await as(1);
  await rpc('save_specialist_step3',[{competencies:[{competency_code:'veterinarian_01',level:'independent'}]}]);
  equal((await rpc('profile_completeness')).filledCompetencies,1);
  const allCompetencies=(await q("select code from public.competencies where professional_role_code='veterinarian' order by code")).rows;
  await rpc('save_specialist_step3',[{competencies:allCompetencies.map(c=>({competency_code:c.code,level:'with_assistance'}))}]);
  equal((await rpc('profile_completeness')).total,100);
  await rpc('save_specialist_step3',[{competencies:[{competency_code:'veterinarian_01',level:null}]}]);
  equal((await rpc('profile_completeness')).total,70);
  await rpc('save_specialist_step3',[{competencies:[{competency_code:'veterinarian_01',level:'independent'}]}]);
  await rejected(()=>rpc('save_specialist_step3',[{competencies:[{competency_code:'veterinary_student_01',level:'independent'}]}]));
  await rpc('save_specialist_step1',[step1('veterinary_student')]);
  equal((await rpc('profile_completeness')).step2,0);
  equal((await rpc('profile_completeness')).filledCompetencies,0);
  await rejected(()=>rpc('save_license',['student-license']),'22023');
  await rejected(()=>rpc('save_education',[{institution_code:'lsmu'}]));
  await rpc('save_education',[{institution_code:'lsmu',current_course:3}]);
  await rejected(()=>rpc('save_specialist_step3',[{competencies:[{competency_code:'veterinary_student_01',level:'independent'}]}]));
  await rpc('save_specialist_step3',[{competencies:[{competency_code:'veterinary_student_01',level:'theory_only'}]}]);
  await rpc('save_specialist_step1',[step1('veterinarian')]);
  equal((await rpc('profile_completeness')).filledCompetencies,1);
  equal((await q('select count(*)::int n from public.specialist_education')).rows[0].n,2);
  equal((await rpc('read_license',[id(1)])).verification_status,'verified');
  await rpc('save_specialist_step1',[step1('other_veterinary_specialty')]);
  await rpc('save_specialist_step3',[{custom_competencies:[{name:'Mano kompetencija',level:'independent'}]}]);
  equal((await rpc('profile_completeness')).step3,10);
  for(let count=0;count<=5;count++) {
    await rpc('save_specialist_step3',[{custom_competencies:Array.from({length:count},(_,n)=>({name:'Kompetencija '+n,level:'with_assistance'}))}]);
    equal((await rpc('profile_completeness')).step3,Math.min(count,3)*10);
    equal((await rpc('profile_completeness')).filledCompetencies,count);
    equal((await rpc('profile_completeness')).total,70+Math.min(count,3)*10);
  }
  await rejected(()=>rpc('save_specialist_step3',[{custom_competencies:Array.from({length:6},(_,n)=>({name:'Sritis '+n,level:'independent'}))}]));
  // Optional education and optional STEP 2 fields do not block 70%.
  await as(5); await rpc('save_specialist_step2',[step2()]); equal((await rpc('profile_completeness')).total,70);
  await as(4); equal((await q('select count(*)::int n from public.jobs')).rows[0].n,1);
  await root(); await q('update public.organization_memberships set revoked_at=now() where user_id=$1',[id(4)]);
  await as(4); equal((await q('select count(*)::int n from public.jobs')).rows[0].n,0);
  await root(); equal((await q('select count(*)::int n from public.jobs')).rows[0].n,1);
  // New signup V2 and old unversioned clients are both supported; no extra organizations.
  await fixture(10,'employer',true,{profile_contract_version:2,...employer});
  await fixture(11,'specialist',true,{profile_contract_version:2,...step1('veterinary_pharmacy')});
  await fixture(12,'specialist');
  await rejected(()=>fixture(13,'admin'),'22023');
  await rejected(()=>fixture(14,'specialist',true,{profile_contract_version:2}),'22023');
  equal((await q('select count(*)::int n from public.organizations')).rows[0].n,2);
  await as(11); await rejected(()=>rpc('save_specialist_step2',[step2()]),'22023');
  await rpc('save_education',[{institution_name:'Mokymo įstaiga',program_or_qualification:'Farmacija'}]);
  await rpc('save_specialist_step2',[step2()]); equal((await rpc('profile_completeness')).total,70);
  await as(7); await rpc('create_second_profile',['specialist',step1('veterinarian')]); await rpc('save_license',['ADMIN-OWN']);
  await rejected(()=>rpc('review_license',[id(7),1,'verified']),'42501');
  await root(); await q('delete from auth.sessions where id=$1',[id(7)]);
  await as(7); await rejected(()=>rpc('read_license',[id(1)]),'42501');
  // Approved role-scoped choices persist through role changes. No invented
  // autonomy values are accepted for student, pharmacy or commerce.
  const options=require('../lib/profiles/step3-options.json');
  await as(5);
  for(const [role,choices] of Object.entries(options.autonomy)) {
    await rpc('save_specialist_step1',[step1(role)]);
    for(const [code] of choices) {
      await rpc('save_specialist_step3',[{autonomy_code:code}]);
      equal((await q('select autonomy_code from public.specialist_autonomy where professional_role_code=$1',[role])).rows[0].autonomy_code,code);
    }
  }
  for(const [role,choices] of Object.entries(options.development)) {
    await rpc('save_specialist_step1',[step1(role)]);
    await rpc('save_specialist_step3',[{development_areas:choices.map(([code])=>code)}]);
    equal((await q('select count(*)::int n from public.specialist_development_areas where professional_role_code=$1',[role])).rows[0].n,choices.length);
  }
  for(const role of ['veterinary_student','veterinary_pharmacy','animal_health_commerce']) {
    await rpc('save_specialist_step1',[step1(role)]);
    equal((await q('select count(*)::int n from public.autonomy_options where professional_role_code=$1',[role])).rows[0].n,0);
    await rejected(()=>rpc('save_specialist_step3',[{autonomy_code:'independent'}]),'23503');
  }
  await rpc('save_specialist_step1',[step1('veterinary_assistant')]);
  equal((await q("select count(*)::int n from public.specialist_development_areas where professional_role_code='veterinary_assistant'")).rows[0].n,8);
  await rpc('save_specialist_step1',[step1('other_veterinary_specialty')]);
  equal((await q("select autonomy_code from public.specialist_autonomy where professional_role_code='other_veterinary_specialty'")).rows[0].autonomy_code,'mentor');
  await rpc('save_specialist_step3',[{autonomy_code:'mentor',custom_development:['Individuali tobulėjimo sritis']}]);
  equal((await q('select name from public.specialist_custom_development')).rows[0].name,'Individuali tobulėjimo sritis');
  await root();
  for(const [table,source] of [['autonomy_options',options.autonomy],['development_areas',options.development]]) {
    for(const [role,choices] of Object.entries(source)) equal((await q(`select code,label_lt from public.${table} where professional_role_code=$1 order by code`,[role])).rows,choices.map(([code,label_lt])=>({code,label_lt})).sort((a,b)=>a.code.localeCompare(b.code)));
  }
  // This suite deliberately retains Stage 4.3 RPC semantics. Apply the later
  // data-only catalog addition before comparing the current catalog fixture.
  await db.exec(fs.readFileSync('supabase/migrations/20261001091441_stage4_7_start_option_notice_period.sql','utf8'));
  const requiredCatalogs=require('../lib/profiles/catalogs.json');
  for(const [table,entries] of Object.entries(requiredCatalogs.catalogs)) equal((await q(`select code,label_lt from public.${table} order by sort_order`)).rows,entries.map(([code,label_lt])=>({code,label_lt})));
  equal((await q('select count(*)::int n from public.competencies')).rows[0].n,119);
  await root(); await db.exec('set role anon');
  await rejected(()=>rpc('account_capabilities'),'42501');
  await rejected(()=>rpc('save_specialist_step1',[step1('veterinarian')]),'42501');
  equal((await q('select count(*)::int n from public.locations')).rows[0].n,62);
  await root();
  equal((await q(`select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind='r' and not c.relrowsecurity`)).rows[0].n,0);
  equal((await q(`select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef`)).rows[0].n,0);
  equal((await q(`select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and has_function_privilege('anon',p.oid,'execute')`)).rows[0].n,0);
  equal((await q(`select rolbypassrls or rolcanlogin or rolsuper as unsafe from pg_roles where rolname='vetkarjera_profile_writer'`)).rows[0].unsafe,false);
  equal((await q(`select has_table_privilege('vetkarjera_profile_writer','auth.users','select') as unsafe`)).rows[0].unsafe,false);
  console.log(`PASS ${checks} PostgreSQL assertions: clean/legacy migration, account preservation, RLS, sessions, profiles, role history, education, preferences, competencies, license revisions, memberships, grants.`);
}
run().catch(e=>{ console.error('FAIL after',checks,'assertions:',e.message,e.code || ''); process.exitCode=1; }).finally(async()=>{if(db) await db.close();});
