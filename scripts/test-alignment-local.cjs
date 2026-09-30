// Dedicated local stack only; no .env or hosted targets. Real GoTrue/PostgREST/Storage.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process'),{Client}=require('pg'),{createClient}=require('@supabase/supabase-js');
const mode=process.argv[2]||'upgrade',project='vetkarjera-stage4-3-isolated';
let checks=0,db,current,api,key,service,adminClient,index=0;const run=Date.now().toString(36);
const report={mode,startedAt:new Date().toISOString(),checks:0,groups:[]};
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
function cli(args){const r=spawnSync(process.execPath,['node_modules/supabase/dist/supabase.js',...args],{encoding:'utf8',env:{...process.env,SUPABASE_TELEMETRY_DISABLED:'1'}});if(r.status!==0){fs.mkdirSync('.staging-results',{recursive:true});fs.writeFileSync('.staging-results/alignment-cli.private.log',r.stdout+r.stderr,{mode:0o600});throw Error('Local CLI failed; private diagnostic retained');}return r.stdout;}
const native=globalThis.fetch;
globalThis.fetch=(input,init)=>{const u=new URL(typeof input==='string'||input instanceof URL?input:input.url);if(!['127.0.0.1','localhost'].includes(u.hostname)||!['54321','54324','3000'].includes(u.port))throw Error('Non-local network refused');return native(input,{...init,redirect:'error'});};
function client(){return createClient(api,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});}
const h={eq,
 async q(sql,args=[]){return db.query(sql,args);},
 async account(kind){const c=client(),email='alignment-'+run+'-'+(++index)+'@example.test',password=crypto.randomBytes(22).toString('base64url')+'!';const result=await c.auth.signUp({email,password,options:{data:{account_role:kind}}});assert.ifError(result.error);assert.ok(result.data.user);eq(result.data.session,null);
  assert.ifError((await adminClient.auth.admin.updateUserById(result.data.user.id,{email_confirm:true})).error);
  const login=await c.auth.signInWithPassword({email,password});assert.ifError(login.error);assert.ok(login.data.session);
  return {id:result.data.user.id,c,email,password,token:login.data.session.access_token,claims:JSON.parse(Buffer.from(login.data.session.access_token.split('.')[1],'base64url'))};},
 async rpc(a,name,args={}){const r=await a.c.rpc(name,args);if(r.error)throw Error('RPC '+name+' '+r.error.code);return r.data;},
 async denied(a,name,args){const r=await a.c.rpc(name,args);assert.ok(r.error,'Expected '+name+' deny');checks++;},
 async foreignRead(a,table,uid){const r=await a.c.from(table).select('user_id').eq('user_id',uid);assert.ifError(r.error);eq(r.data,[]);}
};
async function group(name,fn){await fn();report.groups.push({name,status:'PASS'});console.log('PASS '+name);}
async function rawAs(c,a){await c.query('begin');await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(a.claims)]);await c.query('set local role authenticated');}
async function concurrency(owner){
 const a=new Client({host:'127.0.0.1',port:54322,user:'postgres',password:'postgres',database:'postgres'}),b=new Client({host:'127.0.0.1',port:54322,user:'postgres',password:'postgres',database:'postgres'});
 await a.connect();await b.connect();
 try{await rawAs(a,owner);await rawAs(b,owner);
  await a.query("select public.save_specialist_step2($1)",[JSON.stringify({about_me:'Concurrent preserved'})]);
  const pid=(await b.query('select pg_backend_pid() id')).rows[0].id;
  let done=false;const pending=b.query('select public.save_specialist_step2($1)',[JSON.stringify({can_be_on_call:true})]).finally(()=>{done=true;});
  let blocked=false;for(let i=0;i<60;i++){if((await db.query('select wait_event_type from pg_stat_activity where pid=$1',[pid])).rows[0]?.wait_event_type==='Lock'){blocked=true;break;}await new Promise(r=>setTimeout(r,20));}
  eq(blocked,true);eq(done,false);await a.query('commit');await pending;await b.query('commit');
  eq((await db.query('select about_me,can_be_on_call from public.specialist_profiles where user_id=$1',[owner.id])).rows[0],{about_me:'Concurrent preserved',can_be_on_call:true});
 }finally{await a.query('rollback').catch(()=>{});await b.query('rollback').catch(()=>{});await a.end();await b.end();}
}
async function main(){
 assert.ok(['clean','upgrade'].includes(mode));
 assert.ok(fs.readFileSync('supabase/config.toml','utf8').includes('project_id = "'+project+'"'));
 assert.ok(!fs.existsSync('supabase/.temp/project-ref'),'Linked target refused');
 const statusText=cli(['status','--output','json']);const s=JSON.parse(statusText.slice(statusText.indexOf('{')));
 api=s.API_URL;const u=new URL(api);assert.ok(['localhost','127.0.0.1'].includes(u.hostname)&&u.port==='54321');
 key=s.ANON_KEY;service=s.SERVICE_ROLE_KEY;
 process.env.NEXT_PUBLIC_SUPABASE_URL=api;process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=key;process.env.SUPABASE_STORAGE_SERVICE_ROLE_KEY=service;
 adminClient=createClient(api,service,{auth:{persistSession:false,autoRefreshToken:false}});
 db=new Client({host:'127.0.0.1',port:54322,user:'postgres',password:'postgres',database:'postgres'});await db.connect();
 report.postgres=(await db.query('show server_version')).rows[0].server_version;assert.ok(report.postgres.startsWith('17.'));
 report.auth=(await (await fetch(api+'/auth/v1/health',{headers:{apikey:key}})).json()).version;
 if(mode==='upgrade'){
  eq((await db.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n,4);
  const fixture=await h.account('specialist');await h.rpc(fixture,'save_specialist_step1',{payload:{first_name:'Upgrade',last_name:'Preserved',professional_role_code:'veterinarian'}});
  const before=(await db.query("select jsonb_build_object('users',(select jsonb_agg(to_jsonb(t) order by id) from auth.users t),'profiles',(select jsonb_agg(to_jsonb(t) order by id) from public.profiles t),'specialist',(select jsonb_agg(to_jsonb(t) order by user_id) from public.specialist_profiles t)) state")).rows[0].state;
  // Genuine two-connection DDL cutover lock: timeout must roll back all changes.
  const blocker=new Client({host:'127.0.0.1',port:54322,user:'postgres',password:'postgres',database:'postgres'});await blocker.connect();
  try{await blocker.query('begin; lock public.specialist_profiles in access share mode');
   let code;try{await db.query(fs.readFileSync('supabase/migrations/20260930060436_stage4_draft_readiness_alignment.sql','utf8'));}catch(e){code=e.code;}
   eq(code,'55P03');await db.query('rollback');
   eq((await db.query("select to_regprocedure('private.profile_required_state()') is null absent")).rows[0].absent,true);
  }finally{await blocker.query('rollback');await blocker.end();}
  cli(['migration','up','--local']);
  const after=(await db.query("select jsonb_build_object('users',(select jsonb_agg(to_jsonb(t) order by id) from auth.users t),'profiles',(select jsonb_agg(to_jsonb(t) order by id) from public.profiles t),'specialist',(select jsonb_agg(to_jsonb(t) order by user_id) from public.specialist_profiles t)) state")).rows[0].state;
  eq(after,before);report.groups.push({name:'Stage4.3 upgrade preserves existing data; cutover timeout rolls back',status:'PASS'});
 }
 eq((await db.query('select version from supabase_migrations.schema_migrations order by version')).rows.map(x=>x.version),['20260905075153','20260908142249','20260915162557','20260915210103','20260930060436','20260930060437']);
 // PostgREST schema reload is asynchronous.
 await db.query("notify pgrst,'reload schema'");await new Promise(r=>setTimeout(r,1000));
 const settings={public:false,fileSizeLimit:250*1024,allowedMimeTypes:['image/webp']};
 const bucket=await adminClient.storage.getBucket('specialist-profile-photos');
 assert.ifError((bucket.data?await adminClient.storage.updateBucket('specialist-profile-photos',settings):await adminClient.storage.createBucket('specialist-profile-photos',settings)).error);
 let actors;
 await group('Real Auth/PostgREST draft/readiness/license/RLS behavioural matrix',async()=>{actors=await require('./alignment-cases.cjs')(h);});
 await group('Two-connection PATCH preservation',()=>concurrency(actors.owner));
 await group('Strict V2 signup regression',async()=>{
  const c=client();const bad=await c.auth.signUp({email:'bad-'+run+'@example.test',password:'Only-Local-Synthetic-123!',options:{data:{account_role:'specialist',profile_contract_version:2,first_name:'Incomplete'}}});assert.ok(bad.error);checks++;
  const good=await c.auth.signUp({email:'good-'+run+'@example.test',password:'Only-Local-Synthetic-123!',options:{data:{account_role:'specialist',profile_contract_version:2,first_name:'Strict',last_name:'Test',professional_role_code:'veterinary_assistant'}}});assert.ifError(good.error);checks++;
  const badEmployer=await c.auth.signUp({email:'bad-employer-'+run+'@example.test',password:'Only-Local-Synthetic-123!',options:{data:{account_role:'employer',profile_contract_version:2,organization_name_input:'Incomplete'}}});assert.ok(badEmployer.error);checks++;
  const goodEmployer=await c.auth.signUp({email:'good-employer-'+run+'@example.test',password:'Only-Local-Synthetic-123!',options:{data:{account_role:'employer',profile_contract_version:2,organization_name_input:'Strict Clinic',organization_type_code:'veterinary_clinic'}}});assert.ifError(goodEmployer.error);checks++;
 });
 // Load actual route handlers; only request cookie-client injection differs from Next runtime.
 // Auth, active-session RPC, PostgREST and all Storage transports remain real.
 const Module=require('node:module'),ts=require('typescript'),load=Module._load;
 require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
 Module._load=function(name,parent,main){if(name==='server-only')return {};if(name==='react')return {cache:fn=>fn};if(name==='@/lib/supabase/server')return {createClient:async()=>current};if(name==='./env'&&parent.filename.endsWith('/lib/supabase/storage-admin.ts'))return {getSupabaseEnvironment:()=>({url:api,anonKey:key})};if(name.startsWith('@/'))return load.call(this,path.resolve(name.slice(2)),parent,main);return load.call(this,name,parent,main);};
 const route=require('../app/api/profilis/nuotrauka/route.ts'),imageRoute=require('../app/api/profilis/nuotrauka/vaizdas/route.ts'),sharp=require('sharp');
 const photoOwner=await h.account('specialist'),other=await h.account('employer');const photoPath=photoOwner.id+'/profile.webp';
 const input=await sharp({create:{width:900,height:700,channels:3,background:'#173f3a'}}).withMetadata({orientation:6}).jpeg().toBuffer();
 function request(method='GET',body,query='',headers={}){return new Request('http://127.0.0.1:3000/api/profilis/nuotrauka'+query,{method,headers:{origin:'http://127.0.0.1:3000',...(body?{'content-type':'image/jpeg'}:{}),...headers},body:body?new Uint8Array(body):undefined});}
 async function call(a,method='GET',body,query='',headers={}){current=a?.c||client();return route[method](request(method,body,query,headers));}
 await group('Photo owner upload/replace/delete, transformed bytes, metadata and single object',async()=>{
  let r=await call(photoOwner);eq(r.status,200);eq((await r.json()).hasPhoto,false);
  r=await call(photoOwner,'PUT',input);eq(r.status,200);let m=await r.json();eq(m.hasPhoto,true);eq(m.reference,photoPath);assert.ok(m.version);checks++;
  const stored=await adminClient.storage.from('specialist-profile-photos').download(photoPath);assert.ifError(stored.error);
  const bytes=Buffer.from(await stored.data.arrayBuffer()),info=await sharp(bytes).metadata();eq(info.format,'webp');eq(Math.max(info.width,info.height)<=512,true);eq(info.exif,undefined);eq(info.icc,undefined);eq(bytes.equals(input),false);eq(bytes.length<=250*1024,true);
  const changed=await sharp({create:{width:700,height:500,channels:3,background:'#e66b52'}}).png().toBuffer();
  r=await call(photoOwner,'PUT',changed,'',{'content-type':'image/png'});eq(r.status,200);const updated=await r.json();eq(updated.version!==m.version,true);
  eq((await db.query('select count(*)::int n from storage.objects where bucket_id=$1 and name like $2',['specialist-profile-photos',photoOwner.id+'/%'])).rows[0].n,1);
  current=photoOwner.c;eq((await imageRoute.GET(request())).headers.get('content-type'),'image/webp');
  r=await call(photoOwner,'DELETE');eq(r.status,200);eq((await r.json()).hasPhoto,false);eq((await call(photoOwner,'DELETE')).status,200);
 });
 await group('Photo invalid/SVG/animation/size/CSRF/IDOR/anon and foreign deny',async()=>{
  await db.query("create policy alignment_qa_broad on storage.objects for all to anon,authenticated using(bucket_id='specialist-profile-photos') with check(bucket_id='specialist-profile-photos')");
  try{
  eq((await call(photoOwner,'PUT',Buffer.from('<svg/>'))).status,415);
  eq((await call(photoOwner,'PUT',Buffer.from([255,216,0,0]))).status,400);
  const animated=await sharp(Buffer.concat([Buffer.alloc(300,30),Buffer.alloc(300,220)]),{raw:{width:10,height:20,channels:3,pageHeight:10}}).webp({loop:0,delay:[100,100]}).toBuffer();
  eq((await sharp(animated).metadata()).pages,2);
  eq((await call(photoOwner,'PUT',animated,'',{'content-type':'image/webp'})).status,415);
  eq((await call(photoOwner,'PUT',Buffer.alloc(3*1024*1024+1))).status,413);
  const huge=await sharp({create:{width:4100,height:4100,channels:3,background:'#ffffff'}}).png().toBuffer();
  eq((await call(photoOwner,'PUT',huge,'',{'content-type':'image/png'})).status,400);
  eq((await call(photoOwner,'PUT',input,'',{'content-length':String(3*1024*1024+1)})).status,413);
  eq((await call(photoOwner,'PUT',input,'',{'content-type':'image/svg+xml'})).status,415);
  eq((await call(photoOwner,'GET',null,'?userId='+photoOwner.id+'&userId='+other.id)).status,400);
  eq((await call(photoOwner,'PUT',input,'',{origin:'https://foreign.invalid'})).status,403);
  eq((await call(null,'PUT',input)).status,401);eq((await call(other,'PUT',input)).status,403);
  eq((await call(other,'GET',null,'?userId='+photoOwner.id)).status,403);
  eq((await call(other,'PUT',input,'?userId='+photoOwner.id)).status,403);
  eq((await call(photoOwner,'GET',null,'?userId=../../forged')).status,403);
  eq((await call(photoOwner,'PUT',input)).status,200);
  eq((await call(actors.admin,'GET',null,'?userId='+photoOwner.id)).status,200);
  current=other.c;assert.ok((await other.c.storage.from('specialist-profile-photos').download(photoPath)).error);checks++;
  assert.ok((await client().storage.from('specialist-profile-photos').download(photoPath)).error);checks++;
  for(const c of [photoOwner.c,other.c,actors.admin.c,client()]){
   assert.ok((await c.storage.from('specialist-profile-photos').upload(photoPath,input,{contentType:'image/webp',upsert:true})).error);checks++;
   assert.ok((await c.storage.from('specialist-profile-photos').createSignedUploadUrl(photoPath)).error);checks++;
   assert.ok((await c.storage.from('specialist-profile-photos').copy(photoPath,photoOwner.id+'/forged.webp')).error);checks++;
   assert.ok((await c.storage.from('specialist-profile-photos').move(photoPath,photoOwner.id+'/forged.webp')).error);checks++;
   await c.storage.from('specialist-profile-photos').remove([photoPath]);
   eq((await adminClient.storage.from('specialist-profile-photos').download(photoPath)).error,null);
  }
  for(const c of [other.c,client()]){const listed=await c.storage.from('specialist-profile-photos').list(photoOwner.id);if(!listed.error)eq(listed.data,[]);else checks++;}
  const privateResponse=await call(photoOwner);eq(privateResponse.headers.get('cache-control'),'private, no-store, max-age=0');
  eq(privateResponse.headers.get('x-content-type-options'),'nosniff');eq(privateResponse.headers.get('referrer-policy'),'no-referrer');
  }finally{await db.query('drop policy alignment_qa_broad on storage.objects');}
 });
 await group('Local photo bytes recovery roundtrip and owner/hash consistency',async()=>{
  const saved=await adminClient.storage.from('specialist-profile-photos').download(photoPath);assert.ifError(saved.error);
  const bytes=Buffer.from(await saved.data.arrayBuffer()),hash=crypto.createHash('sha256').update(bytes).digest('hex');
  const manifest={owner:photoOwner.id,path:photoPath,sha256:hash,size:bytes.length,mime:'image/webp'};
  eq((await db.query('select exists(select 1 from auth.users where id=$1) and exists(select 1 from public.specialist_profiles where user_id=$1) matched',[manifest.owner])).rows[0].matched,true);
  assert.ifError((await adminClient.storage.from('specialist-profile-photos').remove([photoPath])).error);
  assert.ifError((await adminClient.storage.from('specialist-profile-photos').upload(manifest.path,bytes,{contentType:manifest.mime,upsert:true})).error);
  const restored=await adminClient.storage.from('specialist-profile-photos').download(manifest.path);assert.ifError(restored.error);
  const restoredBytes=Buffer.from(await restored.data.arrayBuffer());eq(restoredBytes.length,manifest.size);eq(crypto.createHash('sha256').update(restoredBytes).digest('hex'),manifest.sha256);
 });
 await group('Provider failure does not become missing photo; missing privileged key denies mutation',async()=>{
  const broken={...photoOwner,c:{...photoOwner.c,storage:{from:()=>({download:async()=>({data:null,error:{statusCode:'503'}})})}}};
  const response=await call(broken);eq(response.status,503);eq(await response.json(),{ok:false,code:'unavailable'});
  const before=await call(photoOwner);const meta=await before.json();delete process.env.SUPABASE_STORAGE_SERVICE_ROLE_KEY;
  try{eq((await call(photoOwner,'PUT',input)).status,503);eq((await call(photoOwner,'DELETE')).status,503);}finally{process.env.SUPABASE_STORAGE_SERVICE_ROLE_KEY=service;}
  eq(await (await call(photoOwner)).json(),meta);
 });
 await group('Photo replace/delete race and no retained originals',async()=>{
  current=photoOwner.c;const responses=await Promise.all([route.PUT(request('PUT',input)),route.DELETE(request('DELETE'))]);
  for(const r of responses)eq(r.status,200);
  const r=await call(photoOwner);eq(r.status,200);const meta=await r.json();
  const rows=(await db.query('select name from storage.objects where bucket_id=$1 and name like $2',['specialist-profile-photos',photoOwner.id+'/%'])).rows;
  eq(rows.length,meta.hasPhoto?1:0);if(rows.length)eq(rows[0].name,photoPath);
 });
 await group('Expired and revoked sessions deny photo and RPC despite old access token',async()=>{
  await db.query("update auth.sessions set not_after=now()-interval '1 minute' where id=$1",[photoOwner.claims.session_id]);
  eq((await call(photoOwner,'PUT',input)).status,401);eq((await call(photoOwner,'DELETE')).status,401);eq((await call(photoOwner,'GET')).status,401);
  assert.ok((await photoOwner.c.storage.from('specialist-profile-photos').download(photoPath)).error);checks++;
  await h.denied(photoOwner,'save_specialist_step2',{payload:{about_me:'Denied'}});
  await db.query('update auth.sessions set not_after=null where id=$1',[photoOwner.claims.session_id]);
  const stale=createClient(api,key,{global:{headers:{Authorization:'Bearer '+photoOwner.token}},auth:{persistSession:false,autoRefreshToken:false}});
  await photoOwner.c.auth.signOut({scope:'global'});
  current=stale;eq((await route.GET(request())).status,401);eq((await route.PUT(request('PUT',input))).status,401);eq((await route.DELETE(request('DELETE'))).status,401);
  await h.denied({c:stale},'save_specialist_step2',{payload:{about_me:'Denied'}});
 });
 eq((await db.query("select pg_has_role('postgres','vetkarjera_profile_writer','SET') can_set,has_schema_privilege('vetkarjera_profile_writer','private','CREATE') can_create")).rows[0],{can_set:false,can_create:false});
 report.checks=checks;report.completedAt=new Date().toISOString();report.status='PASS';
 fs.mkdirSync('docs/qa/stage4_alignment',{recursive:true});fs.writeFileSync('docs/qa/stage4_alignment/'+mode+'.json',JSON.stringify(report,null,2)+'\n');console.log('PASS '+checks+' real integration assertions ('+mode+')');
}
main().catch(e=>{report.status='FAIL';report.checks=checks;report.failure=e.message;fs.mkdirSync('.staging-results',{recursive:true});fs.writeFileSync('.staging-results/alignment-'+mode+'-failure.json',JSON.stringify(report,null,2));console.error(e.stack);process.exitCode=1;}).finally(()=>db?.end());
