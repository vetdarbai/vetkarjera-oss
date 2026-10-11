// Local synthetic DB/RLS regression for the Stage5.13 additive catalog and
// evidence-free submission. No cloud URLs, secrets or real account data.
const assert=require('node:assert/strict');
const current=['daytime_clinic','24_7','emergency','walk_in','scheduled_patients','on_call','night_shifts','inpatient'];
const legacy=['regular_clinic','24_7','emergency','on_call','inpatient'];
async function snapshot(h,oid){
 await h.root();
 return(await h.q(`select jsonb_build_object(
 'selections',(select jsonb_agg(to_jsonb(s) order by option_code) from public.organization_attribute_selections s where organization_id=$1),
 'cases',(select jsonb_agg(to_jsonb(c) order by id) from private.organization_verification_cases c where organization_id=$1),
 'evidence',(select jsonb_agg(to_jsonb(e) order by e.id) from private.organization_verification_evidence e join private.organization_verification_cases c on c.id=e.case_id where c.organization_id=$1),
 'controls',(select to_jsonb(c) from private.organization_controls c where organization_id=$1),
 'memberships',(select jsonb_agg(to_jsonb(m) order by user_id) from public.organization_memberships m where organization_id=$1),
 'roleMemberships',(select jsonb_agg(to_jsonb(m) order by roleid,member,grantor) from pg_auth_members m),
 'privateSchemaAcl',(select nspacl::text from pg_namespace where nspname='private'),
 'permissions',(select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'owner',r.rolname,'acl',p.proacl::text,'config',p.proconfig,'definer',p.prosecdef) order by p.oid::regprocedure::text)
 from pg_proc p join pg_roles r on r.oid=p.proowner where p.pronamespace in('public'::regnamespace,'private'::regnamespace) and p.proname in('org_verification','request_employer_verification','request_representation_verification','org_context','admin_org_review_context'))
 ) value`,[oid])).rows[0].value;
}
async function prepareUpgrade(h){
 const owner=await h.actor('employer'),admin=await h.actor('specialist');
 await h.root();await h.q("insert into private.account_admins(user_id,source) values($1,'LOCAL SYNTHETIC QA')",[admin.id]);
 let c=await h.rpc(owner,'create_org_draft'),id=c.organization.id;
 c=await h.rpc(owner,'patch_org_public',[id,c.rowVersion,{name:'Synthetic upgrade clinic',organization_type_code:'veterinary_clinic'}]);
 c=await h.rpc(owner,'save_org_type_block',[id,c.rowVersion,{type_revision:c.typeRevision,groups:[{group_code:'working_models',options:legacy,custom:[]}]}]);
 for(const scope of ['identity','representation']){
  c=await h.rpc(owner,'request_employer_verification',[id,c.rowVersion,{scope,method:'official_contact',reference:'Real synthetic submitted reference'}]);
  await h.root();const cid=(await h.q("select id from private.organization_verification_cases where organization_id=$1 and scope=$2 and status='pending'",[id,scope])).rows[0].id;
  c=await h.rpc(admin,'admin_resolve_case',[id,c.rowVersion,{case_id:cid,decision:scope==='identity'?'approved':'needs_info',method:'official_phone',reference:'Independent synthetic reference',reason:'Private synthetic review note'}]);
 }
 c=await h.rpc(owner,'request_representation_verification',[id,c.rowVersion,{method:'official_contact',reference:'Legacy pending request'}]);
 return{owner,id,before:await snapshot(h,id)};
}
async function verifyUpgrade(h,u){
 h.eq(await snapshot(h,u.id),u.before);
 const c=await h.rpc(u.owner,'own_org_context',[u.id]);
 h.eq(c.organization.typeBlock.find(g=>g.group==='working_models').options,[...legacy].sort());
 h.eq(c.verification.identityApproved,true);h.eq(c.verification.representationApproved,false);h.eq(c.verification.state,'pending');
 h.eq(JSON.stringify(c).includes('Private synthetic review note'),false);
}
async function cases(h){
 const {eq,rpc,deny,q,root}=h;
 const owner=await h.actor('employer'),foreign=await h.actor('employer'),admin=await h.actor('specialist');
 await root();await q("insert into private.account_admins(user_id,source) values($1,'LOCAL SYNTHETIC QA')",[admin.id]);
 let c=await rpc(owner,'create_org_draft'),id=c.organization.id;
 const save=async(name,payload)=>c=await rpc(owner,name,[id,c.rowVersion,payload]);
 await save('patch_org_public',{name:'Synthetic correction clinic',organization_type_code:'veterinary_clinic'});
 await save('save_org_locations',{cities:[{city_name:'Vilnius'}]});
 await save('save_org_legal_draft',{legal_name:'Synthetic correction entity',legal_form_code:'uab',legal_code:'SYNTHETIC-ONLY'});
 await save('save_own_representative_details',{first_name:'Local',last_name:'Owner',capacity:'Director',private_phone:'LOCAL ONLY'});
 const caps=c.capabilities,revision=c.typeRevision;
 await root();const options=(await q("select option_code,label_lt,sort_order,is_active from public.organization_attribute_options where type_code='veterinary_clinic' and group_code='working_models' order by sort_order")).rows;
 eq(options.map(r=>r.option_code),[...current,'regular_clinic']);eq(options.every(r=>r.is_active),true);
 eq(options.at(-1).label_lt,'Įprasta klinika');eq(new Set(options.map(r=>r.option_code)).size,9);
 for(const code of current){
  await save('save_org_type_block',{type_revision:revision,groups:[{group_code:'working_models',options:[code],custom:[]}]});
  eq((await rpc(owner,'own_org_context',[id])).organization.typeBlock.find(g=>g.group==='working_models').options,[code]);
 }
 await save('save_org_type_block',{type_revision:revision,groups:[{group_code:'working_models',options:current,custom:[]}]});
 eq(c.typeRevision,revision);eq(c.organization.typeBlock.find(g=>g.group==='working_models').options,[...current].sort());
 await root();await q('set role anon');let pub=(await q('select public.get_public_organization($1) value',[id])).rows[0].value;
 eq(pub.typeBlock.find(g=>g.group==='working_models').options,[...current].sort());eq('verification' in pub,false);
 await deny(owner,'save_org_type_block',[id,c.rowVersion,{type_revision:revision,groups:[{group_code:'working_models',options:['invented'],custom:[]}]}],'22023');
 await save('patch_org_public',{organization_type_code:'other'});
 eq(c.typeRevision,revision+1);eq(c.organization.typeBlock,undefined);
 await save('patch_org_public',{organization_type_code:'veterinary_clinic'});eq(c.typeRevision,revision+2);eq(c.organization.typeBlock,undefined);
 await deny(owner,'save_org_type_block',[id,c.rowVersion,{type_revision:revision,groups:[]}],'40001');
 // No method, reference or evidence is fabricated by the simple owner request.
 const beforeVersion=c.rowVersion;
 await save('request_employer_verification',{scope:'identity'});
 eq(c.verification.state,'pending');eq(c.verification.identityApproved,false);eq(c.verification.representationApproved,false);eq(c.capabilities,caps);
 await root();let rows=(await q('select id,status,method,requester from private.organization_verification_cases where organization_id=$1',[id])).rows;
 eq(rows.length,1);eq(rows[0].method,null);eq(rows[0].requester,owner.id);
 eq((await q('select count(*)::int n from private.organization_verification_evidence where case_id=$1',[rows[0].id])).rows[0].n,0);
 // Existing optimistic concurrency and replacement semantics are retained.
 await deny(owner,'request_employer_verification',[id,beforeVersion,{scope:'identity'}],'40001');
 await save('request_employer_verification',{scope:'identity'});
 await root();rows=(await q("select status from private.organization_verification_cases where organization_id=$1 and scope='identity' order by submitted_at,id",[id])).rows;
 eq(rows.filter(r=>r.status==='pending').length,1);eq(rows.filter(r=>r.status==='cancelled').length,1);
 for(const payload of [{},{scope:'wrong'},{scope:'identity',method:'official_phone'},{scope:'identity',reference:'contact'},
  {scope:'identity',method:'',reference:''},{scope:'identity',method:null,reference:null},
  {scope:'identity',method:'invented',reference:'contact'},{scope:'identity',reason:'Forged admin note'},
  {scope:'identity',method:7,reference:'contact'}])await deny(owner,'request_employer_verification',[id,c.rowVersion,payload]);
 await deny(foreign,'request_employer_verification',[id,c.rowVersion,{scope:'identity'}],'42501');
 await deny(owner,'admin_org_review_context',[id],'42501');
 await root();await q('set role anon');await assert.rejects(()=>q('select public.request_employer_verification($1,$2,$3)',[id,c.rowVersion,'{"scope":"identity"}']),e=>e.code==='42501');h.bump();
 const caseId=async(scope)=>{await root();return(await q("select id from private.organization_verification_cases where organization_id=$1 and scope=$2 and status in('pending','needs_info') order by submitted_at desc limit 1",[id,scope])).rows[0].id;};
 const identity=await caseId('identity');
 await deny(admin,'admin_resolve_case',[id,c.rowVersion,{case_id:identity,decision:'approved'}],'22023');
 await deny(owner,'admin_resolve_case',[id,c.rowVersion,{case_id:identity,decision:'approved',method:'official_phone',reference:'Fake owner approval'}],'42501');
 c=await rpc(admin,'admin_resolve_case',[id,c.rowVersion,{case_id:identity,decision:'needs_info',reason:'CONFIDENTIAL ADMIN NOTE'}]);
 eq(c.verification.state,'needs_info');eq(JSON.stringify(c).includes('CONFIDENTIAL'),false);
 eq((await rpc(owner,'own_org_context',[id])).verification.state,'needs_info');
 await save('request_employer_verification',{scope:'identity'});eq(c.verification.state,'pending');
 const newIdentity=await caseId('identity');
 c=await rpc(admin,'admin_resolve_case',[id,c.rowVersion,{case_id:newIdentity,decision:'approved',method:'official_phone',reference:'Independent actual synthetic review'}]);
 eq(c.verification.identityApproved,true);eq(c.verification.representationApproved,false);
 await save('request_representation_verification',{});eq(c.verification.state,'pending');
 const rep=await caseId('representation');
 await root();eq((await q('select method from private.organization_verification_cases where id=$1',[rep])).rows[0].method,null);
 eq((await q('select count(*)::int n from private.organization_verification_evidence where case_id=$1',[rep])).rows[0].n,0);
 const review=await rpc(admin,'admin_org_review_context',[id]);
 eq(review.cases.some(r=>r.id===rep&&r.status==='pending'&&r.method===null),true);
 c=await rpc(admin,'admin_resolve_case',[id,c.rowVersion,{case_id:rep,decision:'approved',method:'official_contact',reference:'Independent actual representation review',reason:'PRIVATE REVIEWER NOTE'}]);
 c=await rpc(owner,'own_org_context',[id]);
 eq(c.verification.state,'verified');eq(c.verification.identityApproved,true);eq(c.verification.representationApproved,true);
 eq(c.capabilities.canRequestTransfer,true);eq(c.capabilities.canArchive,true);eq(c.capabilities.canManageMedia,true);
 eq(JSON.stringify(await rpc(owner,'own_org_context',[id])).includes('PRIVATE REVIEWER'),false);
 await root();eq((await q("select count(*)::int n from private.organization_verification_evidence e join private.organization_verification_cases v on v.id=e.case_id where v.organization_id=$1 and e.source_kind='submitted_reference'",[id])).rows[0].n,0);
 await root();await q("update auth.sessions set not_after=now()-interval '1 second' where id=$1",[owner.id]);
 await deny(owner,'request_representation_verification',[id,c.rowVersion,{}],'42501');
 await root();await q('delete from auth.sessions where id=$1',[owner.id]);await deny(owner,'request_representation_verification',[id,c.rowVersion,{}],'42501');
};
module.exports={prepareUpgrade,verifyUpgrade,cases};
