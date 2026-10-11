begin;
set local lock_timeout='5s';

-- Expand the clinic catalog. A generic 'regular clinic' cannot be relabelled
-- as daytime-only without reinterpreting saved production answers.
-- Preserve regular_clinic as a valid legacy value; expose eight new/current
-- choices in the client catalog, and never rewrite organization selections.
update public.organization_attribute_options set label_lt='Visą parą dirbanti klinika',sort_order=2
 where type_code='veterinary_clinic' and group_code='working_models' and option_code='24_7';
update public.organization_attribute_options set sort_order=6
 where type_code='veterinary_clinic' and group_code='working_models' and option_code='on_call';
update public.organization_attribute_options set sort_order=8
 where type_code='veterinary_clinic' and group_code='working_models' and option_code='inpatient';
update public.organization_attribute_options set sort_order=9
 where type_code='veterinary_clinic' and group_code='working_models' and option_code='regular_clinic';
insert into public.organization_attribute_options(type_code,group_code,option_code,label_lt,sort_order) values
 ('veterinary_clinic','working_models','daytime_clinic','Dienos metu dirbanti klinika',1),
 ('veterinary_clinic','working_models','walk_in','Gyva eilė',4),
 ('veterinary_clinic','working_models','scheduled_patients','Registruoti pacientai',5),
 ('veterinary_clinic','working_models','night_shifts','Naktinės pamainos',7);

-- Replace only the request branch. Ownership, invoker ACL, admin independent
-- evidence, approved history, state calculation and capabilities stay unchanged.
-- CREATE OR REPLACE preserves the existing restricted owner and function ACL.
-- Reopen the same transaction-scoped ownership window used by the Stage5
-- foundation. Its final NO SET/INHERIT and no private CREATE state is restored
-- below. No API caller gets privileges, and a failure rolls the window back.
grant vetkarjera_organization_writer to postgres with inherit true,set true;
grant create on schema private to vetkarjera_organization_writer;
set local role vetkarjera_organization_writer;
create or replace function private.org_verification(action text,oid uuid,expected bigint,data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.org_actor(); c private.organization_controls; v private.organization_verification_cases;
 req private.organization_legal_change_requests; r private.organization_representative_details; scopeval text; cid uuid; decision text; begin
 if action in('resolve','legal_resolve','state') then
  if not private.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
  select * into c from private.organization_controls where organization_id=oid for update;
  if c.row_version is null or expected is null or c.row_version<>expected then raise exception 'Stale organization' using errcode='40001';end if;
 else perform private.org_lock(oid,expected,false);select * into c from private.organization_controls where organization_id=oid;end if;
 select * into r from private.organization_representative_details where organization_id=oid and ownership_revision=c.ownership_revision;
 if action='request' then
  perform private.org_require_keys(data,array['scope','method','reference']);
  if c.profile_state in('suspended','archived') then raise exception 'Read only' using errcode='42501';end if;
  scopeval:=private.org_text(data,'scope');
  if scopeval is null or scopeval not in('identity','representation') then raise exception 'Invalid scope' using errcode='22023';end if;
  -- Omitted evidence creates a legitimate pending review task. Legacy callers
  -- may still supply a complete real method/reference pair; partial/blank pairs fail.
  if data ?| array['method','reference'] then
   if private.org_text(data,'method') is null or private.org_text(data,'reference') is null then raise exception 'Complete method/reference pair required' using errcode='22023';end if;
  end if;
  update private.organization_verification_cases set status='cancelled',resolved_at=now() where organization_id=oid and scope=scopeval and status='pending';
  insert into private.organization_verification_cases(organization_id,scope,subject_user_id,requester,legal_revision,ownership_revision,representative_revision,method)
  values(oid,scopeval,case when scopeval='representation' then uid end,uid,c.legal_revision,
  case when scopeval='representation' then c.ownership_revision end,case when scopeval='representation' then r.representative_revision end,private.org_text(data,'method')) returning id into cid;
  if data ?| array['method','reference'] then
  insert into private.organization_verification_evidence(case_id,method,source_kind,reference,recorded_by)
  values(cid,private.org_text(data,'method'),'submitted_reference',private.org_text(data,'reference'),uid);
  end if;
  update private.organization_controls set identity_case_id=case when scopeval='identity' then cid else identity_case_id end,
   representation_case_id=case when scopeval='representation' then cid else representation_case_id end where organization_id=oid;
  perform private.org_audit(oid,'verification_requested');
 elsif action='resolve' then
  perform private.org_require_keys(data,array['case_id','decision','method','reference','reason']);
  select * into v from private.organization_verification_cases where id=(data->>'case_id')::uuid and organization_id=oid for update;
  decision:=private.org_text(data,'decision');
  if v.id is null or v.status not in('pending','needs_info') or decision is null or decision not in('approved','needs_info','cancelled') then raise exception 'Invalid review' using errcode='22023';end if;
  if v.requester=uid or v.subject_user_id=uid or private.org_owner(oid)=uid then raise exception 'Independent administrator required' using errcode='42501';end if;
  if v.legal_revision<>c.legal_revision or (v.scope='representation' and(v.subject_user_id is distinct from private.org_owner(oid) or v.ownership_revision<>c.ownership_revision or v.representative_revision<>r.representative_revision)) then raise exception 'Stale verification revision' using errcode='40001';end if;
  if decision='approved' then
   if private.org_text(data,'method') is null or private.org_text(data,'reference') is null then raise exception 'Independent reviewed evidence required' using errcode='22023';end if;
   insert into private.organization_verification_evidence(case_id,method,source_kind,reference,recorded_by)
   values(v.id,private.org_text(data,'method'),'independently_obtained',private.org_text(data,'reference'),uid);
  end if;
  update private.organization_verification_cases set status=decision,method=coalesce(private.org_text(data,'method'),method),reviewer=uid,resolved_at=now(),reason=private.org_text(data,'reason') where id=v.id;
  perform private.org_audit(oid,'verification_resolved',jsonb_build_object('decision',decision));
 elsif action='legal_request' then
  perform private.org_require_keys(data,array['legal_name','legal_form_code','legal_code']);
  if not private.org_can_edit(oid) then raise exception 'Read only organization' using errcode='42501';end if;
  if private.org_text(data,'legal_name') is null or not exists(select 1 from public.organization_legal_forms f where f.code=private.org_text(data,'legal_form_code') and f.is_active and(not f.requires_organization_code or private.org_text(data,'legal_code') is not null)) then raise exception 'Incomplete legal identity' using errcode='22023';end if;
  insert into private.organization_legal_change_requests(organization_id,requester,expected_legal_revision,expected_ownership_revision,proposed_legal_name,proposed_legal_form_code,proposed_legal_code)
  values(oid,uid,c.legal_revision,c.ownership_revision,private.org_text(data,'legal_name'),private.org_text(data,'legal_form_code'),private.org_text(data,'legal_code'));
  perform private.org_audit(oid,'legal_change_requested');
 elsif action='legal_resolve' then
  perform private.org_require_keys(data,array['request_id','decision','reason']);
  select * into req from private.organization_legal_change_requests where id=(data->>'request_id')::uuid and organization_id=oid for update;
  decision:=private.org_text(data,'decision');
  if req.id is null or req.status not in('pending','needs_info') or decision is null or decision not in('approved','rejected','needs_info','cancelled') then raise exception 'Invalid legal review' using errcode='22023';end if;
  if req.requester=uid or private.org_owner(oid)=uid then raise exception 'Independent administrator required' using errcode='42501';end if;
  if req.expected_legal_revision<>c.legal_revision or req.expected_ownership_revision<>c.ownership_revision then raise exception 'Stale legal request' using errcode='40001';end if;
  if decision='approved' then
   update private.organization_legal_details set legal_name=req.proposed_legal_name,legal_form_code=req.proposed_legal_form_code,legal_code=req.proposed_legal_code,updated_at=now() where organization_id=oid;
   update private.organization_controls set legal_revision=legal_revision+1,identity_case_id=null,representation_case_id=null where organization_id=oid;
  end if;
  update private.organization_legal_change_requests set status=decision,reviewer=uid,resolved_at=now(),reason=private.org_text(data,'reason') where id=req.id;
  perform private.org_audit(oid,'legal_change_resolved',jsonb_build_object('decision',decision));
 elsif action='state' then
  perform private.org_require_keys(data,array['state','reason']);
  decision:=private.org_text(data,'state');
  if decision is null or decision not in('suspended','archived','resume') or private.org_text(data,'reason') is null then raise exception 'State/reason required' using errcode='22023';end if;
  update private.organization_controls set profile_state=case when decision='resume' then 'draft' else decision end,
   suspended_at=case when decision='suspended' then now() end,archived_at=case when decision='archived' then now() end,state_reason=private.org_text(data,'reason') where organization_id=oid;
  perform private.org_audit(oid,'profile_state',jsonb_build_object('status',decision));
 else raise exception 'Invalid operation' using errcode='22023';end if;
 perform private.org_recalculate(oid);return private.org_context(oid);
end $$;

reset role;
revoke create on schema private from vetkarjera_organization_writer;
grant vetkarjera_organization_writer to postgres with inherit false,set false;
notify pgrst,'reload schema';
commit;
