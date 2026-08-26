-- コメントを、書いた本人が削除できるようにする
alter table public.comments enable row level security; -- 念のため（既に有効のはず）

drop policy if exists bd_comments_delete on public.comments;
create policy bd_comments_delete on public.comments for delete
  using (profile_id = auth.uid());
