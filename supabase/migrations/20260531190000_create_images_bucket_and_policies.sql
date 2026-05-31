-- =====================================================
-- Migration: Configure images storage bucket and policies
-- =====================================================
-- Purpose:
--   - Create storage bucket `images` for offer photos
--   - Enforce maximum file size: 5 MB
--   - Allow public read access for published offer images
--   - Restrict write/delete access to offer owners
-- =====================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('images', 'images', true, 5242880)
on conflict (id)
do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- Reset policies to keep migration idempotent across environments.
drop policy if exists "images_public_read" on storage.objects;
drop policy if exists "images_insert_organizer" on storage.objects;
drop policy if exists "images_update_organizer" on storage.objects;
drop policy if exists "images_delete_organizer" on storage.objects;

create policy "images_public_read" on storage.objects
for select
to public
using (bucket_id = 'images');

create policy "images_insert_organizer" on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and split_part(name, '/', 1) = 'offers'
  and exists (
    select 1
    from public.offers
    where offers.id::text = split_part(storage.objects.name, '/', 2)
      and offers.user_id = auth.uid()
      and offers.deleted_at is null
  )
);

create policy "images_update_organizer" on storage.objects
for update
to authenticated
using (
  bucket_id = 'images'
  and split_part(name, '/', 1) = 'offers'
  and exists (
    select 1
    from public.offers
    where offers.id::text = split_part(storage.objects.name, '/', 2)
      and offers.user_id = auth.uid()
      and offers.deleted_at is null
  )
)
with check (
  bucket_id = 'images'
  and split_part(name, '/', 1) = 'offers'
  and exists (
    select 1
    from public.offers
    where offers.id::text = split_part(storage.objects.name, '/', 2)
      and offers.user_id = auth.uid()
      and offers.deleted_at is null
  )
);

create policy "images_delete_organizer" on storage.objects
for delete
to authenticated
using (
  bucket_id = 'images'
  and split_part(name, '/', 1) = 'offers'
  and exists (
    select 1
    from public.offers
    where offers.id::text = split_part(storage.objects.name, '/', 2)
      and offers.user_id = auth.uid()
      and offers.deleted_at is null
  )
);
