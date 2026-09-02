alter table public.urls
  add column qr_foreground text not null default '#176b4f',
  add column qr_background text not null default '#f9f9ee',
  add column qr_logo_url text;

grant select (qr_foreground, qr_background, qr_logo_url) on table public.urls to authenticated;
grant insert (qr_foreground, qr_background, qr_logo_url) on table public.urls to authenticated;
grant update (qr_foreground, qr_background, qr_logo_url) on table public.urls to authenticated;

insert into storage.buckets (id, name, public)
values ('qr-logos', 'qr-logos', true)
on conflict (id) do update set public = true;

create policy qr_logo_owner_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'qr-logos' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy qr_logo_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'qr-logos' and (storage.foldername(name))[1] = (select auth.uid()::text));
