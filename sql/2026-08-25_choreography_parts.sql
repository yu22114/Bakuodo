-- 練習日程の画面に「担当振付」タブを追加する。曲・パート名ごとに、
-- 担当するメンバー（複数可）を紐づけられるようにする。
-- 権限は練習日程と同じ：追加はそのカードを見られる人なら誰でも、編集・削除は掲示板の作成者だけ

create table if not exists public.community_board_choreography_parts (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.community_board_genre_cards(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.community_board_choreography_assignees (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.community_board_choreography_parts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (part_id, profile_id)
);

create index if not exists community_board_choreography_parts_card_idx on public.community_board_choreography_parts(card_id);
create index if not exists community_board_choreography_assignees_part_idx on public.community_board_choreography_assignees(part_id);

alter table public.community_board_choreography_parts enable row level security;
alter table public.community_board_choreography_assignees enable row level security;

-- パート：閲覧・追加はそのカードの練習日程を見られる人なら誰でも。編集・削除は掲示板の作成者だけ
create policy bd_community_board_choreography_parts_select on public.community_board_choreography_parts for select
  using (public.bd_can_view_card_schedules(card_id));
create policy bd_community_board_choreography_parts_insert on public.community_board_choreography_parts for insert
  with check (public.bd_can_view_card_schedules(card_id));
create policy bd_community_board_choreography_parts_update on public.community_board_choreography_parts for update
  using (exists (
    select 1 from public.community_board_genre_cards c join public.community_boards b on b.id = c.board_id
    where c.id = card_id and b.creator_id = auth.uid()
  ));
create policy bd_community_board_choreography_parts_delete on public.community_board_choreography_parts for delete
  using (exists (
    select 1 from public.community_board_genre_cards c join public.community_boards b on b.id = c.board_id
    where c.id = card_id and b.creator_id = auth.uid()
  ));

-- 担当者：閲覧・追加（パート作成時に一緒に登録）はそのカードを見られる人なら誰でも。
-- 削除（編集時の入れ替え含む）は作成者だけ
create policy bd_community_board_choreography_assignees_select on public.community_board_choreography_assignees for select
  using (exists (select 1 from public.community_board_choreography_parts p where p.id = part_id and public.bd_can_view_card_schedules(p.card_id)));
create policy bd_community_board_choreography_assignees_insert on public.community_board_choreography_assignees for insert
  with check (exists (select 1 from public.community_board_choreography_parts p where p.id = part_id and public.bd_can_view_card_schedules(p.card_id)));
create policy bd_community_board_choreography_assignees_delete on public.community_board_choreography_assignees for delete
  using (exists (
    select 1 from public.community_board_choreography_parts p
    join public.community_board_genre_cards c on c.id = p.card_id
    join public.community_boards b on b.id = c.board_id
    where p.id = part_id and b.creator_id = auth.uid()
  ));
