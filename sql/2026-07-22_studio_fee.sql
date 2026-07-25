-- サイファーのスタジオ代（合計金額）を保存し、参加人数で割った金額をアプリ側で表示する
-- Supabaseダッシュボードで手動適用してください
alter table public.cyphers add column if not exists studio_fee numeric;
