-- SpeakPay schema — PRD §7 (LOCKED). Apply with `pnpm db:push`.
-- No seed data: audit history must come from real runs only (AGENTS.md §3).

create extension if not exists "pgcrypto";

create table public.vault_profiles (
  vault_pda            text primary key,
  owner_pubkey         text not null unique,
  delegate_pubkey      text not null,
  max_per_tx_lamports  bigint not null,
  daily_cap_lamports   bigint not null,
  cooldown_secs        integer not null,
  allowlist            text[] not null default '{}',
  is_frozen            boolean not null default false,
  last_sync_signature  text,
  updated_at           timestamptz not null default now()
);

create table public.audit_runs (
  id                uuid primary key default gen_random_uuid(),
  vault_pda         text not null,
  client            text not null check (client in ('mobile','web','api')),
  kind              text not null check (kind in ('voice','rogue','freeze')),
  parent_run_id     uuid references public.audit_runs(id),  -- freeze row → its FREEZE_REQUESTED voice row
  transcript        text,
  intent            jsonb,
  target_url        text,
  scraped_json      jsonb,
  evidence_ts       bigint,
  evidence_hash     text check (evidence_hash ~ '^[0-9a-f]{64}$'),
  status            text not null check (status in
                      ('PASSED','INJECTION_BLOCKED','ONCHAIN_REJECTED','FROZEN',
                       'FREEZE_REQUESTED','PRECHECK_FAILED','ERROR')),
  error_code        text,
  error_number      integer,
  tx_signature      text unique,
  amount_lamports   bigint,
  recipient_pubkey  text,
  speech_text       text,
  timings_ms        jsonb,
  created_at        timestamptz not null default now()
);
create index audit_runs_vault_created_idx on public.audit_runs (vault_pda, created_at desc);

-- RLS: public read (demo transparency), writes only via service role (bypasses RLS)
alter table public.vault_profiles enable row level security;
alter table public.audit_runs     enable row level security;
create policy "public read vault_profiles" on public.vault_profiles for select using (true);
create policy "public read audit_runs"     on public.audit_runs     for select using (true);

-- Realtime
alter publication supabase_realtime add table public.audit_runs;
alter publication supabase_realtime add table public.vault_profiles;
