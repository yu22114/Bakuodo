-- ============================================================================
-- NUMBERにもコメントを書けるようにする。
--
-- 新しいテーブルは作らず、既存のcommentsテーブルに「どのNUMBERへのコメントか」を
-- 表す列を1つ足すだけ（サイファー=cypher_id、レッスン=lesson_id と同じやり方）。
-- comments の select/insert/delete のRLSポリシーは列を問わず動く作りなので、
-- ポリシー自体の変更は不要。
--
-- 通知は今回あえて作らない（NUMBERは最初から通知を持たない方針のまま）。
-- 失敗した場合: 列が増えないだけで、既存のコメントは無傷。
-- アプリ側はNUMBERのコメント欄が常に空になる（サイファー・レッスン側は今まで通り）。
-- ============================================================================

alter table public.comments
  add column if not exists number_id uuid references public.numbers(id) on delete cascade;

create index if not exists comments_number_id_idx on public.comments (number_id);
