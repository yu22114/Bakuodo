-- ============================================================================
-- 「気になる」機能：EVENT・NUMBERに、参加とは別の軽いブックマークを付けられるようにする。
-- 「参加する」ほどの決意はないが後で見返したい人向け。CYPHER・LESSONは対象外。
-- ============================================================================

create table if not exists public.pl_saves (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.private_lessons(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (lesson_id, profile_id)
);

create table if not exists public.number_saves (
  id uuid primary key default gen_random_uuid(),
  number_id uuid not null references public.numbers(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (number_id, profile_id)
);

-- RLS（他の参加・ジャンルの中間テーブルと同じ形。閲覧は誰でも、書き込みは本人だけ）
alter table public.pl_saves     enable row level security;
alter table public.number_saves enable row level security;

drop policy if exists bd_pl_saves_select on public.pl_saves;
create policy bd_pl_saves_select on public.pl_saves for select using (true);
drop policy if exists bd_pl_saves_insert on public.pl_saves;
create policy bd_pl_saves_insert on public.pl_saves for insert with check (profile_id = auth.uid());
drop policy if exists bd_pl_saves_delete on public.pl_saves;
create policy bd_pl_saves_delete on public.pl_saves for delete using (profile_id = auth.uid());

drop policy if exists bd_number_saves_select on public.number_saves;
create policy bd_number_saves_select on public.number_saves for select using (true);
drop policy if exists bd_number_saves_insert on public.number_saves;
create policy bd_number_saves_insert on public.number_saves for insert with check (profile_id = auth.uid());
drop policy if exists bd_number_saves_delete on public.number_saves;
create policy bd_number_saves_delete on public.number_saves for delete using (profile_id = auth.uid());
