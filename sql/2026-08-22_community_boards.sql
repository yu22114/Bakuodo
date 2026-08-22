-- 「コミュニティ」機能の作り直し：イベントの参加者一覧から掲示板を開くのではなく、
-- コミュニティ画面の「＋」ボタンでタイトルだけ入力して自由に掲示板を作れるようにする。
-- 前回作ったevent_board_postsは使わなくなるが、ルール通り消さずそのまま残す
-- Supabaseダッシュボードで手動適用してください

create table if not exists public.community_boards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.community_board_posts (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.community_boards(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists community_board_posts_board_idx on public.community_board_posts(board_id);

alter table public.community_boards      enable row level security;
alter table public.community_board_posts enable row level security;

-- 掲示板一覧・投稿は誰でも閲覧できる（コミュニティなので）。作成・投稿はログインしていれば誰でも。
-- 削除は作った本人だけ
create policy bd_community_boards_select on public.community_boards for select using (true);
create policy bd_community_boards_insert on public.community_boards for insert with check (creator_id = auth.uid());
create policy bd_community_boards_delete on public.community_boards for delete using (creator_id = auth.uid());

create policy bd_community_board_posts_select on public.community_board_posts for select using (true);
create policy bd_community_board_posts_insert on public.community_board_posts for insert with check (profile_id = auth.uid());
create policy bd_community_board_posts_delete on public.community_board_posts for delete using (profile_id = auth.uid());
