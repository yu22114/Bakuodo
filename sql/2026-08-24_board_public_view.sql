-- 掲示板作成フォームから「招待するアカウント」欄を無くしたため、招待の仕組み
-- （bd_can_view_board：作成者 or 招待された人だけ見える）を使わなくなる。
-- このままだと今後作る掲示板は作成者以外に一切見えなくなってしまうため、
-- 閲覧ポリシーを元の「誰でも見える」に戻す。
--
-- community_board_invites テーブルと bd_can_view_board 関数自体は
-- ルール通り消さずそのまま残す（使わないだけ）。

drop policy if exists bd_community_boards_select on public.community_boards;
create policy bd_community_boards_select on public.community_boards for select using (true);

drop policy if exists bd_community_board_instructors_select on public.community_board_instructors;
create policy bd_community_board_instructors_select on public.community_board_instructors for select using (true);

drop policy if exists bd_community_board_practice_schedules_select on public.community_board_practice_schedules;
create policy bd_community_board_practice_schedules_select on public.community_board_practice_schedules for select using (true);

drop policy if exists bd_community_board_posts_select on public.community_board_posts;
create policy bd_community_board_posts_select on public.community_board_posts for select using (true);
