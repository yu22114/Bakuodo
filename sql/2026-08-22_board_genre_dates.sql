-- 掲示板作成フォームに「ジャンル」と「公演日程（カレンダーで2日まで選択）」を追加する。
-- 前回作った自由記述のevent_dateはもう使わないが、ルール通り消さずそのまま残す
-- Supabaseダッシュボードで手動適用してください

alter table public.community_boards add column if not exists genre text;
alter table public.community_boards add column if not exists event_start_date date;
alter table public.community_boards add column if not exists event_end_date date;
