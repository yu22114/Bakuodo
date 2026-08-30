-- NUMBERの投稿に「募集期限」を設定できるようにする。
-- 期限を過ぎたら新規の参加受付を締め切る（想定練習期間そのものの終了とは別の概念）。
-- 既存の行はNULLのまま＝今まで通り期限なしとして扱われる

alter table public.numbers add column if not exists recruitment_deadline date;
