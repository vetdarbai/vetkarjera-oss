const assert=require('node:assert/strict'),catalog=require('../lib/organizations/catalogs.json');
module.exports=async function cases(h){
 const {eq,rpc,deny,as,root,q,actor}=h;
 const owner=await actor('employer'),foreign=await actor('specialist'),employer=await actor('employer'),admin=await actor('specialist');
 await root();await q("insert into private.account_admins(user_id,source) values($1,'LOCAL SYNTHETIC QA')",[admin.id]);
 let ctx=await rpc(owner,'create_org_draft',[]),oid=ctx.organization.id;
 eq(ctx.completeness.total,0);eq(ctx.profileState,'draft');
 eq((await rpc(owner,'create_org_draft',[])).organization.id,oid);
 async function save(name,payload,a=owner){ctx=await rpc(a,name,[oid,ctx.rowVersion,payload]);return ctx;}
 async function publicRead(slug){await root();await q('set role anon');return(await q('select public.resolve_org_slug($1) value',[slug])).rows[0].value;}
 async function ready(a,which){let x=await rpc(a,'create_org_draft',[]);let id=x.organization.id;
  x=await rpc(a,'patch_org_public',[id,x.rowVersion,{name:'Klinika '+which,organization_type_code:'veterinary_clinic'}]);
  x=await rpc(a,'save_org_locations',[id,x.rowVersion,{cities:[{city_name:'Vilnius'}]}]);
  x=await rpc(a,'save_org_legal_draft',[id,x.rowVersion,{legal_name:'Synthetic UAB '+which,legal_form_code:'uab',legal_code:'SYNTHETIC-'+which}]);
  x=await rpc(a,'save_own_representative_details',[id,x.rowVersion,{first_name:'Test',last_name:'Owner',capacity:'Director',private_phone:'+37000000000'}]);return x;
 }
 await save('patch_org_public',{name:'Ąžuolų Šeimos klinika',organization_type_code:'veterinary_clinic'});
 eq(ctx.completeness.step1,0);
 await save('save_org_locations',{cities:[{city_name:'Vilnius'},{city_name:'Kaunas',municipality_code:'lt_kauno_m'}]});
 eq(ctx.completeness.step1,20);eq(ctx.organization.cities.length,2);
 await deny(owner,'save_org_locations',[oid,ctx.rowVersion,{cities:[{city_name:'Vilnius'},{city_name:'vilnius'}]}],'23505');
 await deny(owner,'save_org_locations',[oid,ctx.rowVersion,{cities:[{city_name:'Šiauliai'},{city_name:'šiauliai'}]}],'23505');
 await deny(owner,'save_org_locations',[oid,ctx.rowVersion,{cities:[{city_name:'X',municipality_code:'nationwide'}]}],'22023');
 await save('save_org_legal_draft',{legal_name:'Synthetic UAB',legal_form_code:'uab',legal_code:'QA-ONLY'});
 eq(ctx.completeness.total,20);
 await save('save_own_representative_details',{first_name:'Test',last_name:'Owner',capacity:'Director',private_phone:'+37000000000'});
 eq(ctx.completeness.total,70);eq(ctx.profileState,'active');eq(ctx.verification.state,'unverified');
 const firstSlug=ctx.organization.slug;eq(firstSlug,'azuolu-seimos-klinika');
 let pub=await publicRead(firstSlug);eq(pub.status,200);
 const text=JSON.stringify(pub);eq(/legalName|legalCode|privatePhone|verification|representative/.test(text),false);eq(pub.profile.typeBlock,undefined);eq(pub.profile.benefits,undefined);
 await as(employer);eq((await q('select id from public.organizations where id=$1',[oid])).rows.length,1);
 await deny(foreign,'patch_org_public',[oid,ctx.rowVersion,{name:'Stolen'}],'42501');
 await deny(owner,'patch_org_public',[oid,ctx.rowVersion,{profile_state:'active',total:100}],'22023');
 await deny(owner,'patch_org_public',[oid,ctx.rowVersion,{description:17}],'22023');
 await deny(owner,'patch_org_public',[oid,ctx.rowVersion,{website:'javascript:alert(1)'}],'23514');
 await save('patch_org_public',{description:'X',website:'https://example.invalid',public_email:'public@example.invalid',employee_size_code:'size_1'});
 eq(ctx.completeness.total,80);eq(ctx.completeness.descriptionPoints,10);
 await save('save_org_benefits',{standard:['mentorship','flexible_schedule'],custom:['Local synthetic benefit']});eq(ctx.completeness.benefitPoints,5);eq(ctx.completeness.total,85);
 await deny(owner,'save_org_benefits',[oid,ctx.rowVersion,{standard:[],custom:Array.from({length:11},(_,i)=>'Benefit '+i)}],'22023');
 await deny(owner,'save_org_benefits',[oid,ctx.rowVersion,{standard:[],custom:['Same','same']}],'23505');
 await save('save_org_locations',{cities:[]});eq(ctx.profileState,'draft');eq(ctx.completeness.step1,0);eq(ctx.completeness.step2,0);eq(await publicRead(firstSlug),null);
 await save('save_org_locations',{cities:[{city_name:'Vilnius'}]});eq(ctx.profileState,'active');

 // Every locked type: no values ->0; AND partial->0; required groups->5.
 for(const type of catalog.typeMatrix){
  await save('patch_org_public',{organization_type_code:type.type});eq(ctx.completeness.typeQualityPoints,0);
  const groups=[];
  for(let i=0;i<type.groups.length;i++){
   const group=type.groups[i];groups.push({group_code:group,options:type.customOnly?[]:[type.catalogs[group].split(' / ')[0]],custom:type.customOnly?['Synthetic activity']:[]});
   await save('save_org_type_block',{type_revision:ctx.typeRevision,groups:[groups.at(-1)]});
   eq(ctx.completeness.typeQualityPoints,i===type.groups.length-1?5:0);
  }
  const reloaded=await rpc(owner,'own_org_context',[oid]);eq(reloaded.completeness.typeBlockComplete,true);eq(reloaded.completeness.typeQualityPoints,5);
  if(!type.customOnly){
   const g=type.groups[0],options=type.catalogs[g].split(' / ');
   if(options.includes('other')){
    await save('save_org_type_block',{type_revision:ctx.typeRevision,groups:[{group_code:g,options:['other'],custom:[' \t\n ']}]});eq(ctx.completeness.typeQualityPoints,0);
    await save('save_org_type_block',{type_revision:ctx.typeRevision,groups:[{group_code:g,options:['other'],custom:['Local other activity']}]});eq(ctx.completeness.typeQualityPoints,5);
    await save('save_org_type_block',{type_revision:ctx.typeRevision,groups:[{group_code:g,options:[options[0],'other'],custom:[]}]});eq(ctx.completeness.typeQualityPoints,5);
   }
  }else{
   await save('save_org_type_block',{type_revision:ctx.typeRevision,groups:[{group_code:'activity_areas',options:[],custom:[' \t ']}]});eq(ctx.completeness.typeQualityPoints,0);
   await save('save_org_type_block',{type_revision:ctx.typeRevision,groups:[{group_code:'activity_areas',options:[],custom:['Restored activity']}]});eq(ctx.completeness.typeQualityPoints,5);
  }
  await deny(owner,'save_org_type_block',[oid,ctx.rowVersion,{type_revision:ctx.typeRevision-1,groups:[]}],'40001');
 }
 await save('patch_org_public',{organization_type_code:'veterinary_clinic'});eq(ctx.completeness.typeQualityPoints,0);
 await save('save_org_type_block',{type_revision:ctx.typeRevision,groups:[{group_code:'working_models',options:['24_7'],custom:[]}]});eq(ctx.completeness.typeQualityPoints,0);
 await deny(owner,'save_org_type_block',[oid,ctx.rowVersion,{type_revision:ctx.typeRevision,groups:[{group_code:'product_areas',options:['feed'],custom:[]}]}],'22023');
 await save('patch_org_public',{name:'Naujas pavadinimas'});let moved=await publicRead(firstSlug);eq(moved.status,308);eq(moved.slug,ctx.organization.slug);
 const second=await ready(employer,'collision');
 let collision=await rpc(employer,'patch_org_public',[second.organization.id,second.rowVersion,{name:'Naujas pavadinimas'}]);eq(collision.organization.slug===ctx.organization.slug,false);
 const activeSlug=ctx.organization.slug;
 await as(owner);await assert.rejects(()=>q("update public.organizations set name='direct' where id=$1",[oid]),e=>e.code==='42501');h.bump();
 await assert.rejects(()=>q('select * from private.organization_legal_details'),e=>e.code==='42501');h.bump();
 await root();await q('set role anon');await assert.rejects(()=>q('select * from private.organization_representative_details'),e=>e.code==='42501');h.bump();
 // Read-only security: sessions can expire/revoke while public stays visible.
 await root();await q("update auth.sessions set not_after=now()-interval '1 second' where id=$1",[owner.id]);
 await deny(owner,'own_org_context',[oid],'42501');eq((await publicRead(activeSlug)).status,200);
 await root();await q('update auth.sessions set not_after=null where id=$1',[owner.id]);
 await q('delete from auth.sessions where id=$1',[owner.id]);await deny(owner,'own_org_context',[oid],'42501');
 await root();await q('insert into auth.sessions(id,user_id) values($1,$1)',[owner.id]);
 const noSession={...owner,claims:{...owner.claims,session_id:'00000000-0000-4000-8000-000000000000'}};await deny(noSession,'own_org_context',[oid],'42501');

 // Verification never changes public activation; approved legal identity locks.
 for(const scope of ['identity','representation']){
  await save('request_employer_verification',{scope,method:'official_contact',reference:'LOCAL ONLY reference'});
  eq(ctx.profileState,'active');
  await root();const cid=(await q('select id from private.organization_verification_cases where organization_id=$1 and scope=$2 and status=$3',[oid,scope,'pending'])).rows[0].id;
  await deny(owner,'admin_resolve_case',[oid,ctx.rowVersion,{case_id:cid,decision:'approved',method:'official_contact',reference:'Forgery'}],'42501');
  ctx=await rpc(admin,'admin_resolve_case',[oid,ctx.rowVersion,{case_id:cid,decision:'approved',method:'official_contact',reference:'LOCAL independently obtained evidence'}]);
  eq(ctx.profileState,'active');
 }
 eq(ctx.verification.state,'verified');
 await deny(owner,'save_org_legal_draft',[oid,ctx.rowVersion,{legal_name:'Direct overwrite'}],'42501');
 await save('request_org_legal_change',{legal_name:'Reviewed Synthetic UAB',legal_form_code:'uab',legal_code:'QA-NEW'});
 await root();const req=(await q("select id from private.organization_legal_change_requests where organization_id=$1 and status='pending'",[oid])).rows[0].id;
 ctx=await rpc(admin,'admin_resolve_legal_change',[oid,ctx.rowVersion,{request_id:req,decision:'approved',reason:'Synthetic identity correction'}]);
 eq(ctx.legal.legalName,'Reviewed Synthetic UAB');eq(ctx.profileState,'active');eq(ctx.verification.state,'unverified');eq(ctx.capabilities.canEditProfile,false);
 await deny(owner,'save_org_legal_draft',[oid,ctx.rowVersion,{legal_name:'Bypass approval history'}],'42501');
 // Minimal representative verification path remains usable after invalidation.
 await save('save_own_representative_details',{capacity:'Reviewed director'});
 await save('request_representation_verification',{method:'official_contact',reference:'New authority'});
 await root();let repCase=(await q("select id from private.organization_verification_cases where organization_id=$1 and scope='representation' and status='pending'",[oid])).rows[0].id;
 ctx=await rpc(admin,'admin_resolve_case',[oid,ctx.rowVersion,{case_id:repCase,decision:'approved',method:'official_contact',reference:'Independent current authority'}]);ctx=await rpc(owner,'own_org_context',[oid]);eq(ctx.capabilities.canEditProfile,true);

 // Transfer lifecycle and account deletion, including old/new-owner privacy.
 let transfer=await rpc(owner,'request_org_transfer',[oid,ctx.rowVersion,{target_email:foreign.email}]);ctx=await rpc(owner,'own_org_context',[oid]);
 await root();eq((await q('select user_id from public.organization_memberships where organization_id=$1 and revoked_at is null',[oid])).rows[0].user_id,owner.id);
 await rpc(owner,'cancel_org_transfer',[oid,ctx.rowVersion,{transfer_id:transfer.transferId}]);ctx=await rpc(owner,'own_org_context',[oid]);
 transfer=await rpc(owner,'request_org_transfer',[oid,ctx.rowVersion,{target_email:foreign.email}]);ctx=await rpc(owner,'own_org_context',[oid]);
 await rpc(foreign,'decline_org_transfer',[oid,ctx.rowVersion,{transfer_id:transfer.transferId}]);ctx=await rpc(owner,'own_org_context',[oid]);
 transfer=await rpc(owner,'request_org_transfer',[oid,ctx.rowVersion,{target_email:foreign.email}]);ctx=await rpc(owner,'own_org_context',[oid]);
 await root();await q("update private.organization_ownership_transfers set expires_at=now()-interval '1 second' where id=$1",[transfer.transferId]);
 eq((await rpc(foreign,'accept_org_transfer',[oid,ctx.rowVersion,{transfer_id:transfer.transferId}])).status,'expired');ctx=await rpc(owner,'own_org_context',[oid]);
 transfer=await rpc(owner,'request_org_transfer',[oid,ctx.rowVersion,{target_email:foreign.email}]);ctx=await rpc(owner,'own_org_context',[oid]);
 await root();await assert.rejects(()=>q('delete from auth.users where id=$1',[owner.id]),e=>e.code==='23514');h.bump();
 ctx=await rpc(foreign,'accept_org_transfer',[oid,ctx.rowVersion,{transfer_id:transfer.transferId,first_name:'New',last_name:'Owner',capacity:'Director',private_phone:'+37011111111'}]);
 eq(ctx.profileState,'active');eq(ctx.capabilities.canEditProfile,false);eq(ctx.representative.firstName,'New');
 eq((await rpc(foreign,'account_capabilities',[])).hasEmployerProfile,true);
 eq((await rpc(foreign,'account_capabilities',[])).hasSpecialistProfile,true);
 eq((await rpc(foreign,'account_capabilities',[])).isAdmin,false);
 eq(JSON.stringify(ctx).includes('+37000000000'),false);
 await deny(owner,'own_org_context',[oid],'42501');
 await root();await q('delete from auth.users where id=$1',[owner.id]);
 eq((await q('select count(*)::int n from auth.users where id=$1',[owner.id])).rows[0].n,0);
 eq((await q("select count(*)::int n from private.organization_verification_cases where subject_user_snapshot=$1 and status='approved'",[owner.id])).rows[0].n>0,true);
 await deny(foreign,'patch_org_public',[oid,ctx.rowVersion,{name:'Unverified new owner'}],'42501');
 await deny(foreign,'archive_org',[oid,ctx.rowVersion],'42501');
 await root();await assert.rejects(()=>q('delete from auth.users where id=$1',[foreign.id]),e=>e.code==='23514');h.bump();
 await q('begin');await q('update public.organization_memberships set revoked_at=now() where organization_id=$1 and revoked_at is null',[oid]);
 await assert.rejects(()=>q('set constraints all immediate'),e=>e.code==='23514');h.bump();await q('rollback');
 // Different legal form does not force a company-only ID.
 const individual=await actor('employer');let natural=await ready(individual,'natural');
 natural=await rpc(individual,'save_org_legal_draft',[natural.organization.id,natural.rowVersion,{legal_form_code:'individual_activity',legal_code:null}]);eq(natural.completeness.total,70);
 // Suspended/archived must deny public and preserve private reads.
 ctx=await rpc(admin,'admin_organization_state',[oid,ctx.rowVersion,{state:'suspended',reason:'LOCAL synthetic check'}]);
 eq(await publicRead(activeSlug),null);
 ctx=await rpc(admin,'admin_organization_state',[oid,ctx.rowVersion,{state:'resume',reason:'LOCAL synthetic resume'}]);eq(ctx.profileState,'active');
 await deny(employer,'admin_org_review_context',[oid],'42501');
 eq((await rpc(admin,'admin_org_review_context',[oid])).representativeHistory.length,2);
 const fallbackTarget=await actor('specialist');
 let fallback=await rpc(admin,'admin_request_org_transfer',[natural.organization.id,natural.rowVersion,{target_email:fallbackTarget.email,method:'official_contact',reference:'LOCAL independent fallback authority',reason:'Local unavailable-owner scenario'}]);
 eq(typeof fallback.transferId,'string');
 eq((await rpc(individual,'own_org_context',[natural.organization.id])).organization.id,natural.organization.id);
 let accepted=await rpc(fallbackTarget,'accept_org_transfer',[natural.organization.id,fallback.rowVersion,{transfer_id:fallback.transferId}]);
 eq(accepted.profileState,'draft');eq(accepted.capabilities.canEditProfile,false);
 return {owner,foreign,employer,admin,individual,oid,context:ctx};
};
