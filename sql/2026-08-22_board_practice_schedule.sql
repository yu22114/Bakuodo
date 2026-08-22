-- 練習内容カードに「練習日程を追加」ボタンを付けるため、日程（日付・時間・場所）を
-- 複数件登録できる新しい表を作る。閲覧は誰でも、追加・削除はその掲示板の作成者だけ
-- Supabaseダッシュボードで手動適用してください

create table if not exists public.community_board_practice_schedules (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.community_boards(id) on delete cascade,
  practice_date date not null,
  practice_time text, -- 例: "19:00"（任意）
  place text, -- 練習場所（任意）
  created_at timestamptz not null default now()
);

create index if not exists community_board_practice_schedules_board_idx on public.community_board_practice_schedules(board_id);

alter table public.community_board_practice_schedules enable row level security;

create policy bd_community_board_practice_schedules_select on public.community_board_practice_schedules for select using (true);
create policy bd_community_board_practice_schedules_insert on public.community_board_practice_schedules for insert
  with check (exists (select 1 from public.community_boards b where b.id = board_id and b.creator_id = auth.uid()));
create policy bd_community_board_practice_schedules_delete on public.community_board_practice_schedules for delete
  using (exists (select 1 from public.community_boards b where b.id = board_id and b.creator_id = auth.uid()));
