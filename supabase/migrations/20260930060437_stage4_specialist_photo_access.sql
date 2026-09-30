-- Photo bytes are managed only by Storage API. No public bucket/readers.
begin;
set local lock_timeout='5s';
-- A narrow read helper uses existing owner/admin RLS and live-session semantics.
create function private.can_read_specialist_photo(object_name text) returns boolean
language sql stable security invoker set search_path='' as $$
 select private.has_active_session() and exists (
 select 1 from public.specialist_profiles p
 where object_name=p.user_id::text || '/profile.webp'
 and (p.user_id=auth.uid() or private.is_admin()))
$$;
revoke all on function private.can_read_specialist_photo(text) from public,anon;
grant execute on function private.can_read_specialist_photo(text) to authenticated;
-- Restrictive guards prevent any broader permissive policy from granting photo mutations.
create policy specialist_photo_read on storage.objects for select to authenticated
 using(bucket_id='specialist-profile-photos' and private.can_read_specialist_photo(name));
create policy specialist_photo_read_guard on storage.objects as restrictive for select to anon,authenticated
 using(bucket_id<>'specialist-profile-photos' or (private.can_read_specialist_photo(name)));
create policy specialist_photo_insert_guard on storage.objects as restrictive for insert to anon,authenticated
 with check(bucket_id<>'specialist-profile-photos');
create policy specialist_photo_update_guard on storage.objects as restrictive for update to anon,authenticated
 using(bucket_id<>'specialist-profile-photos') with check(bucket_id<>'specialist-profile-photos');
create policy specialist_photo_delete_guard on storage.objects as restrictive for delete to anon,authenticated
 using(bucket_id<>'specialist-profile-photos');
commit;
