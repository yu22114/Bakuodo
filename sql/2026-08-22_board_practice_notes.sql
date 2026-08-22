-- 掲示板に「練習内容」欄を追加する。書けるのは作成者だけにするため、
-- community_boardsにUPDATEのRLSがまだ無かったので合わせて追加する
-- Supabaseダッシュボードで手動適用してください

alter table public.community_boards add column if not exists practice_notes text;

-- 更新できるのは作成者本人だけ（練習内容だけでなく他の項目も同様に本人限定になる）
create policy bd_community_boards_update on public.community_boards for update
  using (creator_id = auth.uid());
