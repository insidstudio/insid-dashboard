-- Instagram Dashboard — Supabase Schema
-- Cole este SQL no Supabase: SQL Editor → New Query → colar → Run

create table if not exists accounts (
  id text primary key,
  label text,
  token text,
  user_id text,
  username text,
  profile_picture text,
  token_created timestamptz,
  created_at timestamptz default now()
);

create table if not exists snapshots (
  id serial primary key,
  account_id text not null,
  date date not null,
  days integer default 30,
  periodo jsonb,
  kpis jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_snapshots_account on snapshots (account_id, date);

-- Permitir acesso via anon key (cada aluno tem seu próprio projeto)
alter table accounts enable row level security;
alter table snapshots enable row level security;

create policy "allow_all_accounts" on accounts for all using (true) with check (true);
create policy "allow_all_snapshots" on snapshots for all using (true) with check (true);
