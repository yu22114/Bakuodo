-- NUMBERへの参加申請時に、EVENTと同じように必須項目を答えてもらえるようにする。
-- ただし項目はEVENT（ダンサーネーム・メール・電話番号）とは異なり、
-- ダンサーネーム・Instagramアカウントの2つだけ。
-- 回答の保存先はnumber_participationsに列を追加する

alter table public.number_participations add column if not exists answer_dancer_name text;
alter table public.number_participations add column if not exists answer_instagram text;
