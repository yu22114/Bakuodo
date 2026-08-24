-- 団体用アカウントが作った掲示板は、「その団体をマイコミュニティに追加している
-- アカウント」と「作成者本人」だけに見えるようにする。
-- 直前の「誰でも見える」設定（2026-08-24_board_public_view.sql）を、この条件で上書きする。
--
-- bd_can_view_board 関数は既存のもの（招待制のとき使っていた）を作り替えて使う。
-- 中身を「招待されているか」から「マイコミュニティに追加しているか（community_members）」に変える。

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
        or exists (
          select 1 from public.community_members cm
          where cm.member_id = b.creator_id and cm.profile_id = auth.uid()
        )
      )
  );
$$;

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
