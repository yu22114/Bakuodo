-- NUMBERの参加申請フォームに、メールアドレスの入力欄を追加する。
-- EVENT・LESSON側（pl_participations）と同じ考え方で、number_participationsにも列を1つ足すだけ。

alter table public.number_participations add column if not exists answer_email text;
