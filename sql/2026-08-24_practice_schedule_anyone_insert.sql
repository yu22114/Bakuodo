-- 練習日程の追加を、掲示板の作成者だけでなく「その掲示板を見られる人」なら
-- 誰でもできるようにする（閲覧できる条件＝作成者 or マイコミュニティに追加している人）。
-- 編集・削除は今まで通り作成者だけのまま

drop policy if exists bd_community_board_practice_schedules_insert on public.community_board_practice_schedules;
create policy bd_community_board_practice_schedules_insert on public.community_board_practice_schedules for insert
  with check (public.bd_can_view_board(board_id));
