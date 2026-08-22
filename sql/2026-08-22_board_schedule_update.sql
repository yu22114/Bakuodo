-- 練習日程を編集できるようにするため、community_board_practice_schedulesに
-- UPDATEのRLSを追加する（今までselect/insert/deleteしか無かった）。
-- 更新できるのはその掲示板の作成者だけ
-- Supabaseダッシュボードで手動適用してください

create policy bd_community_board_practice_schedules_update on public.community_board_practice_schedules for update
  using (exists (select 1 from public.community_boards b where b.id = board_id and b.creator_id = auth.uid()));
