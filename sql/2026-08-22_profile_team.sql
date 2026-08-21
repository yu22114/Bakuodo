-- ダンサー設定に「チーム」欄を追加する。プロフィール画面のバッジ表示に使う
-- Supabaseダッシュボードで手動適用してください
alter table public.profiles add column if not exists team text;
