# Supabase Database

Apply the migration in `supabase/migrations/20260902000000_create_urls_and_resolution.sql`.

## API contract

- `public.urls` contains `id`, `owner_id`, `url_id`, `name`, `original_url`, `view_count`, `status`, `expires_at`, `created_at`, and `updated_at`.
- Authenticated clients can read the explicit non-owner columns (`id`, `url_id`, `name`, `original_url`, `view_count`, `status`, `expires_at`, `created_at`, and `updated_at`) and delete their own rows through RLS. `owner_id` remains available to policy evaluation but is excluded from SELECT results. Inserts may set only `name`, `original_url`, and `expires_at`; `id`, `owner_id`, `url_id`, `view_count`, `status`, `created_at`, and `updated_at` are database-controlled. Updates may edit `name`, `original_url`, and `expires_at`, or set `status` to `disabled`; protected columns cannot be written directly. Anonymous clients have no direct table privileges.
- Anonymous resolution calls `public.resolve_url(p_url_id)`. It returns a scalar `text` value containing only `original_url`, which matches the frontend RPC handling. Unknown, disabled, and expired IDs return `null`.
- Each successful resolution locks and updates one URL row, increments `view_count`, and inserts one private visit event in the same transaction.
- Owners read visit timestamps through `public.get_url_visits(p_url_id)`. Raw events are in `private.visit_events`, with schema/table access revoked from `public`, `anon`, and `authenticated`.

## Deploy caveats

- Run this migration before wiring the client to the RPC. The client must handle a `null` resolver response as HTTP 404 and perform the browser navigation itself.
- The migration enables `pgcrypto` for UUID generation and assumes the standard Supabase `auth.users` table exists.
- `url_id` is assigned by a database-owned insert trigger as exactly seven case-sensitive ASCII letters. Generation is serialized and capped at ten attempts; the unique index remains the final collision guarantee. API roles receive no private-schema access to invoke the generator directly.
- The HTTPS check enforces an absolute `https://` URL with a non-empty host and no whitespace. It is URL scheme/shape validation, not destination reputation or malware scanning.
- The current raw event retention is indefinite. Add a retention policy before collecting request metadata or shipping long-lived analytics.
