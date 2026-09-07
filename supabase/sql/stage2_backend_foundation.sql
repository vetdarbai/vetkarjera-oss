-- Stage 2 only. Apply once using Supabase apply_migration; record its version.
-- No signup trigger, business data, license number, or public job policy.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create type public.profile_role as enum ('specialist', 'employer', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.profile_role not null,
  created_at timestamptz not null default now()
);

create table public.specialist_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employer_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, organization_id)
);
create index employer_profiles_organization_id_idx on public.employer_profiles(organization_id);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (created_by, organization_id)
    references public.employer_profiles(user_id, organization_id) on delete restrict
);
create index jobs_organization_id_idx on public.jobs(organization_id);
create index jobs_created_by_organization_id_idx on public.jobs(created_by, organization_id);

-- Internal lookup avoids recursive profiles RLS. No user-editable JWT metadata.
-- This function is deliberately outside the exposed public schema.
create function private.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'::public.profile_role
  );
$$;
revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger specialist_profiles_updated_at before update on public.specialist_profiles
  for each row execute function private.set_updated_at();
create trigger employer_profiles_updated_at before update on public.employer_profiles
  for each row execute function private.set_updated_at();
create trigger organizations_updated_at before update on public.organizations
  for each row execute function private.set_updated_at();
create trigger jobs_updated_at before update on public.jobs
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.specialist_profiles enable row level security;
alter table public.employer_profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.jobs enable row level security;

-- Remove Supabase default grants, then grant only the operations needed now.
revoke all on public.profiles, public.specialist_profiles, public.employer_profiles,
  public.organizations, public.jobs from public, anon, authenticated;
grant select on public.profiles, public.specialist_profiles, public.employer_profiles,
  public.organizations, public.jobs to authenticated;
-- Anonymous connectivity probe returns zero rows: no anon SELECT policy exists.
grant select on public.jobs to anon;
-- No business/profile fields exist yet. Do not grant UPDATE on security columns.
grant update (updated_at) on public.specialist_profiles, public.employer_profiles to authenticated;
grant all on public.profiles, public.specialist_profiles, public.employer_profiles,
  public.organizations, public.jobs to service_role;

create policy profiles_read_own_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy specialist_profiles_read_own_or_admin on public.specialist_profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy specialist_profiles_update_own on public.specialist_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy employer_profiles_read_own_or_admin on public.employer_profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy employer_profiles_update_own on public.employer_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy organizations_read_member_or_admin on public.organizations
  for select to authenticated
  using (
    (select private.is_admin()) or id in (
      select organization_id from public.employer_profiles where user_id = (select auth.uid())
    )
  );
create policy jobs_read_member_or_admin on public.jobs
  for select to authenticated
  using (
    (select private.is_admin()) or organization_id in (
      select organization_id from public.employer_profiles where user_id = (select auth.uid())
    )
  );

comment on column public.profiles.role is 'Trusted provisioning only; never populated from user_metadata without validation.';
comment on column public.employer_profiles.organization_id is 'Trusted membership assignment only; users cannot change this relationship.';
comment on table public.specialist_profiles is 'Private profile shell. Future admin-only license data must use a separately protected table, not this owner-readable table.';
comment on table public.jobs is 'Structural shell only. No public rows until a later publication model and explicit anon policy are approved.';
