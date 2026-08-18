-- EVENTタブ用。private_lessons に「これはレッスンか、イベントか」を表す列を1つ足すだけ。
-- 新しいテーブルは作らない＝RLS・トリガー・通知はレッスン用のものをそのまま使える。
--
-- 既存の行はすべて 'lesson' になる（デフォルト値が入る）ので、
-- 今あるプライベートレッスンの見え方は何も変わらない。
-- 失敗した場合: 列が増えないだけで、既存データは無傷。アプリ側は
-- kind が無いと EVENT タブが常に空になる（レッスン側は今まで通り動く）。

alter table public.private_lessons
  add column if not exists kind text not null default 'lesson';

-- 'lesson' か 'event' 以外が入らないようにする。
-- 同じ制約を二度足すとエラーになるので、いったん外してから付け直す
-- （既存のポリシーやトリガーの書き方と同じやり方）。
alter table public.private_lessons
  drop constraint if exists private_lessons_kind_check;
alter table public.private_lessons
  add constraint private_lessons_kind_check check (kind in ('lesson', 'event'));
