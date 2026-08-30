-- ============================================================================
-- NUMBERにも通知を足す（参加・キャンセル・コメント → 主催者・参加者へ）。
-- NUMBERは承認制を持たないので、CYPHER/LESSONにある join_request/join_approved
-- は使わず、join・leave・comment の3種類だけでよい（CHECK制約は既に
-- これらの値を許可済みなので変更不要）。
-- ============================================================================

-- 0. notificationsにNUMBERへの参照を追加
alter table public.notifications
  add column if not exists number_id uuid references public.numbers(id) on delete cascade;

-- 1. NUMBER参加 → 主催者へ
create or replace function public.bd_notify_number_participation_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org uuid;
begin
  select organizer_id into org from numbers where id = new.number_id;
  if org is not null and org <> new.profile_id then
    insert into notifications (user_id, number_id, actor_id, type)
    values (org, new.number_id, new.profile_id, 'join');
  end if;
  return new;
end;
$$;

drop trigger if exists bd_trg_notify_number_participation_insert on public.number_participations;
create trigger bd_trg_notify_number_participation_insert
  after insert on public.number_participations
  for each row execute function public.bd_notify_number_participation_insert();

-- 2. 本人によるNUMBER参加キャンセル → 主催者へ（主催者による削除等では発火しない）
create or replace function public.bd_notify_number_participation_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org uuid;
begin
  if auth.uid() is not null and auth.uid() = old.profile_id then
    select organizer_id into org from numbers where id = old.number_id;
    if org is not null and org <> old.profile_id then
      insert into notifications (user_id, number_id, actor_id, type)
      values (org, old.number_id, old.profile_id, 'leave');
    end if;
  end if;
  return old;
end;
$$;

drop trigger if exists bd_trg_notify_number_participation_delete on public.number_participations;
create trigger bd_trg_notify_number_participation_delete
  after delete on public.number_participations
  for each row execute function public.bd_notify_number_participation_delete();

-- 3. コメント通知トリガーにNUMBERの分岐を追加する（CYPHER・LESSONの分岐はそのまま維持）。
--    sql/2026-08-18_pl_comments.sql で作った関数を、NUMBER分岐を足して丸ごと置き換える
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
  elsif new.number_id is not null then
    insert into notifications (user_id, number_id, actor_id, type)
    select t.uid, new.number_id, new.profile_id, 'comment'
      from (
        select organizer_id as uid from numbers where id = new.number_id
        union
        select profile_id from number_participations where number_id = new.number_id
      ) t
     where t.uid <> new.profile_id;
  end if;
  return new;
end;
$$;

drop trigger if exists bd_trg_notify_comment on public.comments;
create trigger bd_trg_notify_comment
  after insert on public.comments
  for each row execute function public.bd_notify_comment();
