-- 練習日程をジャンルごとのカードに分けて管理できるようにする。
-- 「ジャンルカードの中に練習日程を追加する」形にするため、日程1件ごとにジャンルを持たせる

alter table public.community_board_practice_schedules add column if not exists genre text;
