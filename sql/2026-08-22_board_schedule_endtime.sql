-- 練習日程に終了時間を追加する。既存のpractice_time列はそのまま「開始時間」として使う
-- Supabaseダッシュボードで手動適用してください

alter table public.community_board_practice_schedules add column if not exists practice_end_time text;
