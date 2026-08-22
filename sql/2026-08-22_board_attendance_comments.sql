-- 練習日程カードに「コメント」ボタンを追加できるようにする。
-- コメントは参加可否（○/△/×）と同じ表(community_board_attendances)の
-- 1ユーザー1行に一言コメント欄を足す形にする。
-- コメントだけ書いて○/△/×はまだ、というケースも許すため、statusをNOT NULLから外す
-- （既存の必須チェックは緩めるだけで、行やデータを消すものではない）。
-- Supabaseダッシュボードで手動適用してください

alter table public.community_board_attendances alter column status drop not null;
alter table public.community_board_attendances drop constraint if exists community_board_attendances_status_check;
alter table public.community_board_attendances add constraint community_board_attendances_status_check
  check (status is null or status in ('yes','maybe','no'));

alter table public.community_board_attendances add column if not exists comment text;
