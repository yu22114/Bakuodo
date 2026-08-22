-- マイコミュニティの掲示板を「招待した人だけ見える」ようにする。
-- 新しく招待用の表(community_board_invites)を作り、community_boards他の
-- 「誰でも見える」閲覧ポリシーを「作成者本人 or 招待されている人」だけに
-- 絞り込む形へ張り替える。
--
-- ※これは新規追加ではなく既存ポリシーの置き換え（drop policy → create policy）です。
--   データそのものは消えませんが、招待リストが空の既存カードは、
--   実行後は作成者以外に見えなくなります（ユーザー確認済み）。
-- Supabaseダッシュボードで手動適用してください

create table if not exists public.community_board_invites (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.community_boards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (board_id, user_id)
);

create index if not exists community_board_invites_board_idx on public.community_board_invites(board_id);
create index if not exists community_board_invites_user_idx on public.community_board_invites(user_id);

alter table public.community_board_invites enable row level security;

-- 閲覧：その掲示板の作成者、または招待された本人
create policy bd_community_board_invites_select on public.community_board_invites for select
  using (
    exists (select 1 from public.community_boards b where b.id = board_id and b.creator_id = auth.uid())
    or user_id = auth.uid()
  );
-- 追加・削除（招待する／招待を外す）は掲示板の作成者だけ
create policy bd_community_board_invites_insert on public.community_board_invites for insert
  with check (exists (select 1 from public.community_boards b where b.id = board_id and b.creator_id = auth.uid()));
create policy bd_community_board_invites_delete on public.community_board_invites for delete
  using (exists (select 1 from public.community_boards b where b.id = board_id and b.creator_id = auth.uid()));

-- 「この掲示板を見られるか」をまとめて判定する関数（作成者 or 招待されている人）
create or replace function public.bd_can_view_board(p_board_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.community_boards b
    where b.id = p_board_id
      and (
        b.creator_id = auth.uid()
        or exists (select 1 from public.community_board_invites i where i.board_id = b.id and i.user_id = auth.uid())
      )
  );
$$;

-- 既存の「誰でも見える」閲覧ポリシーを、上の関数を使った制限付きに張り替える
drop policy if exists bd_community_boards_select on public.community_boards;
create policy bd_community_boards_select on public.community_boards for select
  using (public.bd_can_view_board(id));

drop policy if exists bd_community_board_instructors_select on public.community_board_instructors;
create policy bd_community_board_instructors_select on public.community_board_instructors for select
  using (public.bd_can_view_board(board_id));

drop policy if exists bd_community_board_practice_schedules_select on public.community_board_practice_schedules;
create policy bd_community_board_practice_schedules_select on public.community_board_practice_schedules for select
  using (public.bd_can_view_board(board_id));

drop policy if exists bd_community_board_posts_select on public.community_board_posts;
create policy bd_community_board_posts_select on public.community_board_posts for select
  using (public.bd_can_view_board(board_id));
