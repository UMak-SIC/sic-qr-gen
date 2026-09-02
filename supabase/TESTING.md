# Database Integration Tests

Unit tests cover client and resolver behavior, but not Supabase RLS, transactionality, URL-ID collision handling, or concurrent resolution. Those require a real Supabase project with the migration applied; run them as integration tests against a disposable environment before changing the database contract.
