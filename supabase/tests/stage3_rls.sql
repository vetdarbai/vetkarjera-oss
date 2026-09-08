-- Run as postgres using execute_sql/psql. All fixtures are rolled back.
-- No Auth API calls, emails, passwords or lasting test accounts.
begin;
select set_config('test.baseline_profiles', (select count(*)::text from public.profiles), true),
 set_config('test.baseline_specialists', (select count(*)::text from public.specialist_profiles), true),
 set_config('test.baseline_employers', (select count(*)::text from public.employer_profiles), true),
 set_config('test.baseline_organizations', (select count(*)::text from public.organizations), true),
 set_config('test.baseline_jobs', (select count(*)::text from public.jobs), true);
select set_config('test.s1', gen_random_uuid()::text, true),
       set_config('test.s2', gen_random_uuid()::text, true),
       set_config('test.e1', gen_random_uuid()::text, true),
       set_config('test.e2', gen_random_uuid()::text, true),
       set_config('test.admin', gen_random_uuid()::text, true),
       set_config('test.o1', gen_random_uuid()::text, true),
       set_config('test.o2', gen_random_uuid()::text, true);
insert into auth.users(id, raw_user_meta_data, email_confirmed_at)
  select current_setting(k)::uuid,
    jsonb_build_object('account_role', case when k in ('test.e1','test.e2') then 'employer' else 'specialist' end),
    now()
  from unnest(array['test.s1','test.s2','test.e1','test.e2','test.admin']) k;
-- Administrative assignment only in this rolled-back postgres test fixture.
update public.profiles set role = 'admin' where id = current_setting('test.admin')::uuid;
insert into auth.sessions(id, user_id, created_at, updated_at)
  select current_setting(k)::uuid, current_setting(k)::uuid, now(), now()
  from unnest(array['test.s1','test.s2','test.e1','test.e2','test.admin']) k;
insert into public.specialist_profiles(user_id) values
  (current_setting('test.s1')::uuid), (current_setting('test.s2')::uuid);
insert into public.organizations(id, name) values
  (current_setting('test.o1')::uuid, 'RLS fixture A'),
  (current_setting('test.o2')::uuid, 'RLS fixture B');
insert into public.employer_profiles(user_id, organization_id) values
  (current_setting('test.e1')::uuid, current_setting('test.o1')::uuid),
  (current_setting('test.e2')::uuid, current_setting('test.o2')::uuid);
insert into public.jobs(organization_id, created_by) values
  (current_setting('test.o1')::uuid, current_setting('test.e1')::uuid),
  (current_setting('test.o2')::uuid, current_setting('test.e2')::uuid);

do $$ begin
  begin
    insert into public.jobs(organization_id, created_by)
      values (current_setting('test.o2')::uuid, current_setting('test.e1')::uuid);
    raise exception 'FAIL: cross-organization creator accepted';
  exception when foreign_key_violation then null; end;
end $$;

set local role anon;
do $$ begin
  if (select count(*) from public.jobs) <> 0 then raise exception 'FAIL: anon reads jobs'; end if;
  begin
    perform * from public.profiles;
    raise exception 'FAIL: anon reads profiles';
  exception when insufficient_privilege then null; end;
  begin
    perform private.is_admin();
    raise exception 'FAIL: anon invokes admin lookup';
  exception when insufficient_privilege then null; end;
end $$;

set local role authenticated;
-- An authenticated request without a subject must see nothing.
select set_config('request.jwt.claims', '{}', true);
do $$ begin
  if (select count(*) from public.profiles) <> 0 or (select private.is_admin()) then
    raise exception 'FAIL: missing subject grants access';
  end if;
end $$;
-- User-editable metadata must never confer admin privileges.
select set_config('request.jwt.claims', json_build_object(
  'sub', current_setting('test.s1'), 'session_id', current_setting('test.s1'), 'role', 'authenticated',
  'user_metadata', json_build_object('role', 'admin'))::text, true);
do $$ declare affected integer; begin
  if (select private.is_admin()) then raise exception 'FAIL: user metadata escalates role'; end if;
  if (select count(*) from public.profiles) <> 1 or
     (select count(*) from public.specialist_profiles) <> 1 or
     (select count(*) from public.employer_profiles) <> 0 or
     (select count(*) from public.organizations) <> 0 or
     (select count(*) from public.jobs) <> 0 then
    raise exception 'FAIL: specialist isolation';
  end if;
  update public.specialist_profiles set updated_at = '2000-01-01';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'FAIL: own specialist update'; end if;
  if exists(select 1 from public.specialist_profiles where updated_at = '2000-01-01') then
    raise exception 'FAIL: timestamp trigger';
  end if;
  update public.specialist_profiles set updated_at = now() where user_id = current_setting('test.s2')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: other specialist update'; end if;
  begin
    update public.profiles set role = 'admin' where id = (select auth.uid());
    raise exception 'FAIL: role escalation';
  exception when insufficient_privilege then null; end;
  begin
    update public.specialist_profiles set user_id = current_setting('test.s2')::uuid;
    raise exception 'FAIL: profile reassignment';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.profiles(id, role) values (gen_random_uuid(), 'admin');
    raise exception 'FAIL: profile self-provisioning';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims', json_build_object(
  'sub', current_setting('test.e1'), 'session_id', current_setting('test.e1'), 'role', 'authenticated')::text, true);
do $$ declare affected integer; begin
  if (select count(*) from public.profiles) <> 1 or
     (select count(*) from public.specialist_profiles) <> 0 or
     (select count(*) from public.employer_profiles) <> 1 or
     (select count(*) from public.organizations) <> 1 or
     (select count(*) from public.jobs) <> 1 then
    raise exception 'FAIL: employer isolation';
  end if;
  if exists(select 1 from public.organizations where id <> current_setting('test.o1')::uuid) or
     exists(select 1 from public.jobs where organization_id <> current_setting('test.o1')::uuid) then
    raise exception 'FAIL: wrong organization access';
  end if;
  update public.employer_profiles set updated_at = now();
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'FAIL: own employer update'; end if;
  begin
    update public.employer_profiles set organization_id = current_setting('test.o2')::uuid;
    raise exception 'FAIL: organization reassignment';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.jobs(organization_id, created_by)
      values (current_setting('test.o1')::uuid, current_setting('test.e1')::uuid);
    raise exception 'FAIL: job creation enabled';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.employer_profiles where user_id = (select auth.uid());
    raise exception 'FAIL: membership deletion enabled';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims', json_build_object(
  'sub', current_setting('test.admin'), 'session_id', current_setting('test.admin'), 'role', 'authenticated')::text, true);
do $$ begin
  if not (select private.is_admin()) or
     (select count(*) from public.profiles) <> 5 + current_setting('test.baseline_profiles')::integer or
     (select count(*) from public.specialist_profiles) <> 2 + current_setting('test.baseline_specialists')::integer or
     (select count(*) from public.employer_profiles) <> 2 + current_setting('test.baseline_employers')::integer or
     (select count(*) from public.organizations) <> 2 + current_setting('test.baseline_organizations')::integer or
     (select count(*) from public.jobs) <> 2 + current_setting('test.baseline_jobs')::integer then
    raise exception 'FAIL: admin read access';
  end if;
  begin
    update public.profiles set role = 'admin';
    raise exception 'FAIL: admin browser can assign roles';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Direct signup role tampering must be rejected by the database itself.
do $$ begin
  begin
    insert into auth.users(id, raw_user_meta_data) values (gen_random_uuid(), '{"account_role":"admin"}');
    raise exception 'FAIL: signup admin accepted';
  exception when invalid_parameter_value then null; end;
  begin
    insert into auth.users(id, raw_user_meta_data) values (gen_random_uuid(), '{}');
    raise exception 'FAIL: missing signup role accepted';
  exception when invalid_parameter_value then null; end;
end $$;
update auth.users set raw_user_meta_data = '{"account_role":"admin","role":"admin"}'
  where id = current_setting('test.s1')::uuid;
do $$ begin
  if (select role from public.profiles where id=current_setting('test.s1')::uuid) <> 'specialist' then
    raise exception 'FAIL: metadata changed protected role';
  end if;
end $$;
select set_config('request.jwt.claims', json_build_object('sub',current_setting('test.s1'),'session_id',current_setting('test.s1'),'role','authenticated')::text,true);
update auth.users set email_confirmed_at = null where id=current_setting('test.s1')::uuid;
set local role authenticated;
do $$ begin
  if (select count(*) from public.profiles) <> 0 or (select private.has_active_session()) then
    raise exception 'FAIL: unverified account reads private data';
  end if;
end $$;
reset role;
update auth.users set email_confirmed_at = now() where id=current_setting('test.s1')::uuid;
delete from auth.sessions where id=current_setting('test.s1')::uuid;
set local role authenticated;
do $$ begin
  if (select count(*) from public.profiles) <> 0 or (select count(*) from public.specialist_profiles) <> 0
     or (select private.has_active_session()) then
    raise exception 'FAIL: revoked session still has private access';
  end if;
end $$;
reset role;
select 'PASS: provisioning, rejected admin signup, immutable role, confirmed email, revoked session; isolation, ownership, membership, role escalation, anon, admin, timestamps and FK checks' as result;
rollback;
