// SQL/RLS evidence on both embedded and native PostgreSQL; synthetic metadata
// only. Byte/HTTP-handler coverage lives in test-organization-media.cjs.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
module.exports=async function storageAccess(h){
 const {root,q,rpc,actor,eq}=h;
 const owner=await actor('employer'),specialist=await actor('specialist'),foreignEmployer=await actor('employer'),admin=await actor('specialist');
 await root();await q("insert into private.account_admins(user_id,source) values($1,'LOCAL Storage compatibility QA')",[admin.id]);
 async function as(a){await root();await q("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(a?.claims||{})]);await q('set role '+(a?'authenticated':'anon'));}
 async function readable(a,b,p){await as(a);return(await q('select name from storage.objects where bucket_id=$1 and name=$2',[b,p])).rows.length;}
 const orgBucket='organization-profile-media',photoBucket='specialist-profile-photos';
 let ctx=await rpc(owner,'create_org_draft',[]),id=ctx.organization.id;
 const current={},old={};
 async function media(kind){const prepared=await rpc(owner,'prepare_org_media',[id,ctx.rowVersion,{kind}]);
  await root();await q('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',[orgBucket,prepared.path,JSON.stringify({size:12,mimetype:'image/webp'})]);
  const saved=await rpc(owner,'commit_org_media',[id,ctx.rowVersion,{kind,version:prepared.version,sha256:'0'.repeat(64),size_bytes:12,width:1,height:1}]);
  ctx=saved.context;return prepared.path;
 }
 for(const k of ['logo','cover']){old[k]=await media(k);current[k]=await media(k);}
 const orphan=id+'/logo/'+crypto.randomUUID()+'.webp';
 await root();await q('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',[orgBucket,orphan,'{}']);
 for(const k of ['logo','cover']){
  eq(await readable(owner,orgBucket,current[k]),1);eq(await readable(admin,orgBucket,current[k]),1);
  for(const a of [null,specialist,foreignEmployer])eq(await readable(a,orgBucket,current[k]),0);
 }
 ctx=await rpc(owner,'patch_org_public',[id,ctx.rowVersion,{name:'Storage compatibility QA',organization_type_code:'other'}]);
 ctx=await rpc(owner,'save_org_locations',[id,ctx.rowVersion,{cities:[{city_name:'Vilnius'}]}]);
 ctx=await rpc(owner,'save_org_legal_draft',[id,ctx.rowVersion,{legal_name:'Local synthetic',legal_form_code:'natural_person'}]);
 ctx=await rpc(owner,'save_own_representative_details',[id,ctx.rowVersion,{first_name:'Local',last_name:'Owner',capacity:'Owner',private_phone:'Synthetic'}]);eq(ctx.profileState,'active');
 for(const a of [null,owner,specialist,foreignEmployer,admin]){
  for(const k of ['logo','cover']){eq(await readable(a,orgBucket,current[k]),1);eq(await readable(a,orgBucket,old[k]),0);}
  eq(await readable(a,orgBucket,orphan),0);
 }
 for(const state of ['suspended','archived']){
  ctx=await rpc(admin,'admin_organization_state',[id,ctx.rowVersion,{state,reason:'LOCAL Storage compatibility QA'}]);
  for(const k of ['logo','cover']){for(const a of [null,specialist,foreignEmployer])eq(await readable(a,orgBucket,current[k]),0);
   eq(await readable(owner,orgBucket,current[k]),1);eq(await readable(admin,orgBucket,current[k]),1);}
 }
 // Test direct mutations while the public rows ARE visible to anon/foreign,
 // so denial is proved by mutation guards rather than hidden SELECT rows.
 ctx=await rpc(admin,'admin_organization_state',[id,ctx.rowVersion,{state:'resume',reason:'LOCAL public mutation-deny QA'}]);eq(ctx.profileState,'active');
 // Preserve the authenticated specialist predicate and deny anonymous rows,
 // even when a broader permissive policy exists on the same Storage table.
 await root();await q('insert into storage.buckets(id,name) values($1,$1) on conflict do nothing',[photoBucket]);
 const photo=specialist.id+'/profile.webp';await q('insert into storage.objects(bucket_id,name) values($1,$2)',[photoBucket,photo]);
 eq((await q("select has_function_privilege('anon','private.can_read_specialist_photo(text)','EXECUTE') allowed")).rows[0].allowed,false);
 eq((await q("select has_schema_privilege('anon','private','USAGE') allowed")).rows[0].allowed,false);
 eq((await q("select has_function_privilege('authenticated','private.can_read_specialist_photo(text)','EXECUTE') allowed")).rows[0].allowed,true);
 await q("create policy stage5_storage_qa_broad on storage.objects for all to anon,authenticated using(true) with check(true)");
 eq(await readable(specialist,photoBucket,photo),1);eq(await readable(admin,photoBucket,photo),1);
 for(const a of [null,owner,foreignEmployer])eq(await readable(a,photoBucket,photo),0);
 for(const a of [null,owner,specialist,foreignEmployer]){
  for(const [b,p] of [[orgBucket,current.logo],[photoBucket,photo]]){
   await as(a);await assert.rejects(()=>q('insert into storage.objects(bucket_id,name) values($1,$2)',[b,'forged-'+crypto.randomUUID()]),e=>e.code==='42501');h.bump();
   eq((await q("update storage.objects set metadata='{}' where bucket_id=$1 and name=$2 returning name",[b,p])).rows.length,0);
   eq((await q('delete from storage.objects where bucket_id=$1 and name=$2 returning name',[b,p])).rows.length,0);
  }
  for(const k of ['logo','cover'])eq(await readable(a,orgBucket,old[k]),0);eq(await readable(a,orgBucket,orphan),0);
 }
 await root();await q('drop policy stage5_storage_qa_broad on storage.objects');
 const missing={...specialist,claims:{...specialist.claims,session_id:crypto.randomUUID()}};eq(await readable(missing,photoBucket,photo),0);
 await root();await q("update auth.sessions set not_after=now()-interval '1 second' where id=$1",[specialist.id]);eq(await readable(specialist,photoBucket,photo),0);
 await root();await q('delete from auth.sessions where id=$1',[specialist.id]);eq(await readable(specialist,photoBucket,photo),0);
 await root();await q('insert into auth.sessions(id,user_id) values($1,$1)',[specialist.id]);eq(await readable(specialist,photoBucket,photo),1);
 await root();
};
