-- Owners may pause and resume their QR links. Expired is derived from expires_at.
drop trigger if exists urls_prevent_reenable on public.urls;
drop function if exists public.prevent_url_reenable();
