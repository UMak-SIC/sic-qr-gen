create or replace function public.delete_url(p_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  delete from public.urls
  where id = p_id
    and owner_id = auth.uid();
end;
$$;

revoke all on function public.delete_url(uuid) from public, anon;
grant execute on function public.delete_url(uuid) to authenticated;
revoke delete on table public.urls from authenticated;
