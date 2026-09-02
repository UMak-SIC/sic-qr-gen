-- SIC QR Generator data layer.
-- Raw visits live outside the exposed API schema so anonymous clients cannot
-- enumerate analytics or infer ownership from table responses.

create extension if not exists pgcrypto;

create schema if not exists private;

-- SECURITY DEFINER functions must never resolve attacker-created objects from
-- the exposed schema.
revoke create on schema public from public;

-- The private schema is deliberately inaccessible to API roles. SECURITY
-- DEFINER functions below are the only supported path to these events.
revoke all on schema private from public, anon, authenticated;

create table public.urls (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  url_id text collate "C" not null,
  name text not null default 'Untitled link',
  original_url text not null,
  view_count bigint not null default 0,
  status text not null default 'active',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint urls_url_id_format check (url_id ~ '^[A-Za-z]{7}$'),
  constraint urls_original_url_https check (
    original_url ~ '^https://[^/?#[:space:]]+([/?#].*)?$'
    and original_url !~ '[[:space:]]'
  ),
  constraint urls_view_count_nonnegative check (view_count >= 0),
  constraint urls_status_valid check (status in ('active', 'disabled'))
);

create or replace function private.generate_url_id()
returns text
language plpgsql
volatile
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  generated_id text;
  max_attempts constant integer := 10;
begin
  -- Serialize generation with the uniqueness check; the unique index remains
  -- the final database guarantee for any other insertion path.
  perform pg_advisory_xact_lock(hashtext('private.generate_url_id'));

  for attempt in 1..max_attempts loop
    select string_agg(
      substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', floor(random() * 52)::int + 1, 1),
      ''
    )
    into generated_id
    from generate_series(1, 7);

    if not exists (
      select 1 from public.urls where public.urls.url_id = generated_id
    ) then
      return generated_id;
    end if;
  end loop;

  raise exception 'could not generate a unique URL ID after % attempts', max_attempts;
end;
$$;

revoke all on function private.generate_url_id() from public, anon, authenticated;

-- A trigger invokes the private generator as the migration owner. This keeps
-- authenticated inserts working without granting API roles access to private.
create or replace function public.assign_url_id()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  new.url_id = private.generate_url_id();
  return new;
end;
$$;

revoke all on function public.assign_url_id() from public, anon, authenticated;

create trigger urls_assign_url_id
before insert on public.urls
for each row execute function public.assign_url_id();

-- C collation makes the uniqueness rule explicitly case-sensitive: AaBcDeF
-- and aabcdef are different IDs, while each still has exactly seven letters.
create unique index urls_url_id_unique on public.urls (url_id);
create index urls_owner_id_idx on public.urls (owner_id);

-- Column grants prevent authenticated callers from changing protected fields;
-- this trigger also prevents re-enabling a URL after it was disabled.
create or replace function public.prevent_url_reenable()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  if current_user in ('anon', 'authenticated')
     and old.status = 'disabled'
     and new.status <> 'disabled' then
    raise exception 'disabled URLs cannot be re-enabled';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_url_reenable() from public, anon, authenticated;

create trigger urls_prevent_reenable
before update on public.urls
for each row execute function public.prevent_url_reenable();

create table private.visit_events (
  id bigint generated always as identity primary key,
  url_id uuid not null references public.urls (id) on delete cascade,
  visited_at timestamptz not null default now()
);

-- Keep both schema and table privileges closed to API roles; functions run as
-- the database owner and do not require granting direct raw-event access.
revoke all on table private.visit_events from public, anon, authenticated;
revoke all on sequence private.visit_events_id_seq from public, anon, authenticated;

create index visit_events_url_id_visited_at_idx
  on private.visit_events (url_id, visited_at desc);

-- Defense in depth: even if private schema privileges are changed later, raw
-- event rows remain readable only when the caller owns the related URL.
alter table private.visit_events enable row level security;
create policy visit_events_owner_select on private.visit_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.urls
      where public.urls.id = private.visit_events.url_id
        and public.urls.owner_id = auth.uid()
    )
  );

-- Exposed URL rows are owner-only. In particular, anon receives no table
-- privileges, so a public resolver cannot be turned into a URL listing API.
alter table public.urls enable row level security;
revoke all on table public.urls from public, anon, authenticated;
-- Keep owner_id available to RLS policy evaluation, but never expose it in
-- authenticated row results. Anon has no direct table privileges.
grant select (
  id,
  url_id,
  name,
  original_url,
  view_count,
  status,
  expires_at,
  created_at,
  updated_at
) on table public.urls to authenticated;
grant delete on table public.urls to authenticated;
grant insert (name, original_url, expires_at) on table public.urls to authenticated;
grant update (name, original_url, expires_at, status) on table public.urls to authenticated;

create policy urls_owner_select on public.urls
  for select to authenticated
  using (owner_id = auth.uid());

create policy urls_owner_insert on public.urls
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy urls_owner_update on public.urls
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy urls_owner_delete on public.urls
  for delete to authenticated
  using (owner_id = auth.uid());

-- Keep updated_at useful without adding application-side write races.
create or replace function public.set_urls_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_urls_updated_at() from public, anon, authenticated;

create trigger urls_set_updated_at
before update on public.urls
for each row execute function public.set_urls_updated_at();

-- This is the only anonymous write path. The UPDATE locks the matching row;
-- the event insert and counter increment therefore commit or roll back as one
-- transaction, preserving counts under concurrent resolutions.
create or replace function public.resolve_url(p_url_id text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  resolved_url_id uuid;
  resolved_destination text;
begin
  update public.urls
  set view_count = view_count + 1
  where url_id = p_url_id
    and status = 'active'
    and (expires_at is null or expires_at > now())
  returning id, public.urls.original_url
  into resolved_url_id, resolved_destination;

  if not found then
    return null;
  end if;

  insert into private.visit_events (url_id)
  values (resolved_url_id);

  return resolved_destination;
end;
$$;

-- Do not expose the function to PUBLIC by default. Anon/authenticated may
-- resolve a known URL ID, but the return value contains only the destination.
revoke all on function public.resolve_url(text) from public;
grant execute on function public.resolve_url(text) to anon, authenticated;

-- Owner-only analytics accessor. It returns timestamps only and never exposes
-- owner_id or the private table itself. Non-owners get an empty result set.
create or replace function public.get_url_visits(p_url_id text)
returns table (visited_at timestamptz)
language sql
security definer
set search_path = pg_catalog, pg_temp
as $$
  select e.visited_at
  from private.visit_events e
  join public.urls u on u.id = e.url_id
  where u.url_id = p_url_id
    and u.owner_id = auth.uid()
  order by e.visited_at desc;
$$;

revoke all on function public.get_url_visits(text) from public, anon;
grant execute on function public.get_url_visits(text) to authenticated;

comment on table public.urls is
  'Owner-managed short URLs; anonymous access is limited to resolve_url(text).';
comment on table private.visit_events is
  'Internal raw visit events; no API-role table grants, accessed through owner-checked functions.';
comment on function public.resolve_url(text) is
  'Atomically resolves an active, unexpired url_id, records a visit, increments view_count, and returns the destination text directly.';
comment on function public.get_url_visits(text) is
  'Owner-only raw visit timestamps; intentionally not a direct private-table grant.';
