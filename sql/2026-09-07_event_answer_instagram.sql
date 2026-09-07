-- EVENTの参加申請フォームで、電話番号の代わりにInstagramアカウントを答えてもらうようにする。
-- NUMBERの参加申請（number_participations）ですでに使っているanswer_instagramと同じ形の列を、
-- pl_participations（EVENT・LESSON共通のテーブル）にも追加するだけ。
-- 既存のanswer_phone列・過去に集まった回答は消さずにそのまま残す（主催者の閲覧画面はどちらも表示する）。

alter table public.pl_participations add column if not exists answer_instagram text;
