-- ダンサー設定に「プレイリスト」欄（Apple Music / Spotify等のURL）を追加する
-- Supabaseダッシュボードで手動適用してください
alter table public.profiles add column if not exists playlist_url text;
