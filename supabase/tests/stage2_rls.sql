-- Run as postgres using execute_sql/psql. All fixtures are rolled back.
-- No Auth API calls, emails, passwords or lasting test accounts.
begin;
select set_config('test.s1', gen_random_uuid()::text, true),
       set_config('test.s2', gen_random_uuid()::text, true),
       set_config('test.e1', gen_random_uuid()::text, true),
       set_config('test.e2', gen_random_uuid()::text, true),
       set_config('test.admin', gen_random_uuid()::text, true),
       set_config('test.o1', gen_random_uuid()::text, true),
       set_config('test.o2', gen_random_uuid()::text, true);
insert into auth.users(id)
  select current_setting(k)::uuid from unnest(array['test.s1','test.s2','test.e1','test.e2','test.admin']) k;
insert into public.profiles(id, role) values
  (current_setting('test.s1')::uuid, 'specialist'),
  (current_setting('test.s2')::uuid, 'specialist'),
  (current_setting('test.e1')::uuid, 'employer'),
  (current_setting('test.e2')::uuid, 'employer'),
  (current_setting('test.admin')::uuid, 'admin');
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
  'sub', current_setting('test.s1'), 'role', 'authenticated',
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
  'sub', current_setting('test.e1'), 'role', 'authenticated')::text, true);
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
  'sub', current_setting('test.admin'), 'role', 'authenticated')::text, true);
do $$ begin
  if not (select private.is_admin()) or
     (select count(*) from public.profiles) <> 5 or
     (select count(*) from public.specialist_profiles) <> 2 or
     (select count(*) from public.employer_profiles) <> 2 or
     (select count(*) from public.organizations) <> 2 or
     (select count(*) from public.jobs) <> 2 then
    raise exception 'FAIL: admin read access';
  end if;
  begin
    update public.profiles set role = 'admin';
    raise exception 'FAIL: admin browser can assign roles';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: isolation, ownership, membership, role escalation, anon, admin, timestamps and FK checks' as result;
rollback;
