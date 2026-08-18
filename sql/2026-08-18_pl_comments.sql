-- プライベートレッスン／イベントにもコメントを書けるようにする。
--
-- コメント用のテーブルは新しく作らず、今のcommentsテーブルに
-- 「どのレッスンへのコメントか」を表す列を1つ足すだけ。
-- comments.cypher_id はもともとNULLを許す作りなので、
-- サイファーへのコメントは cypher_id、レッスンへのコメントは lesson_id が入る。
--
-- 既存のコメントは lesson_id が空のまま＝今まで通りサイファーのコメントとして動く。
-- 失敗した場合: 列が増えないだけで、既存のコメントは無傷。
-- アプリ側はレッスンのコメント欄が常に空になる（サイファー側は今まで通り）。

alter table public.comments
  add column if not exists lesson_id uuid references public.private_lessons(id) on delete cascade;

-- レッスンごとにコメントを引く時に使う
create index if not exists comments_lesson_id_idx on public.comments (lesson_id);

-- 通知を作るトリガーを差し替える。
-- 今まではサイファーの主催者＋参加者にだけ通知していたので、
-- レッスンの場合は講師＋申込者に通知するように枝分かれさせる。
-- 通知の種類（'comment'）は今まで通りなので、CHECK制約はさわらない。
create or replace function public.bd_notify_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.cypher_id is not null then
    insert into notifications (user_id, cypher_id, actor_id, type)
    select t.uid, new.cypher_id, new.profile_id, 'comment'
      from (
        select organizer_id as uid from cyphers where id = new.cypher_id
        union
        select profile_id from participations where cypher_id = new.cypher_id
      ) t
     where t.uid <> new.profile_id;
  elsif new.lesson_id is not null then
    insert into notifications (user_id, lesson_id, actor_id, type)
    select t.uid, new.lesson_id, new.profile_id, 'comment'
      from (
        select organizer_id as uid from private_lessons where id = new.lesson_id
        union
        select profile_id from pl_participations where lesson_id = new.lesson_id
      ) t
     where t.uid <> new.profile_id;
  end if;
  return new;
end;
$$;

-- トリガー自体は今あるものをそのまま使う（念のため付け直し）
drop trigger if exists bd_trg_notify_comment on public.comments;
create trigger bd_trg_notify_comment
  after insert on public.comments
  for each row execute function public.bd_notify_comment();
