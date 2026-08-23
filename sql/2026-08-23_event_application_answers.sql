-- EVENTへの参加申請時に、ダンサーネーム・メールアドレス・電話番号の入力を必須にする。
-- 回答の保存先はpl_participationsに列を追加する（レッスンの申込では使わない）
-- Supabaseダッシュボードで手動適用してください

alter table public.pl_participations add column if not exists answer_dancer_name text;
alter table public.pl_participations add column if not exists answer_email text;
alter table public.pl_participations add column if not exists answer_phone text;
