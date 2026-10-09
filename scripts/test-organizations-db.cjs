const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const mode=process.argv[2]||'pglite';let db,n=0,checks=0,instance;const report={mode,startedAt:new Date().toISOString(),status:'RUNNING'};
const {createDatabase}=require('./profile-test-db.cjs');
const h={bump(){checks++;},eq(a,b){assert.deepEqual(a,b);checks++;},q:(sql,args=[])=>db.query(sql,args),
 async root(){await db.query('reset role');},
 async as(a){await h.root();await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(a.claims)]);await db.query('set role authenticated');},
 async actor(kind){await h.root();const uid=crypto.randomUUID(),email='stage5-synthetic-'+(++n)+'@example.invalid';
 await db.query("insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values($1,$2,$3,now())",[uid,email,JSON.stringify({account_role:kind})]);
 await db.query('insert into auth.sessions(id,user_id) values($1,$1)',[uid]);return {id:uid,email,claims:{sub:uid,session_id:uid,role:'authenticated'}};},
 async rpc(a,name,args=[]){await h.as(a);return(await db.query('select public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') value',args.map(v=>v&&typeof v==='object'?JSON.stringify(v):v))).rows[0].value;},
 async deny(a,name,args=[],code){await assert.rejects(()=>h.rpc(a,name,args),e=>!code||e.code===code);checks++;}
};
(async()=>{
 const productionEquivalent=mode.startsWith('native-executor'),authSchemaOwner=mode==='native-executor-auth-admin'?'supabase_auth_admin':'supabase_admin';
 if(mode.startsWith('native')){instance=await require('./organization-native-db.cjs').nativeDatabase({productionEquivalent,authSchemaOwner});db=instance.db;report.postgres=instance.version;report.evidence=instance.root;
 if(mode==='native-clean'){await instance.migrate();report.cleanChain='PASS';}else{await instance.migrate({stage4Only:true});
  const baseline=[];for(let i=0;i<(productionEquivalent?17:16);i++)baseline.push(await h.actor(i<13?'specialist':'employer'));
  report.syntheticUpgradeBaseline={users:baseline.length,specialist:13,employer:baseline.length-13};
  await h.root();
  const policySql="select policyname,permissive,array_to_json(roles) roles,cmd,qual,with_check from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'specialist_photo_%' order by policyname";
  const sourcePolicies=(await db.query(policySql)).rows;
  const helperSql="select pg_get_functiondef(oid) definition,proacl::text acl from pg_proc where oid='private.can_read_specialist_photo(text)'::regprocedure";
  const sourceHelper=(await db.query(helperSql)).rows;
  await h.root();const before=(await db.query("select jsonb_build_object('users',(select jsonb_agg(to_jsonb(t) order by id) from auth.users t),'profiles',(select jsonb_agg(to_jsonb(t) order by id) from public.profiles t),'specialist',(select jsonb_agg(to_jsonb(t) order by user_id) from public.specialist_profiles t),'employer',(select jsonb_agg(to_jsonb(t) order by user_id) from public.employer_profiles t)) snapshot")).rows[0].snapshot;
  let authBefore;
  if(productionEquivalent){
   report.executorBefore=await instance.prepareExecutor();
   authBefore=await require('./organization-executor-fixture.cjs').authCatalog(db);
  }
  const blocker=await instance.connect();try{await blocker.query('begin;lock public.organizations in access exclusive mode');await assert.rejects(()=>instance.migrate(),e=>e.code==='55P03');checks++;}finally{await blocker.query('rollback');await blocker.end();}
  h.eq((await db.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n,7);
  h.eq((await db.query("select count(*)::int n from pg_roles where rolname='vetkarjera_organization_writer'")).rows[0].n,0);
  report.cutoverLockRollback='PASS';
  await instance.migrate();const after=(await db.query("select jsonb_build_object('users',(select jsonb_agg(to_jsonb(t) order by id) from auth.users t),'profiles',(select jsonb_agg(to_jsonb(t) order by id) from public.profiles t),'specialist',(select jsonb_agg(to_jsonb(t) order by user_id) from public.specialist_profiles t),'employer',(select jsonb_agg(to_jsonb(t) order by user_id) from public.employer_profiles t)) snapshot")).rows[0].snapshot;
  h.eq(after,before);h.eq((await db.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n,8);
  if(productionEquivalent){
   report.executorAfter=await require('./organization-executor-fixture.cjs').verify(instance.executor,authSchemaOwner);
   h.eq(await require('./organization-executor-fixture.cjs').authCatalog(db),authBefore);
   h.eq(instance.notices.filter(n=>n.severity==='WARNING'),[]);
   report.authManagedObjectsUnchanged='PASS';report.nonSuperuserUpgrade='PASS';
  }
  const restoredPolicies=(await db.query(policySql)).rows;
  h.eq(restoredPolicies.filter(p=>p.policyname!=='specialist_photo_anon_read_guard'),sourcePolicies.map(p=>p.policyname==='specialist_photo_read_guard'?{...p,roles:['authenticated']}:p));
  const anonGuard=restoredPolicies.find(p=>p.policyname==='specialist_photo_anon_read_guard');
  h.eq(anonGuard.roles,['anon']);h.eq(anonGuard.permissive,'RESTRICTIVE');h.eq(anonGuard.cmd,'SELECT');
  h.eq(anonGuard.qual,"(bucket_id <> 'specialist-profile-photos'::text)");
  h.eq((await db.query(helperSql)).rows,sourceHelper);
  report.stage4StoragePolicyPreservation='PASS';report.upgradePreservation='PASS';}
 }else{db=await createDatabase();report.postgres=(await db.query('show server_version')).rows[0].server_version;}
 const actors=await require('./organization-cases.cjs')(h);report.behavior='PASS';report.assertions=checks;
 if(productionEquivalent){const start=checks;await require('./organization-executor-boundary.cjs')(h);report.executorBoundary={status:'PASS',assertions:checks-start};}
 await require('./organization-storage-access.cjs')(h);report.storageCompatibility='PASS';
 if(instance){await require('./organization-concurrency.cjs')(instance,h,actors);report.twoConnectionConcurrency='PASS';report.narrowRoleSecurity='PASS';}
 await h.root();const catalogs=require('../lib/organizations/catalogs.json');
 h.eq((await db.query('select code from public.organization_types order by sort_order')).rows.map(r=>r.code),catalogs.types.map(r=>r[0]));
 h.eq((await db.query('select count(*)::int n from public.organization_attribute_options')).rows[0].n,catalogs.options.length);
 const sorted=(v)=>v.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 h.eq(sorted((await db.query('select type_code,group_code,label_lt,value_kind,allow_other,sort_order from public.organization_attribute_groups')).rows.map(r=>[r.type_code,r.group_code,r.label_lt,r.value_kind,r.allow_other,r.sort_order])),sorted(catalogs.groups.map(r=>[r.type,r.code,r.label,r.kind,r.allowOther,r.order])));
 h.eq(sorted((await db.query('select type_code,group_code,option_code,label_lt,sort_order from public.organization_attribute_options')).rows.map(r=>[r.type_code,r.group_code,r.option_code,r.label_lt,r.sort_order])),sorted(catalogs.options.map(r=>[r.type,r.group,r.code,r.label,r.order])));
 h.eq((await db.query('select code,label_lt from public.organization_types order by sort_order')).rows.map(r=>[r.code,r.label_lt]),catalogs.types);
 h.eq((await db.query('select code,label_lt,requires_organization_code from public.organization_legal_forms order by sort_order')).rows.map(r=>[r.code,r.label_lt,r.requires_organization_code]),catalogs.legalForms);
 h.eq((await db.query('select code,label_lt from public.organization_benefit_options order by sort_order')).rows.map(r=>[r.code,r.label_lt]),catalogs.benefits);
 if(instance){await h.root();report.advisors=await instance.advisors();h.eq(report.advisors.exitCode,0);
  const findings=JSON.parse(report.advisors.output);h.eq(findings.filter(f=>['ERROR','WARN'].includes(f.level)),[]);
  report.advisorSummary={error:0,warn:0,info:findings.filter(f=>f.level==='INFO').length};
  console.log('Local advisors: no ERROR/WARN');}
 report.status='PASS';report.assertions=checks;
 fs.mkdirSync('.staging-results',{recursive:true});fs.writeFileSync('.staging-results/stage5-'+mode+'.json',JSON.stringify(report,null,2));
 console.log('Stage5 '+mode+' PASS: '+checks+' assertions');
})().catch(e=>{report.status='FAIL';report.error={message:e.message,code:e.code,where:e.where};console.error(JSON.stringify(report.error));console.error(e.stack);process.exitCode=1;})
.finally(async()=>{if(instance)await instance.close();else await db?.close();});
