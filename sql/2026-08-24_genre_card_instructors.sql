-- 練習カードの講師を複数人登録できるようにする（今までは1人分の列だけだった）。
-- community_board_instructors（掲示板本体の講師・今は未使用）と同じ考え方で、
-- 練習カード用に新しい表を作る。既存のinstructor_name/instructor_instagram列は
-- 消さずそのまま残す（古いカードの表示用）

create table if not exists public.community_board_genre_card_instructors (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.community_board_genre_cards(id) on delete cascade,
  name text not null,
  instagram text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists community_board_genre_card_instructors_card_idx on public.community_board_genre_card_instructors(card_id);

alter table public.community_board_genre_card_instructors enable row level security;

-- 閲覧は掲示板本体と同じ条件（作成者 or マイコミュニティに追加している人）
create policy bd_community_board_genre_card_instructors_select on public.community_board_genre_card_instructors for select
  using (exists (select 1 from public.community_board_genre_cards c where c.id = card_id and public.bd_can_view_board(c.board_id)));

-- 追加・削除できるのは、そのカードがある掲示板の作成者だけ
create policy bd_community_board_genre_card_instructors_insert on public.community_board_genre_card_instructors for insert
  with check (exists (
    select 1 from public.community_board_genre_cards c
    join public.community_boards b on b.id = c.board_id
    where c.id = card_id and b.creator_id = auth.uid()
  ));
create policy bd_community_board_genre_card_instructors_delete on public.community_board_genre_card_instructors for delete
  using (exists (
    select 1 from public.community_board_genre_cards c
    join public.community_boards b on b.id = c.board_id
    where c.id = card_id and b.creator_id = auth.uid()
  ));
