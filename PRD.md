# SIC QR Generator v1

## Problem Statement

People need a simple way to create QR codes that point to stable short SIC
links. Every scan must redirect to the configured destination and record a
visit. Each account must only be able to access its own QR codes and analytics.

## Solution

Build a Vercel-hosted web app at `sic-qr-gen.vercel.app`. Anyone can create an
account with Google and immediately create and manage their own QR codes. The
client communicates directly with Supabase; there is no application backend.

Each QR code encodes `https://sic-qr-gen.vercel.app/:url-id`, where `url-id` is a
unique, seven-character alphabetic code. A visit to that address records a raw
visit event, atomically increments the URL's view count, then temporarily
redirects to the original destination. Unknown, disabled, or expired codes
return HTTP 404.

## User Stories

1. As a new user, I want to create an account with Google, so that I can start creating QR codes without administrator approval.
2. As a signed-in user, I want to create a destination URL and QR code, so that I can distribute a scannable short link.
3. As a signed-in user, I want to view and manage only my own URLs, so that my QR codes remain private to my account.
4. As a signed-in user, I want each generated code to contain exactly seven alphabetic characters with mixed-case support and no digits, so that codes stay short and easy to use.
5. As a visitor, I want a QR code to resolve without signing in, so that I can reach its intended destination quickly.
6. As a visitor, I want a valid short link to temporarily redirect to its original URL, so that the destination can change without replacing printed QR codes.
7. As a visitor, I want an invalid, disabled, or expired short link to return 404, so that I do not land on an unsafe or misleading page.
8. As a QR-code owner, I want every successful resolution recorded, so that I can measure traffic to my QR codes.
9. As a user, I must not be able to view or modify another user's URLs or raw visit analytics, so that account data stays isolated.

## Implementation Decisions

- Use Supabase Auth with Google OAuth. Any Google account may sign up; there is no organization, domain, or administrator approval requirement.
- Email/password authentication remains disabled.
- Store each URL in `public.urls` with its opaque URL ID, owner ID, original URL, aggregate visit count, status, and optional expiration.
- Associate every URL directly with its creator through `owner_id`, referencing the authenticated user. There are no tenant, membership, admin, or URL-to-tenant mapping tables.
- Enable RLS on exposed tables. Authenticated users can create, read, update, and disable only rows whose `owner_id` matches their authenticated user ID.
- Do not expose raw visit events for anonymous access. Store them in an internal schema or protect them with RLS so only the owning user can read analytics for their URLs.
- Expose one narrowly scoped public URL-resolution RPC. It accepts one short code, verifies that the URL is active and unexpired, records a raw visit event, increments the aggregate counter atomically, and returns only the redirect destination. Its database authorization is enforced with RLS and carefully scoped RPC security.
- Do not allow anonymous direct inserts, updates, or deletes on URL or analytics tables. The public resolver is the only anonymous write path and only records a visit for a valid code.
- Implement `sic-qr-gen.vercel.app/:url-id` as a client route. It calls the resolution RPC and navigates the browser to the destination. This is browser navigation, not an HTTP 302 or 307 response.
- Do not implement visit counting as client read-then-write or a client-side upsert. The database operation must append the event and increment the counter in one transaction to avoid lost counts under concurrent traffic.
- Generate `url-id` values with exactly seven characters from `A-Z` and `a-z`, excluding digits. Enforce uniqueness in the database and retry generation only when a collision occurs.
- Validate destination URLs as absolute `https` URLs before storage. This prevents the resolver from becoming an open redirect to unsafe schemes.

## Testing Decisions

- Tests verify externally observable behavior and authorization outcomes, not query shape or private helper calls.
- Test that a new Google account can sign up and create a URL without administrator action.
- Test RLS with anonymous, owning-user, and non-owning-user identities.
- Test that an owner can create, view, update, and disable their URL but cannot read or modify another user's URL or analytics.
- Test that anonymous callers cannot list URLs or read visit events, while they can resolve a valid public code through the designated resolution operation.
- Test valid resolution creates exactly one visit event, increments the aggregate count once, and returns the configured destination.
- Test unknown, disabled, and expired codes return no destination and cause the redirect route to return HTTP 404 without incrementing a count.
- Test concurrent resolutions preserve every count increment and create the expected number of raw visit events.
- Test code generation accepts only seven alphabetic characters, preserves case sensitivity, rejects digits, and handles a database uniqueness collision.
- Test QR payload generation and temporary redirect status at the route level.

## Out of Scope

- Organizations, tenants, memberships, tenant roles, administrator tables, and an admin page.
- Email/password authentication, magic links, and authentication providers other than Google.
- Custom domains, branded redirect pages, QR styling, user-chosen aliases, bulk generation, and URL import/export.
- Destination URL safety scanning, rate limiting, bot filtering, and detailed analytics enrichment.

## Further Notes

- Vercel hosts both the authenticated management application and the public resolver route at `sic-qr-gen.vercel.app`.
- The architecture is client to Supabase. Edge Functions are out of the normal request path; introduce one only if a real HTTP redirect, server-side request metadata, or another capability that cannot run safely in the client is required.
- Public QR resolution does not mean public URL listings. Visitors can resolve a code but cannot enumerate every destination URL.
- Raw analytics should have a defined retention period and privacy policy before collecting IP addresses, user agents, referrers, location data, or any other personally identifying request metadata.
