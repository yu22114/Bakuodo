-- ============================================================================
-- NUMBER（振付作品の投稿・参加）機能を追加する。
-- 中身はCYPHERとほぼ同じ形だが、最初のバージョンでは以下を持たない：
--   ・限定公開／参加承認制（誰でも見られる・誰でもすぐ参加できる）
--   ・参加/承認の通知
--   ・コメント
-- これらは必要になったら別ファイルで追加する（既存のcyphers関連は一切変更しない）。
--
-- 新しく作るテーブル：
--   numbers               … CYPHERの cyphers 相当
--   number_genres         … CYPHERの cypher_genres 相当（ジャンルの中間テーブル）
--   number_participations … CYPHERの participations 相当（参加者。承認制ではないのでstatus列は持たない）
-- ============================================================================

create table if not exists public.numbers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organizer_id uuid not null references public.profiles(id),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null,
  description text,
  max_members int,
  studio_fee int,
  created_at timestamptz not null default now()
);

create table if not exists public.number_genres (
  id uuid primary key default gen_random_uuid(),
  number_id uuid not null references public.numbers(id) on delete cascade,
  genre_id uuid not null references public.genres(id)
);

create table if not exists public.number_participations (
  id uuid primary key default gen_random_uuid(),
  number_id uuid not null references public.numbers(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (number_id, profile_id)
);

create index if not exists idx_number_genres_number_id on public.number_genres(number_id);
create index if not exists idx_number_participations_number_id on public.number_participations(number_id);

-- ============================================================================
-- 参加のルール強制（cyphers/participationsのbd_enforce_participation_insertと同じ考え方だが、
-- 承認制がないので status は扱わず、定員チェックだけ行う）
-- ============================================================================

create or replace function public.bd_enforce_number_participation_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n record;
  cnt int;
begin
  if auth.uid() is not null and new.profile_id <> auth.uid() then
    raise exception 'FORBIDDEN: 他人名義の参加は登録できません';
  end if;

  select max_members into n from numbers where id = new.number_id;
  if not found then
    raise exception 'NOT_FOUND: numberが存在しません';
  end if;

  if n.max_members is not null then
    perform pg_advisory_xact_lock(hashtext(new.number_id::text));
    select count(*) into cnt from number_participations where number_id = new.number_id;
    if cnt >= n.max_members then
      raise exception 'CAPACITY_FULL: 定員に達しています';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bd_trg_number_participation_insert on public.number_participations;
create trigger bd_trg_number_participation_insert
  before insert on public.number_participations
  for each row execute function public.bd_enforce_number_participation_insert();

-- 参加者数の集計ビュー（cypher_participant_countsと同じ考え方。承認制がないので全件をそのまま数える）
create or replace view public.number_participant_counts as
  select number_id, count(*)::int as participant_count
    from public.number_participations
   group by number_id;

grant select on public.number_participant_counts to anon, authenticated;

-- ============================================================================
-- RLS（cyphers/cypher_genres/participationsと同じ形）
-- ============================================================================

alter table public.numbers               enable row level security;
alter table public.number_genres         enable row level security;
alter table public.number_participations enable row level security;

drop policy if exists bd_numbers_select on public.numbers;
create policy bd_numbers_select on public.numbers for select using (true);
drop policy if exists bd_numbers_insert on public.numbers;
create policy bd_numbers_insert on public.numbers for insert with check (organizer_id = auth.uid());
drop policy if exists bd_numbers_update on public.numbers;
create policy bd_numbers_update on public.numbers for update using (organizer_id = auth.uid());
drop policy if exists bd_numbers_delete on public.numbers;
create policy bd_numbers_delete on public.numbers for delete using (organizer_id = auth.uid());

drop policy if exists bd_number_genres_select on public.number_genres;
create policy bd_number_genres_select on public.number_genres for select using (true);
drop policy if exists bd_number_genres_insert on public.number_genres;
create policy bd_number_genres_insert on public.number_genres for insert with check (
  exists (select 1 from numbers n where n.id = number_id and n.organizer_id = auth.uid())
);
drop policy if exists bd_number_genres_delete on public.number_genres;
create policy bd_number_genres_delete on public.number_genres for delete using (
  exists (select 1 from numbers n where n.id = number_id and n.organizer_id = auth.uid())
);

drop policy if exists bd_number_participations_select on public.number_participations;
create policy bd_number_participations_select on public.number_participations for select using (true);
drop policy if exists bd_number_participations_insert on public.number_participations;
create policy bd_number_participations_insert on public.number_participations for insert with check (profile_id = auth.uid());
drop policy if exists bd_number_participations_delete on public.number_participations;
create policy bd_number_participations_delete on public.number_participations for delete using (
  profile_id = auth.uid()
  or exists (select 1 from numbers n where n.id = number_id and n.organizer_id = auth.uid())
);
