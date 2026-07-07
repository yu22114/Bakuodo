-- ============================================================================
-- 爆踊 セキュリティ強化 (2026-07-07)
--
-- 適用方法: Supabase Dashboard > SQL Editor に全文を貼り付けて Run。
--
-- ★適用の順番が重要★
--   1. まずこのSQLを実行する
--   2. その後にアプリの新コードをデプロイする
--   （逆にすると、SQL適用までの間だけ通知が作成されなくなります）
--
-- 背景: クライアントは anon キーで直接テーブルに書き込むため、
--       「定員チェック」「承認制のstatus」「通知の宛先」をクライアントで
--       決めている限り、APIを直接叩けばすべて偽装できる。
--       → 整合性ルールをすべてDB（トリガー＋RLS）に移す。
--
-- 内容:
--   1. 参加行のルール強制トリガー（なりすまし・status偽装・定員超過の防止）
--   2. 通知の自動作成トリガー（クライアントからの通知INSERTは全廃）
--   3. フォロー行のルール強制トリガー
--   4. RLSベースライン（全テーブルでRLS有効化＋アプリの実アクセスに合わせた
--      ポリシー。既存ポリシーがあっても bd_ プレフィックスで共存可）
--   5. 参加者数の集計ビュー（participations全件取得の廃止用）
--   6. 限定公開サイファーをDBレベルで隠すRESTRICTIVEポリシー
--   おまけ: notifications.lesson_id を追加し、レッスンの参加申請を
--           承認できるようにした（これまで承認UIが機能していなかった）
-- ============================================================================


-- ============================================================================
-- 0. 事前準備: notifications にレッスンへの参照を追加
--    （これまでレッスンの参加申請通知はどのレッスンか分からず、承認UIが
--      機能していなかった。レッスン削除時は通知ごと消す）
-- ============================================================================

alter table public.notifications
  add column if not exists lesson_id uuid references public.private_lessons(id) on delete cascade;


-- ============================================================================
-- 1. 参加行のルール強制（cyphers / private_lessons 共通の考え方）
--    - profile_id は本人のみ（サービスロール・SQLエディタは auth.uid() が
--      NULL なので素通し）
--    - status はクライアントの申告を無視して DB が決める
--    - 定員は advisory lock で直列化してからカウント
-- ============================================================================

create or replace function public.bd_enforce_participation_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  approved_count int;
begin
  if auth.uid() is not null and new.profile_id <> auth.uid() then
    raise exception 'FORBIDDEN: 他人名義の参加は登録できません';
  end if;

  select organizer_id, max_members, requires_approval
    into c from cyphers where id = new.cypher_id;
  if not found then
    raise exception 'NOT_FOUND: サイファーが存在しません';
  end if;

  -- 承認制なら pending に強制（主催者本人は即 approved）
  if c.requires_approval and new.profile_id <> c.organizer_id then
    new.status := 'pending';
  else
    new.status := 'approved';
  end if;

  if c.max_members is not null and new.status = 'approved' then
    perform pg_advisory_xact_lock(hashtext(new.cypher_id::text));
    select count(*) into approved_count
      from participations
     where cypher_id = new.cypher_id and status = 'approved';
    if approved_count >= c.max_members then
      raise exception 'CAPACITY_FULL: 定員に達しています';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bd_trg_participation_insert on public.participations;
create trigger bd_trg_participation_insert
  before insert on public.participations
  for each row execute function public.bd_enforce_participation_insert();


-- 承認（pending → approved）は主催者のみ。承認時も定員を確認する。
create or replace function public.bd_enforce_participation_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  approved_count int;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    select organizer_id, max_members into c from cyphers where id = new.cypher_id;
    if auth.uid() is not null and auth.uid() <> c.organizer_id then
      raise exception 'FORBIDDEN: 承認できるのは主催者のみです';
    end if;
    if c.max_members is not null then
      perform pg_advisory_xact_lock(hashtext(new.cypher_id::text));
      select count(*) into approved_count
        from participations
       where cypher_id = new.cypher_id and status = 'approved' and id <> new.id;
      if approved_count >= c.max_members then
        raise exception 'CAPACITY_FULL: 定員に達しています';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bd_trg_participation_update on public.participations;
create trigger bd_trg_participation_update
  before update on public.participations
  for each row execute function public.bd_enforce_participation_update();


-- private_lessons 用（構造は同じ。テーブル名と列名だけ違う）
create or replace function public.bd_enforce_pl_participation_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  l record;
  approved_count int;
begin
  if auth.uid() is not null and new.profile_id <> auth.uid() then
    raise exception 'FORBIDDEN: 他人名義の参加は登録できません';
  end if;

  select organizer_id, max_members, requires_approval
    into l from private_lessons where id = new.lesson_id;
  if not found then
    raise exception 'NOT_FOUND: レッスンが存在しません';
  end if;

  if l.requires_approval and new.profile_id <> l.organizer_id then
    new.status := 'pending';
  else
    new.status := 'approved';
  end if;

  if l.max_members is not null and new.status = 'approved' then
    perform pg_advisory_xact_lock(hashtext(new.lesson_id::text));
    select count(*) into approved_count
      from pl_participations
     where lesson_id = new.lesson_id and status = 'approved';
    if approved_count >= l.max_members then
      raise exception 'CAPACITY_FULL: 定員に達しています';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bd_trg_pl_participation_insert on public.pl_participations;
create trigger bd_trg_pl_participation_insert
  before insert on public.pl_participations
  for each row execute function public.bd_enforce_pl_participation_insert();


create or replace function public.bd_enforce_pl_participation_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  l record;
  approved_count int;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    select organizer_id, max_members into l from private_lessons where id = new.lesson_id;
    if auth.uid() is not null and auth.uid() <> l.organizer_id then
      raise exception 'FORBIDDEN: 承認できるのは主催者のみです';
    end if;
    if l.max_members is not null then
      perform pg_advisory_xact_lock(hashtext(new.lesson_id::text));
      select count(*) into approved_count
        from pl_participations
       where lesson_id = new.lesson_id and status = 'approved' and id <> new.id;
      if approved_count >= l.max_members then
        raise exception 'CAPACITY_FULL: 定員に達しています';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bd_trg_pl_participation_update on public.pl_participations;
create trigger bd_trg_pl_participation_update
  before update on public.pl_participations
  for each row execute function public.bd_enforce_pl_participation_update();


-- ============================================================================
-- 2. 通知の自動作成（クライアントの notifications INSERT を全て置き換える）
--    種類: join / join_request / join_approved / leave / comment /
--          follow / follow_request
-- ============================================================================

-- 参加・参加申請 → 主催者へ
create or replace function public.bd_notify_participation_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org uuid;
begin
  select organizer_id into org from cyphers where id = new.cypher_id;
  if org is not null and org <> new.profile_id then
    insert into notifications (user_id, cypher_id, actor_id, type)
    values (org, new.cypher_id, new.profile_id,
            case when new.status = 'pending' then 'join_request' else 'join' end);
  end if;
  return new;
end;
$$;

drop trigger if exists bd_trg_notify_participation_insert on public.participations;
create trigger bd_trg_notify_participation_insert
  after insert on public.participations
  for each row execute function public.bd_notify_participation_insert();


-- 承認 → 申請者へ
create or replace function public.bd_notify_participation_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org uuid;
begin
  select organizer_id into org from cyphers where id = new.cypher_id;
  if org is not null and org <> new.profile_id then
    insert into notifications (user_id, cypher_id, actor_id, type)
    values (new.profile_id, new.cypher_id, org, 'join_approved');
  end if;
  return new;
end;
$$;

drop trigger if exists bd_trg_notify_participation_approved on public.participations;
create trigger bd_trg_notify_participation_approved
  after update on public.participations
  for each row
  when (old.status = 'pending' and new.status = 'approved')
  execute function public.bd_notify_participation_approved();


-- 本人による参加キャンセル → 主催者へ
-- （主催者による拒否・サイファー削除・Cronの掃除では通知しない:
--   auth.uid() が本人のときだけ発火する）
create or replace function public.bd_notify_participation_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org uuid;
begin
  if auth.uid() is not null and auth.uid() = old.profile_id then
    select organizer_id into org from cyphers where id = old.cypher_id;
    if org is not null and org <> old.profile_id then
      insert into notifications (user_id, cypher_id, actor_id, type)
      values (org, old.cypher_id, old.profile_id, 'leave');
    end if;
  end if;
  return old;
end;
$$;

drop trigger if exists bd_trg_notify_participation_delete on public.participations;
create trigger bd_trg_notify_participation_delete
  after delete on public.participations
  for each row execute function public.bd_notify_participation_delete();


-- レッスン参加・申請 → 主催者へ（lesson_id 付き。承認UIがレッスンを特定できる）
create or replace function public.bd_notify_pl_participation_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org uuid;
begin
  select organizer_id into org from private_lessons where id = new.lesson_id;
  if org is not null and org <> new.profile_id then
    insert into notifications (user_id, lesson_id, actor_id, type)
    values (org, new.lesson_id, new.profile_id,
            case when new.status = 'pending' then 'join_request' else 'join' end);
  end if;
  return new;
end;
$$;

drop trigger if exists bd_trg_notify_pl_participation_insert on public.pl_participations;
create trigger bd_trg_notify_pl_participation_insert
  after insert on public.pl_participations
  for each row execute function public.bd_notify_pl_participation_insert();


-- レッスン参加の承認 → 申請者へ
create or replace function public.bd_notify_pl_participation_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org uuid;
begin
  select organizer_id into org from private_lessons where id = new.lesson_id;
  if org is not null and org <> new.profile_id then
    insert into notifications (user_id, lesson_id, actor_id, type)
    values (new.profile_id, new.lesson_id, org, 'join_approved');
  end if;
  return new;
end;
$$;

drop trigger if exists bd_trg_notify_pl_participation_approved on public.pl_participations;
create trigger bd_trg_notify_pl_participation_approved
  after update on public.pl_participations
  for each row
  when (old.status = 'pending' and new.status = 'approved')
  execute function public.bd_notify_pl_participation_approved();


-- 本人によるレッスンキャンセル → 主催者へ
create or replace function public.bd_notify_pl_participation_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org uuid;
begin
  if auth.uid() is not null and auth.uid() = old.profile_id then
    select organizer_id into org from private_lessons where id = old.lesson_id;
    if org is not null and org <> old.profile_id then
      insert into notifications (user_id, lesson_id, actor_id, type)
      values (org, old.lesson_id, old.profile_id, 'leave');
    end if;
  end if;
  return old;
end;
$$;

drop trigger if exists bd_trg_notify_pl_participation_delete on public.pl_participations;
create trigger bd_trg_notify_pl_participation_delete
  after delete on public.pl_participations
  for each row execute function public.bd_notify_pl_participation_delete();


-- コメント → 主催者＋参加者（本人以外）へ
create or replace function public.bd_notify_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (user_id, cypher_id, actor_id, type)
  select t.uid, new.cypher_id, new.profile_id, 'comment'
    from (
      select organizer_id as uid from cyphers where id = new.cypher_id
      union
      select profile_id from participations where cypher_id = new.cypher_id
    ) t
   where t.uid <> new.profile_id;
  return new;
end;
$$;

drop trigger if exists bd_trg_notify_comment on public.comments;
create trigger bd_trg_notify_comment
  after insert on public.comments
  for each row execute function public.bd_notify_comment();


-- フォロー・フォロー申請 → 相手へ
create or replace function public.bd_notify_follow_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (user_id, actor_id, type)
  values (new.following_id, new.follower_id,
          case when new.status = 'pending' then 'follow_request' else 'follow' end);
  return new;
end;
$$;

drop trigger if exists bd_trg_notify_follow_insert on public.follows;
create trigger bd_trg_notify_follow_insert
  after insert on public.follows
  for each row execute function public.bd_notify_follow_insert();


-- フォロー申請の承認 → 申請者へ（既存挙動: type='follow' が申請者に届く）
create or replace function public.bd_notify_follow_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (user_id, actor_id, type)
  values (new.follower_id, new.following_id, 'follow');
  return new;
end;
$$;

drop trigger if exists bd_trg_notify_follow_accepted on public.follows;
create trigger bd_trg_notify_follow_accepted
  after update on public.follows
  for each row
  when (old.status = 'pending' and new.status = 'accepted')
  execute function public.bd_notify_follow_accepted();


-- ============================================================================
-- 3. フォロー行のルール強制
--    - follower_id は本人のみ
--    - 鍵アカ宛ては pending に強制（公開アカ宛ては accepted）
--    - accepted にできるのは相手（following_id）のみ
-- ============================================================================

create or replace function public.bd_enforce_follow_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_private boolean;
begin
  if auth.uid() is not null and new.follower_id <> auth.uid() then
    raise exception 'FORBIDDEN: 他人名義のフォローは登録できません';
  end if;
  select coalesce(is_private, false) into target_private
    from profiles where id = new.following_id;
  new.status := case when target_private then 'pending' else 'accepted' end;
  return new;
end;
$$;

drop trigger if exists bd_trg_follow_insert on public.follows;
create trigger bd_trg_follow_insert
  before insert on public.follows
  for each row execute function public.bd_enforce_follow_insert();


create or replace function public.bd_enforce_follow_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    if auth.uid() is not null and auth.uid() <> new.following_id then
      raise exception 'FORBIDDEN: 承認できるのは申請された本人のみです';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bd_trg_follow_update on public.follows;
create trigger bd_trg_follow_update
  before update on public.follows
  for each row execute function public.bd_enforce_follow_update();


-- ============================================================================
-- 4. RLSベースライン
--    全テーブルでRLSを有効化し、アプリが実際に使うアクセスだけを許可する。
--    ・すでにRLS有効なら enable は no-op
--    ・既存ポリシーとは名前（bd_*）で共存する（permissiveはORで合成される）
--    ・notifications の INSERT はポリシーを作らない＝クライアントから不可。
--      作成はすべて上のトリガー（security definer）経由。
-- ============================================================================

alter table public.profiles          enable row level security;
alter table public.cyphers           enable row level security;
alter table public.private_lessons   enable row level security;
alter table public.participations    enable row level security;
alter table public.pl_participations enable row level security;
alter table public.follows           enable row level security;
alter table public.notifications     enable row level security;
alter table public.comments          enable row level security;
alter table public.cypher_reactions  enable row level security;
alter table public.spots             enable row level security;
alter table public.spot_checkins     enable row level security;
alter table public.genres            enable row level security;
alter table public.cypher_genres     enable row level security;
alter table public.pl_genres         enable row level security;

-- notifications は既存ポリシーをすべて削除して作り直す
-- （INSERT許可はもちろん、他人の通知が読める緩いSELECTも残さないため）
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'notifications'
  loop
    execute format('drop policy %I on public.notifications', p.policyname);
  end loop;
end $$;

-- profiles: 誰でも閲覧（/u/[id] は未ログインでも見る）、作成・更新は本人のみ
drop policy if exists bd_profiles_select on public.profiles;
create policy bd_profiles_select on public.profiles for select using (true);
drop policy if exists bd_profiles_insert on public.profiles;
create policy bd_profiles_insert on public.profiles for insert with check (id = auth.uid());
drop policy if exists bd_profiles_update on public.profiles;
create policy bd_profiles_update on public.profiles for update using (id = auth.uid());

-- cyphers: 閲覧は誰でも（限定公開は §6 のRESTRICTIVEで絞る）、作成・編集・削除は主催者
drop policy if exists bd_cyphers_select on public.cyphers;
create policy bd_cyphers_select on public.cyphers for select using (true);
drop policy if exists bd_cyphers_insert on public.cyphers;
create policy bd_cyphers_insert on public.cyphers for insert with check (organizer_id = auth.uid());
drop policy if exists bd_cyphers_update on public.cyphers;
create policy bd_cyphers_update on public.cyphers for update using (organizer_id = auth.uid());
drop policy if exists bd_cyphers_delete on public.cyphers;
create policy bd_cyphers_delete on public.cyphers for delete using (organizer_id = auth.uid());

-- private_lessons: cyphers と同じ
drop policy if exists bd_pl_select on public.private_lessons;
create policy bd_pl_select on public.private_lessons for select using (true);
drop policy if exists bd_pl_insert on public.private_lessons;
create policy bd_pl_insert on public.private_lessons for insert with check (organizer_id = auth.uid());
drop policy if exists bd_pl_update on public.private_lessons;
create policy bd_pl_update on public.private_lessons for update using (organizer_id = auth.uid());
drop policy if exists bd_pl_delete on public.private_lessons;
create policy bd_pl_delete on public.private_lessons for delete using (organizer_id = auth.uid());

-- participations: 閲覧は誰でも（参加者一覧をアプリ内で公開表示しているため）
-- 作成は本人（内容はトリガーが強制）、更新は主催者（承認）、削除は本人 or 主催者（拒否・削除）
drop policy if exists bd_participations_select on public.participations;
create policy bd_participations_select on public.participations for select using (true);
drop policy if exists bd_participations_insert on public.participations;
create policy bd_participations_insert on public.participations for insert with check (profile_id = auth.uid());
drop policy if exists bd_participations_update on public.participations;
create policy bd_participations_update on public.participations for update using (
  exists (select 1 from cyphers c where c.id = cypher_id and c.organizer_id = auth.uid())
);
drop policy if exists bd_participations_delete on public.participations;
create policy bd_participations_delete on public.participations for delete using (
  profile_id = auth.uid()
  or exists (select 1 from cyphers c where c.id = cypher_id and c.organizer_id = auth.uid())
);

-- pl_participations: participations と同じ
drop policy if exists bd_pl_participations_select on public.pl_participations;
create policy bd_pl_participations_select on public.pl_participations for select using (true);
drop policy if exists bd_pl_participations_insert on public.pl_participations;
create policy bd_pl_participations_insert on public.pl_participations for insert with check (profile_id = auth.uid());
drop policy if exists bd_pl_participations_update on public.pl_participations;
create policy bd_pl_participations_update on public.pl_participations for update using (
  exists (select 1 from private_lessons l where l.id = lesson_id and l.organizer_id = auth.uid())
);
drop policy if exists bd_pl_participations_delete on public.pl_participations;
create policy bd_pl_participations_delete on public.pl_participations for delete using (
  profile_id = auth.uid()
  or exists (select 1 from private_lessons l where l.id = lesson_id and l.organizer_id = auth.uid())
);

-- follows: 閲覧は誰でも（フォロワー数・一覧を公開表示）、作成は本人、
-- 更新（承認）は相手、削除は本人（解除）or 相手（拒否）
drop policy if exists bd_follows_select on public.follows;
create policy bd_follows_select on public.follows for select using (true);
drop policy if exists bd_follows_insert on public.follows;
create policy bd_follows_insert on public.follows for insert with check (follower_id = auth.uid());
drop policy if exists bd_follows_update on public.follows;
create policy bd_follows_update on public.follows for update using (following_id = auth.uid());
drop policy if exists bd_follows_delete on public.follows;
create policy bd_follows_delete on public.follows for delete using (
  follower_id = auth.uid() or following_id = auth.uid()
);

-- notifications: 本人のみ閲覧・既読化。INSERTポリシーなし（トリガーのみ）
drop policy if exists bd_notifications_select on public.notifications;
create policy bd_notifications_select on public.notifications for select using (user_id = auth.uid());
drop policy if exists bd_notifications_update on public.notifications;
create policy bd_notifications_update on public.notifications for update using (user_id = auth.uid());

-- comments: 閲覧は誰でも、投稿は本人名義のみ
drop policy if exists bd_comments_select on public.comments;
create policy bd_comments_select on public.comments for select using (true);
drop policy if exists bd_comments_insert on public.comments;
create policy bd_comments_insert on public.comments for insert with check (profile_id = auth.uid());

-- cypher_reactions: 閲覧は誰でも、自分のリアクションのみ作成・変更・削除
drop policy if exists bd_reactions_select on public.cypher_reactions;
create policy bd_reactions_select on public.cypher_reactions for select using (true);
drop policy if exists bd_reactions_insert on public.cypher_reactions;
create policy bd_reactions_insert on public.cypher_reactions for insert with check (profile_id = auth.uid());
drop policy if exists bd_reactions_update on public.cypher_reactions;
create policy bd_reactions_update on public.cypher_reactions for update using (profile_id = auth.uid());
drop policy if exists bd_reactions_delete on public.cypher_reactions;
create policy bd_reactions_delete on public.cypher_reactions for delete using (profile_id = auth.uid());

-- spots: 閲覧のみ（登録はダッシュボードから）
drop policy if exists bd_spots_select on public.spots;
create policy bd_spots_select on public.spots for select using (true);

-- spot_checkins: 閲覧は誰でも、チェックイン・チェックアウトは本人のみ
drop policy if exists bd_spot_checkins_select on public.spot_checkins;
create policy bd_spot_checkins_select on public.spot_checkins for select using (true);
drop policy if exists bd_spot_checkins_insert on public.spot_checkins;
create policy bd_spot_checkins_insert on public.spot_checkins for insert with check (profile_id = auth.uid());
drop policy if exists bd_spot_checkins_delete on public.spot_checkins;
create policy bd_spot_checkins_delete on public.spot_checkins for delete using (profile_id = auth.uid());

-- genres: 閲覧のみ
drop policy if exists bd_genres_select on public.genres;
create policy bd_genres_select on public.genres for select using (true);

-- cypher_genres / pl_genres: 閲覧は誰でも、編集は主催者のみ
drop policy if exists bd_cypher_genres_select on public.cypher_genres;
create policy bd_cypher_genres_select on public.cypher_genres for select using (true);
drop policy if exists bd_cypher_genres_insert on public.cypher_genres;
create policy bd_cypher_genres_insert on public.cypher_genres for insert with check (
  exists (select 1 from cyphers c where c.id = cypher_id and c.organizer_id = auth.uid())
);
drop policy if exists bd_cypher_genres_delete on public.cypher_genres;
create policy bd_cypher_genres_delete on public.cypher_genres for delete using (
  exists (select 1 from cyphers c where c.id = cypher_id and c.organizer_id = auth.uid())
);

drop policy if exists bd_pl_genres_select on public.pl_genres;
create policy bd_pl_genres_select on public.pl_genres for select using (true);
drop policy if exists bd_pl_genres_insert on public.pl_genres;
create policy bd_pl_genres_insert on public.pl_genres for insert with check (
  exists (select 1 from private_lessons l where l.id = lesson_id and l.organizer_id = auth.uid())
);
drop policy if exists bd_pl_genres_delete on public.pl_genres;
create policy bd_pl_genres_delete on public.pl_genres for delete using (
  exists (select 1 from private_lessons l where l.id = lesson_id and l.organizer_id = auth.uid())
);


-- ============================================================================
-- 5. 参加者数の集計ビュー
--    TopScreen が participations を全件取得して数えていたのを置き換える。
--    ビューは定義者権限で動くので、匿名でも件数だけ読める。
-- ============================================================================

create or replace view public.cypher_participant_counts as
  select cypher_id, count(*)::int as approved_count
    from public.participations
   where status = 'approved'
   group by cypher_id;

create or replace view public.pl_participant_counts as
  select lesson_id, count(*)::int as approved_count
    from public.pl_participations
   where status = 'approved'
   group by lesson_id;

grant select on public.cypher_participant_counts to anon, authenticated;
grant select on public.pl_participant_counts    to anon, authenticated;


-- ============================================================================
-- 6. 限定公開（visibility <> 'public'）をDBレベルで隠す
--    これまでクライアント側のフィルタだけだったため、APIを直接叩けば
--    限定公開サイファーも読めていた。RESTRICTIVEポリシーで塞ぐ。
--    フォロー確認は security definer 関数経由（follows のRLSの影響を受けない）
-- ============================================================================

create or replace function public.bd_can_see_private(org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select auth.uid() is not null and (
    auth.uid() = org
    or exists (
      select 1 from follows f
       where f.follower_id = auth.uid()
         and f.following_id = org
         and f.status = 'accepted'
    )
  );
$$;

drop policy if exists bd_cyphers_visibility_guard on public.cyphers;
create policy bd_cyphers_visibility_guard on public.cyphers
  as restrictive for select
  using (
    visibility = 'public' or visibility is null or bd_can_see_private(organizer_id)
  );

drop policy if exists bd_pl_visibility_guard on public.private_lessons;
create policy bd_pl_visibility_guard on public.private_lessons
  as restrictive for select
  using (
    visibility = 'public' or visibility is null or bd_can_see_private(organizer_id)
  );


-- ============================================================================
-- 確認用: 実行後にこれを流して、各テーブルの rowsecurity=true と
-- bd_* ポリシーが並んでいることを確認する
-- ============================================================================
-- select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;
-- select tablename, policyname, cmd, permissive from pg_policies where schemaname = 'public' order by 1, 3;
