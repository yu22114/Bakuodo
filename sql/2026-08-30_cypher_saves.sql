-- ============================================================================
-- 「気になる」をCYPHER・LESSONにも広げる。
-- LESSONはEVENTと同じprivate_lessonsテーブルなので、既にあるpl_savesが
-- そのまま使える（アプリ側でisEvent限定のボタン表示をやめるだけ）。
-- CYPHERだけは専用テーブルが無いので、pl_saves・number_savesと同じ形で新しく作る。
-- ============================================================================

create table if not exists public.cypher_saves (
  id uuid primary key default gen_random_uuid(),
  cypher_id uuid not null references public.cyphers(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (cypher_id, profile_id)
);

alter table public.cypher_saves enable row level security;

drop policy if exists bd_cypher_saves_select on public.cypher_saves;
create policy bd_cypher_saves_select on public.cypher_saves for select using (true);
drop policy if exists bd_cypher_saves_insert on public.cypher_saves;
create policy bd_cypher_saves_insert on public.cypher_saves for insert with check (profile_id = auth.uid());
drop policy if exists bd_cypher_saves_delete on public.cypher_saves;
create policy bd_cypher_saves_delete on public.cypher_saves for delete using (profile_id = auth.uid());
