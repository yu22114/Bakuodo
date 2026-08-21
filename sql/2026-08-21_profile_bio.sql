-- ダンサー設定に「自己紹介」欄を追加する。プロフィール画面で名前の下に表示する
-- Supabaseダッシュボードで手動適用してください
alter table public.profiles add column if not exists bio text;
