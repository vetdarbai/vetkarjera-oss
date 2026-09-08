-- Stage 3: trusted account provisioning; no questionnaire persistence.
create function private.provision_auth_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare requested_role text := new.raw_user_meta_data ->> 'account_role';
begin
  -- Metadata is an untrusted signup choice, never an authorization claim.
  -- Validate once, copy into the protected profiles table, never sync updates.
  if requested_role is null or requested_role not in ('specialist', 'employer') then
    raise exception 'Invalid registration role' using errcode = '22023';
  end if;
  insert into public.profiles(id, role)
  values (new.id, requested_role::public.profile_role);
  return new;
end;
$$;
revoke all on function private.provision_auth_profile() from public, anon, authenticated;
create trigger on_auth_user_created
after insert on auth.users for each row execute function private.provision_auth_profile();

-- Supabase access JWTs can outlive sign-out. Private table reads must also
-- prove that the referenced Auth session still exists and email is confirmed.
create function private.has_active_session()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.sessions s
    join auth.users u on u.id = s.user_id
    where s.id::text = (select auth.jwt() ->> 'session_id')
      and s.user_id = (select auth.uid())
      and u.email_confirmed_at is not null
      and (s.not_after is null or s.not_after > now())
  );
$$;
revoke all on function private.has_active_session() from public, anon, authenticated;
grant execute on function private.has_active_session() to authenticated;

create policy profiles_require_active_session on public.profiles
as restrictive for all to authenticated
using ((select private.has_active_session())) with check ((select private.has_active_session()));
create policy specialist_require_active_session on public.specialist_profiles
as restrictive for all to authenticated
using ((select private.has_active_session())) with check ((select private.has_active_session()));
create policy employer_require_active_session on public.employer_profiles
as restrictive for all to authenticated
using ((select private.has_active_session())) with check ((select private.has_active_session()));
create policy organizations_require_active_session on public.organizations
as restrictive for all to authenticated
using ((select private.has_active_session())) with check ((select private.has_active_session()));
create policy jobs_require_active_session on public.jobs
as restrictive for all to authenticated
using ((select private.has_active_session())) with check ((select private.has_active_session()));

comment on function private.provision_auth_profile() is
'Only specialist/employer can self-register; admin requires a separate trusted database operation. No metadata updates can alter profiles.role.';
