// Native SQL boundary regression under managed Auth ownership, never cloud Auth.
const assert=require('node:assert/strict');
module.exports=async function boundary(h){
 const {root,q,rpc,deny,actor,eq,as}=h;
 const owner=await actor('employer'),foreign=await actor('specialist');
 const ctx=await rpc(owner,'create_org_draft'),oid=ctx.organization.id;
 await root();
 for(const role of ['vetkarjera_organization_writer','vetkarjera_organization_reader']){
  const access=(await q("select has_schema_privilege($1,'auth','USAGE') usage,has_table_privilege($1,'auth.users','SELECT') users,has_table_privilege($1,'auth.sessions','SELECT') sessions",[role])).rows[0];
  eq(access,{usage:false,users:false,sessions:false});
  await q('set role '+role);await assert.rejects(()=>q('select id from auth.users'),e=>e.code==='42501');h.bump();await root();
 }
 const lookup=(await q("select r.rolname owner,p.prosecdef definer,p.proconfig from pg_proc p join pg_roles r on r.oid=p.proowner where p.oid='private.stage5_confirmed_transfer_target(uuid,text)'::regprocedure")).rows[0];
 eq(lookup,{owner:'postgres',definer:true,proconfig:['search_path=""']});
 for(const role of ['anon','authenticated','vetkarjera_organization_reader'])eq((await q("select has_function_privilege($1,'private.stage5_confirmed_transfer_target(uuid,text)','EXECUTE') yes",[role])).rows[0].yes,false);
 eq((await q("select has_function_privilege('vetkarjera_organization_writer','private.stage5_confirmed_transfer_target(uuid,text)','EXECUTE') yes")).rows[0].yes,true);
 // No subject or no active session must deny private reads AND mutations.
 for(const claims of [{},{...owner.claims,session_id:foreign.id},{...foreign.claims,sub:owner.id},
  {...owner.claims,session_id:'00000000-0000-4000-8000-000000000000'}]){
  const a={...owner,claims};await deny(a,'own_org_context',[oid],'42501');
  await deny(a,'patch_org_public',[oid,ctx.rowVersion,{name:'Forged mutation'}],'42501');
 }
 await root();await q("update auth.sessions set not_after=now()-interval '1 second' where id=$1",[owner.id]);
 await deny(owner,'patch_org_public',[oid,ctx.rowVersion,{name:'Expired mutation'}],'42501');
 await root();await q('delete from auth.sessions where id=$1',[owner.id]);
 await deny(owner,'patch_org_public',[oid,ctx.rowVersion,{name:'Revoked mutation'}],'42501');
 await root();await q('insert into auth.sessions(id,user_id) values($1,$1)',[owner.id]);
 await q('update auth.users set email_confirmed_at=null where id=$1',[owner.id]);
 await deny(owner,'patch_org_public',[oid,ctx.rowVersion,{name:'Unconfirmed mutation'}],'42501');
 await root();await q('update auth.users set email_confirmed_at=now() where id=$1',[owner.id]);
 await deny(foreign,'patch_org_public',[oid,ctx.rowVersion,{name:'Foreign mutation'}],'42501');
 await as(owner);await assert.rejects(()=>q('select private.stage5_confirmed_transfer_target($1,$2)',[oid,foreign.email]),e=>e.code==='42501');h.bump();
 // Internal lookup still enforces a live owner/admin even for its only caller.
 await root();await q("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(foreign.claims)]);await q('set role vetkarjera_organization_writer');
 await assert.rejects(()=>q('select private.stage5_confirmed_transfer_target($1,$2)',[oid,owner.email]),e=>e.code==='42501');h.bump();
 await root();await q("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(owner.claims)]);await q('set role vetkarjera_organization_writer');
 eq((await q('select private.stage5_confirmed_transfer_target($1,$2) id',[oid,foreign.email])).rows[0].id,foreign.id);
 await root();
 // Stage4 writer/capabilities/photo declarations are exercised with the same
 // native Auth ownership/ACL, rather than a permissive embedded Auth schema.
 const step1={first_name:'Local',last_name:'Specialist',professional_role_code:'veterinarian'};
 await rpc(foreign,'save_specialist_step1',[step1]);
 eq((await rpc(foreign,'account_capabilities')).hasSpecialistProfile,true);
 await rpc(foreign,'create_second_profile',['employer',{organization_name_input:'Local dual profile',organization_type_code:'veterinary_clinic'}]);
 eq((await rpc(foreign,'account_capabilities')).hasEmployerProfile,true);
 await deny(foreign,'patch_org_public',[oid,ctx.rowVersion,{name:'Dual profile escalation'}],'42501');
 eq((await rpc(owner,'patch_org_public',[oid,ctx.rowVersion,{name:'Live owner'}])).organization.name,'Live owner');
 await root();
 eq((await q("select count(*)::int n from pg_trigger t join pg_class c on c.oid=t.tgrelid where t.tgname='organization_account_delete_guard' and c.oid='public.profiles'::regclass")).rows[0].n,1);
 // Existing organization cases separately prove blocked current-owner Auth
 // deletion and successful former-owner deletion through the FK cascade.
};
