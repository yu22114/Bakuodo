-- 練習日程を、追加した本人も編集・削除できるようにする
-- （今までは掲示板の作成者だけだった。追加自体はすでに誰でもできる仕様）。
-- 担当振付のパート（2026-08-25_choreography_part_owner.sql）と同じやり方で、
-- 誰が追加したかを記録する列を足し、更新・削除の許可ルールを
-- 「掲示板の作成者 or 追加した本人」に広げる

alter table public.community_board_practice_schedules add column if not exists created_by uuid references public.profiles(id);

drop policy if exists bd_community_board_practice_schedules_update on public.community_board_practice_schedules;
create policy bd_community_board_practice_schedules_update on public.community_board_practice_schedules for update
  using (
    created_by = auth.uid()
    or exists (select 1 from public.community_boards b where b.id = board_id and b.creator_id = auth.uid())
  );

drop policy if exists bd_community_board_practice_schedules_delete on public.community_board_practice_schedules;
create policy bd_community_board_practice_schedules_delete on public.community_board_practice_schedules for delete
  using (
    created_by = auth.uid()
    or exists (select 1 from public.community_boards b where b.id = board_id and b.creator_id = auth.uid())
  );
