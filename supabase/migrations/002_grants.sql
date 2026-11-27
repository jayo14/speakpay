-- Explicit table grants so anon/authenticated (read + Realtime) and service_role (server writes)
-- work regardless of the project's default Postgres privileges.
grant usage on schema public to anon, authenticated, service_role;
grant select on table public.vault_profiles, public.audit_runs to anon, authenticated;
grant all privileges on table public.vault_profiles, public.audit_runs to service_role;
