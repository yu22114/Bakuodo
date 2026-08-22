-- 掲示板作成フォームに項目を追加する：サブタイトル・公演日程・公演会場（community_boardsに列を追加）、
-- 講師（複数名・各自Instagramを紐づけ可）は1対多になるため新しい表を作る
-- Supabaseダッシュボードで手動適用してください

alter table public.community_boards add column if not exists subtitle text;
alter table public.community_boards add column if not exists event_date text; -- 公演日程（複数日・時間帯など自由記述のためtext）
alter table public.community_boards add column if not exists venue text; -- 公演会場

create table if not exists public.community_board_instructors (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.community_boards(id) on delete cascade,
  name text not null,
  instagram text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists community_board_instructors_board_idx on public.community_board_instructors(board_id);

alter table public.community_board_instructors enable row level security;

-- 閲覧は誰でも。追加・削除はその掲示板を作った本人だけ
create policy bd_community_board_instructors_select on public.community_board_instructors for select using (true);
create policy bd_community_board_instructors_insert on public.community_board_instructors for insert
  with check (exists (select 1 from public.community_boards b where b.id = board_id and b.creator_id = auth.uid()));
create policy bd_community_board_instructors_delete on public.community_board_instructors for delete
  using (exists (select 1 from public.community_boards b where b.id = board_id and b.creator_id = auth.uid()));
