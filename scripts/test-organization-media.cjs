const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite'),{createDatabase}=require('./profile-test-db.cjs');
let db,current,owner,foreign,admin,checks=0,storageFail=false,cleanupFail=false,concurrent=false,oid;
const bytes=new Map(),oldVersions={},bucket='organization-profile-media';
process.env.SUPABASE_STORAGE_SERVICE_ROLE_KEY='LOCAL_SYNTHETIC_STORAGE_KEY';
globalThis.fetch=()=>{throw new Error('Network forbidden in Storage transport fixture QA');};
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const root=()=>db.exec('reset role');
async function as(a){await root();await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(a?.claims||{})]);await db.exec('set role '+(a?'authenticated':'anon'));}
async function rpc(a,name,args=[]){await as(a);return(await db.query('select public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') value',args.map(v=>v&&typeof v==='object'?JSON.stringify(v):v))).rows[0].value;}
async function account(kind){await root();const uid=crypto.randomUUID();await db.query("insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values($1,$2,$3,now())",[uid,uid+'@example.invalid',JSON.stringify({account_role:kind})]);await db.query('insert into auth.sessions(id,user_id) values($1,$1)',[uid]);return {id:uid,claims:{sub:uid,session_id:uid,role:'authenticated'}};}
async function context(){return rpc(owner,'own_org_context',[oid]);}
const client={async rpc(name,args){try{return {data:await rpc(current,name,Object.values(args)),error:null};}catch(e){if(name==='read_org_media')console.error('Read RPC failure',e.message,e.code,e.where);return {data:null,error:{code:e.code}};}},
 from(table){assert.equal(table,'specialist_profiles');return {select(){return {eq(column,id){assert.equal(column,'user_id');return {async maybeSingle(){await as(current);return {data:(await db.query('select user_id from public.specialist_profiles where user_id=$1',[id])).rows[0]||null,error:null};}};}};}};},
 storage:{from(b){assert.ok([bucket,'specialist-profile-photos'].includes(b));return {async download(p){await as(current);const found=(await db.query('select name from storage.objects where bucket_id=$1 and name=$2',[b,p])).rows[0];
 return found&&bytes.has(p)?{data:new Blob([bytes.get(p)]),error:null}:{data:null,error:{status:404}};}};}}};
const store={async upload(p,data){if(storageFail)return {error:{code:'test_failure'}};await root();await db.exec('set role service_role');await db.query("insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)",[bucket,p,JSON.stringify({size:data.length,mimetype:'image/webp'})]);bytes.set(p,Buffer.from(data));
 if(concurrent){concurrent=false;const ctx=await context();await rpc(owner,'patch_org_public',[oid,ctx.rowVersion,{description:'Concurrent edit'}]);}
 return {error:null};},
 async remove(paths){if(cleanupFail)return {error:{code:'test_cleanup_failure'}};await root();await db.exec('set role service_role');for(const p of paths){await db.query('delete from storage.objects where bucket_id=$1 and name=$2',[bucket,p]);bytes.delete(p);}return {error:null};}};
const Module=require('node:module'),ts=require('typescript'),original=Module._load;
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
Module._load=function(name,parent,main){
 if(name==='server-only')return {};
 if(name==='@/lib/supabase/server')return {createClient:async()=>client};
 if(name==='@/lib/supabase/env')return {getSupabaseEnvironment:()=>({url:'http://127.0.0.1:1',anonKey:'SYNTHETIC'})};
 if(name==='@supabase/supabase-js')return {createClient:()=>({storage:{from:b=>{assert.equal(b,bucket);return store;}}})};
 if(name==='@/lib/auth/session')return {getActiveUser:async()=>{if(!current)return null;try{return await rpc(current,'account_capabilities',[]);}catch{return null;}}};
 if(name.startsWith('@/'))return original.call(this,path.resolve(name.slice(2)),parent,main);
 return original.call(this,name,parent,main);
};
const route=require('../app/api/organizacijos/[id]/media/[kind]/route.ts'),publicRoute=require('../app/api/organizacijos/slug/[slug]/route.ts'),specialistRoute=require('../app/api/profilis/nuotrauka/vaizdas/route.ts'),media=require('../lib/organizations/media.ts'),sharp=require('sharp');
function request(method,k,body,query='',headers={}){return new Request('http://127.0.0.1:3000/api/organizacijos/'+oid+'/media/'+k+query,{method,headers:{origin:'http://127.0.0.1:3000',...(body?{'content-type':'image/png'}:{}),...headers},body:body?new Uint8Array(body):undefined});}
async function call(a,method,k,body,query='',headers={}){current=a;return route[method](request(method,k,body,query,headers),{params:Promise.resolve({id:oid,kind:k})});}
(async()=>{db=await createDatabase();owner=await account('employer');foreign=await account('specialist');admin=await account('specialist');
 await root();await db.query("insert into private.account_admins values($1,now(),'LOCAL SYNTHETIC QA')",[admin.id]);
 let ctx=await rpc(owner,'create_org_draft',[]);oid=ctx.organization.id;
 const images=[];for(const color of ['#ee3020','#2066dd','#15aa55'])images.push(await sharp({create:{width:2100,height:1300,channels:3,background:color}}).png().toBuffer());
 for(const kind of ['logo','cover']){
  let previous,expected;
  for(const input of images){const response=await call(owner,'PUT',kind,input);eq(response.status,200);const saved=await response.json();eq(typeof saved.version,'string');eq(saved.version===previous,false);eq(saved.src.endsWith(saved.version),true);
   const get=await call(owner,'GET',kind,null,'?v='+saved.version);eq(get.status,200);eq(get.headers.get('cache-control'),'private, no-store, max-age=0');
   expected=Buffer.from(await get.arrayBuffer());const meta=await sharp(expected).metadata();eq(meta.format,'webp');eq(Math.max(meta.width,meta.height)<=media.ORGANIZATION_MEDIA_LIMITS[kind].edge,true);eq(meta.exif,undefined);
   const reloaded=await context();eq(reloaded.organization.media[kind].version,saved.version);
   if(previous){oldVersions[kind]=previous;eq((await call(owner,'GET',kind,null,'?v='+previous)).status,404);}previous=saved.version;
  }
  eq((await call(foreign,'GET',kind)).status,404);eq((await call(null,'GET',kind)).status,404);eq((await call(admin,'GET',kind)).status,200);
  eq((await call(foreign,'PUT',kind,images[0])).status,403);eq((await call(null,'PUT',kind,images[0])).status,401);
  eq((await call(owner,'PUT',kind,images[0],'',{origin:'https://foreign.invalid'})).status,403);
  const prior=(await context()).organization.media[kind].version;
  storageFail=true;eq((await call(owner,'PUT',kind,images[0])).status,503);storageFail=false;eq((await context()).organization.media[kind].version,prior);
  concurrent=true;eq((await call(owner,'PUT',kind,images[0])).status,409);eq((await context()).organization.media[kind].version,prior);
  eq((await call(owner,'DELETE',kind)).status,200);eq((await call(owner,'GET',kind)).status,404);
  eq((await call(owner,'PUT',kind,images[2])).status,200);
  eq((await call(owner,'PUT',kind,Buffer.from('<svg/>'))).status,415);
  eq((await call(owner,'PUT',kind,Buffer.from([255,216,0,0]))).status,400);
  eq((await call(owner,'PUT',kind,Buffer.alloc(3*1024*1024+1))).status,413);
  const animated=await sharp(Buffer.concat([Buffer.alloc(300,30),Buffer.alloc(300,220)]),{raw:{width:10,height:20,channels:3,pageHeight:10}}).webp({loop:0,delay:[100,100]}).toBuffer();
  eq((await call(owner,'PUT',kind,animated,'',{'content-type':'image/webp'})).status,415);
 }
 // Even an accidental broader permissive policy cannot grant direct mutations.
 await root();await db.exec("create policy stage5_qa_broad on storage.objects for all to anon,authenticated using(true) with check(true)");
 for(const a of [owner,foreign,null]){await as(a);await assert.rejects(()=>db.query("insert into storage.objects(bucket_id,name,metadata) values($1,'forged', '{}')",[bucket]),e=>e.code==='42501');checks++;
 try{eq((await db.query('delete from storage.objects where bucket_id=$1 returning id',[bucket])).rows.length,0);}catch(e){eq(e.code,'42501');}}
 await root();await db.exec('drop policy stage5_qa_broad on storage.objects');
 const orphan=oid+'/logo/'+crypto.randomUUID()+'.webp';await store.upload(orphan,Buffer.from('orphan'));current=owner;eq((await client.storage.from(bucket).download(orphan)).error.status,404);
 ctx=await context();ctx=await rpc(owner,'patch_org_public',[oid,ctx.rowVersion,{name:'Media QA',organization_type_code:'other'}]);
 ctx=await rpc(owner,'save_org_locations',[oid,ctx.rowVersion,{cities:[{city_name:'Vilnius'}]}]);
 ctx=await rpc(owner,'save_org_legal_draft',[oid,ctx.rowVersion,{legal_name:'Local',legal_form_code:'natural_person'}]);
 ctx=await rpc(owner,'save_own_representative_details',[oid,ctx.rowVersion,{first_name:'Local',last_name:'Owner',capacity:'Owner',private_phone:'Test phone'}]);
 eq(ctx.profileState,'active');eq(ctx.completeness.total,90); // Required70 + logo5 + cover5 + concurrent-description10.
 ctx=await rpc(owner,'save_org_type_block',[oid,ctx.rowVersion,{type_revision:ctx.typeRevision,groups:[{group_code:'activity_areas',options:[],custom:['Synthetic activity']}]}]);
 ctx=await rpc(owner,'save_org_benefits',[oid,ctx.rowVersion,{standard:['mentorship'],custom:[]}]);
 eq(ctx.completeness.total,100);eq(ctx.completeness.quality,30);eq((await context()).completeness.total,100);
 for(const k of ['logo','cover']){eq((await call(null,'GET',k)).status,200);eq((await call(foreign,'GET',k)).status,200);eq((await call(owner,'GET',k)).status,200);}
 for(const a of [null,foreign,owner]){current=a;eq((await client.storage.from(bucket).download(orphan)).error.status,404);
  for(const k of ['logo','cover'])eq((await call(a,'GET',k,null,'?v='+oldVersions[k])).status,404);
  eq((await call(a,'GET','logo',null,'?v='+orphan.split('/').at(-1).slice(0,-5))).status,404);}
 await root();await db.exec("insert into storage.buckets(id,name) values('specialist-profile-photos','specialist-profile-photos');insert into storage.objects(bucket_id,name) values('specialist-profile-photos','synthetic-private.webp')");
 await as(null);eq((await db.query("select id from storage.objects where bucket_id='specialist-profile-photos'")).rows,[]);
 await root();eq((await db.query("select has_function_privilege('anon','private.can_read_specialist_photo(text)','EXECUTE') allowed")).rows[0].allowed,false);
 current=null;let result=await publicRoute.GET(new Request('http://127.0.0.1:3000/api/organizacijos/slug/'+ctx.organization.slug),{params:Promise.resolve({slug:ctx.organization.slug})});eq(result.status,200);
 const oldSlug=ctx.organization.slug;ctx=await rpc(owner,'patch_org_public',[oid,ctx.rowVersion,{name:'Renamed media QA'}]);current=null;
 result=await publicRoute.GET(new Request('http://127.0.0.1:3000/api/organizacijos/slug/'+oldSlug),{params:Promise.resolve({slug:oldSlug})});eq(result.status,308);eq(result.headers.get('location').endsWith('/darbdaviai/'+ctx.organization.slug),true);
 cleanupFail=true;eq((await call(owner,'DELETE','logo')).status,503);cleanupFail=false;eq((await context()).organization.media.logo,undefined);
 eq((await call(owner,'PUT','logo',images[2])).status,200);
 ctx=await context();
 ctx=await rpc(admin,'admin_organization_state',[oid,ctx.rowVersion,{state:'suspended',reason:'LOCAL media access QA'}]);
 for(const k of ['logo','cover']){eq((await call(null,'GET',k)).status,404);eq((await call(foreign,'GET',k)).status,404);eq((await call(owner,'GET',k)).status,200);}
 ctx=await rpc(admin,'admin_organization_state',[oid,ctx.rowVersion,{state:'resume',reason:'LOCAL media access QA'}]);
 ctx=await rpc(admin,'admin_organization_state',[oid,ctx.rowVersion,{state:'archived',reason:'LOCAL media access QA'}]);
 for(const k of ['logo','cover']){eq((await call(null,'GET',k)).status,404);eq((await call(foreign,'GET',k)).status,404);eq((await call(owner,'GET',k)).status,200);}
 // Actual specialist GET handler with SQL-backed RLS and synthetic bytes.
 const specialistBytes=await sharp(images[0]).resize(100,100).webp().toBuffer(),specialistPath=foreign.id+'/profile.webp';
 await root();await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['specialist-profile-photos',specialistPath]);bytes.set(specialistPath,specialistBytes);
 async function specialistGet(a){current=a;return specialistRoute.GET(new Request('http://127.0.0.1:3000/api/profilis/nuotrauka/vaizdas?userId='+foreign.id));}
 let specialistResponse=await specialistGet(foreign);eq(specialistResponse.status,200);eq(Buffer.from(await specialistResponse.arrayBuffer()),specialistBytes);
 eq((await specialistGet(admin)).status,200);eq((await specialistGet(owner)).status,403);eq((await specialistGet(null)).status,401);
 for(const a of [null,owner]){current=a;eq((await client.storage.from('specialist-profile-photos').download(specialistPath)).error.status,404);}
 await root();await db.query("update auth.sessions set not_after=now()-interval '1 second' where id=$1",[foreign.id]);eq((await specialistGet(foreign)).status,401);
 await root();await db.query('delete from auth.sessions where id=$1',[foreign.id]);eq((await specialistGet(foreign)).status,401);
 fs.mkdirSync('.staging-results',{recursive:true});fs.writeFileSync('.staging-results/stage5-media.json',JSON.stringify({status:'PASS',assertions:checks,storageTransport:'fixture',sqlRls:'real PostgreSQL engine',compatibilityAmendment:'applied in new Stage5 migration only'},null,2));
 console.log('Stage5 media PASS: '+checks+' assertions');
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>db?.close());
