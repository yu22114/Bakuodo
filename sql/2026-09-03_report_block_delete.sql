-- Apple App Storeの審査で必須とされる3点に対応する土台：
--   1. 通報（reports）：不適切な投稿・ユーザーを運営に知らせる
--   2. ブロック（blocks）：相手の投稿・コメントが互いに見えなくなり、フォローもできなくなる
--   3. アプリ内アカウント削除の下ごしらえ（deleted_at列）：削除時は行ごと消さず、
--      個人情報だけ匿名化する。他テーブルが profiles.id を参照しているため、
--      行自体を消すと投稿・参加履歴などが壊れてしまうことを避けるため

-- ===== 1. 通報 =====
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  detail text,
  created_at timestamptz not null default now(),
  constraint bd_reports_not_self check (reporter_id <> reported_user_id)
);
alter table public.reports enable row level security;

-- 通報した本人だけが自分の通報を見られる。内容の確認はSupabaseダッシュボードから運営が直接行う
drop policy if exists bd_reports_select on public.reports;
create policy bd_reports_select on public.reports for select using (reporter_id = auth.uid());
drop policy if exists bd_reports_insert on public.reports;
create policy bd_reports_insert on public.reports for insert with check (reporter_id = auth.uid());


-- ===== 2. ブロック =====
create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint bd_blocks_not_self check (blocker_id <> blocked_id),
  unique (blocker_id, blocked_id)
);
alter table public.blocks enable row level security;

drop policy if exists bd_blocks_select on public.blocks;
create policy bd_blocks_select on public.blocks for select using (blocker_id = auth.uid() or blocked_id = auth.uid());
drop policy if exists bd_blocks_insert on public.blocks;
create policy bd_blocks_insert on public.blocks for insert with check (blocker_id = auth.uid());
drop policy if exists bd_blocks_delete on public.blocks;
create policy bd_blocks_delete on public.blocks for delete using (blocker_id = auth.uid());

-- 自分と相手がブロック関係にあるか（どちらがブロックした側でも true）。RLSポリシーから呼ぶ
create or replace function public.bd_is_blocked(other_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = auth.uid() and blocked_id = other_id)
       or (blocker_id = other_id and blocked_id = auth.uid())
  );
$$;

-- ブロックした瞬間、既存のフォロー関係（双方向）を解除する
create or replace function public.bd_on_block_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.follows
    where (follower_id = new.blocker_id and following_id = new.blocked_id)
       or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end;
$$;
drop trigger if exists bd_trg_block_insert on public.blocks;
create trigger bd_trg_block_insert
  after insert on public.blocks
  for each row execute function public.bd_on_block_insert();

-- 既存のフォロー登録トリガーを拡張し、ブロック関係にある相手はフォローできないようにする
-- （本人名義チェック・鍵アカ判定は元のまま。ブロック判定だけ追加）
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
  if public.bd_is_blocked(new.following_id) then
    raise exception 'FORBIDDEN: ブロック関係にあるアカウントはフォローできません';
  end if;
  select coalesce(is_private, false) into target_private
    from profiles where id = new.following_id;
  new.status := case when target_private then 'pending' else 'accepted' end;
  return new;
end;
$$;

-- ブロック関係にある相手の投稿・コメントは、お互いに見えないようにする
-- （元の using(true) に「ブロック関係でない」条件を足すだけで、それ以外の見え方は変えない）
drop policy if exists bd_cyphers_select on public.cyphers;
create policy bd_cyphers_select on public.cyphers for select using (not public.bd_is_blocked(organizer_id));
drop policy if exists bd_pl_select on public.private_lessons;
create policy bd_pl_select on public.private_lessons for select using (not public.bd_is_blocked(organizer_id));
drop policy if exists bd_numbers_select on public.numbers;
create policy bd_numbers_select on public.numbers for select using (not public.bd_is_blocked(organizer_id));
drop policy if exists bd_comments_select on public.comments;
create policy bd_comments_select on public.comments for select using (not public.bd_is_blocked(profile_id));


-- ===== 3. アプリ内アカウント削除 =====
alter table public.profiles add column if not exists deleted_at timestamptz;
