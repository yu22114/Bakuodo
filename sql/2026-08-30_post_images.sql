-- ============================================================================
-- LESSON・EVENT（private_lessons）・NUMBER（numbers）のカードに、
-- 画像を1枚添付できるようにする。CYPHERは対象外（頼まれていないので触らない）。
-- ============================================================================

-- 画像のURLを保存する列を追加（既存の行はNULLのまま＝画像なし表示になるだけ）
alter table public.private_lessons add column if not exists image_url text;
alter table public.numbers         add column if not exists image_url text;

-- ============================================================================
-- 画像置き場（Storageバケット）を新しく作る。
-- avatarsバケットとは別に、投稿画像専用のpost-imagesバケットを用意する。
-- 保存パスは "投稿者のuserId/ランダムなファイル名" にする決まりにし、
-- 自分のフォルダにしかアップロード・削除できないようRLSで縛る
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists bd_post_images_select on storage.objects;
create policy bd_post_images_select on storage.objects for select
  using (bucket_id = 'post-images');

drop policy if exists bd_post_images_insert on storage.objects;
create policy bd_post_images_insert on storage.objects for insert
  with check (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists bd_post_images_update on storage.objects;
create policy bd_post_images_update on storage.objects for update
  using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists bd_post_images_delete on storage.objects;
create policy bd_post_images_delete on storage.objects for delete
  using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);
