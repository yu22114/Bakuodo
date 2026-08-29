-- ============================================================================
-- NUMBERに「本番当日」を追加する。1つのNUMBERに対して本番の日程を
-- 複数（連続していなくてもよい）登録できるようにするため、既存のnumbersテーブルに
-- 列を足すのではなく、日程を1行ずつ持つ新しいテーブルを追加する
-- （cyphersに対するcypher_genresと同じ、1対多の中間テーブルの考え方）。
-- ============================================================================

create table if not exists public.number_performance_dates (
  id uuid primary key default gen_random_uuid(),
  number_id uuid not null references public.numbers(id) on delete cascade,
  event_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_number_performance_dates_number_id on public.number_performance_dates(number_id);

alter table public.number_performance_dates enable row level security;

-- 閲覧は誰でも、追加・削除はNUMBERの主催者のみ（number_genresと同じ形）
drop policy if exists bd_number_performance_dates_select on public.number_performance_dates;
create policy bd_number_performance_dates_select on public.number_performance_dates for select using (true);
drop policy if exists bd_number_performance_dates_insert on public.number_performance_dates;
create policy bd_number_performance_dates_insert on public.number_performance_dates for insert with check (
  exists (select 1 from numbers n where n.id = number_id and n.organizer_id = auth.uid())
);
drop policy if exists bd_number_performance_dates_delete on public.number_performance_dates;
create policy bd_number_performance_dates_delete on public.number_performance_dates for delete using (
  exists (select 1 from numbers n where n.id = number_id and n.organizer_id = auth.uid())
);
