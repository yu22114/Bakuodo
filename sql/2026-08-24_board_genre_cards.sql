-- 練習日程を分ける「カード」を、固定のジャンル一覧ではなく、
-- 作成者がタイトルを入力して自由に作れるようにする。

create table if not exists public.community_board_genre_cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.community_boards(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists community_board_genre_cards_board_idx on public.community_board_genre_cards(board_id);

alter table public.community_board_genre_cards enable row level security;

-- 閲覧は掲示板本体と同じ条件（作成者 or マイコミュニティに追加している人）に揃える
create policy bd_community_board_genre_cards_select on public.community_board_genre_cards for select
  using (public.bd_can_view_board(board_id));
-- 追加・削除できるのは掲示板の作成者だけ
create policy bd_community_board_genre_cards_insert on public.community_board_genre_cards for insert
  with check (exists (select 1 from public.community_boards b where b.id = board_id and b.creator_id = auth.uid()));
create policy bd_community_board_genre_cards_delete on public.community_board_genre_cards for delete
  using (exists (select 1 from public.community_boards b where b.id = board_id and b.creator_id = auth.uid()));

-- 練習日程はこのカードに紐づける。カードを削除したら中の日程も一緒に消える。
-- 既存のgenre列（固定ジャンルだった頃の名残）は消さずそのまま残す
alter table public.community_board_practice_schedules
  add column if not exists card_id uuid references public.community_board_genre_cards(id) on delete cascade;

create index if not exists community_board_practice_schedules_card_idx on public.community_board_practice_schedules(card_id);
