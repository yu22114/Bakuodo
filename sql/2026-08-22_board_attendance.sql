-- BOARD画面に「メンバー」欄（作成者＋招待された人）と、練習日程ごとの
-- 参加可否（○/△/×）を追加する。
--
-- 1. メンバー一覧を全員が見られるように、community_board_invitesの閲覧ポリシーを
--    「作成者だけ」から「その掲示板を見られる人なら誰でも」に広げる（既存ポリシーの張り替え）。
-- 2. 練習日程ごとの回答（○/△/×）を保存する新しい表を作る。
-- Supabaseダッシュボードで手動適用してください

-- 1. メンバー一覧を全員が見られるようにする
drop policy if exists bd_community_board_invites_select on public.community_board_invites;
create policy bd_community_board_invites_select on public.community_board_invites for select
  using (public.bd_can_view_board(board_id));

-- 2. 参加可否（○=yes/△=maybe/×=no）を練習日程・ユーザーごとに1件保存する
create table if not exists public.community_board_attendances (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.community_board_practice_schedules(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('yes','maybe','no')),
  updated_at timestamptz not null default now(),
  unique (schedule_id, user_id)
);

create index if not exists community_board_attendances_schedule_idx on public.community_board_attendances(schedule_id);

alter table public.community_board_attendances enable row level security;

-- 閲覧：その掲示板を見られる人なら誰でも（誰が○/△/×を押したか全員が見られるようにするため）
create policy bd_community_board_attendances_select on public.community_board_attendances for select
  using (exists (select 1 from public.community_board_practice_schedules s where s.id = schedule_id and public.bd_can_view_board(s.board_id)));

-- 追加・更新・削除は本人の回答だけ（その掲示板を見られる人限定）
create policy bd_community_board_attendances_insert on public.community_board_attendances for insert
  with check (user_id = auth.uid() and exists (select 1 from public.community_board_practice_schedules s where s.id = schedule_id and public.bd_can_view_board(s.board_id)));
create policy bd_community_board_attendances_update on public.community_board_attendances for update
  using (user_id = auth.uid());
create policy bd_community_board_attendances_delete on public.community_board_attendances for delete
  using (user_id = auth.uid());
