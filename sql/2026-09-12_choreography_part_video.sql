-- 担当振付のパートに、画像だけでなく動画（振り入れ動画・参考映像など）も添付できるようにする。
-- 添付欄は1つのまま＝画像か動画のどちらか一方（両方は入れない）。

-- 動画のURLを保存する列を追加（既存の行はNULLのまま＝今まで通り画像のみ扱い）
alter table public.community_board_choreography_parts add column if not exists video_url text;

-- 動画置き場（Storageバケット）を新しく作る。画像用のpost-imagesとは容量・種類の制約を
-- 分けたいので専用バケットにする。上限50MB・動画ファイルのみ許可
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-videos', 'post-videos', true, 52428800, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

-- 保存パスは "投稿者のuserId/ランダムなファイル名" にする決まりにし、
-- 自分のフォルダにしかアップロード・削除できないようRLSで縛る（post-imagesと同じ考え方）
drop policy if exists bd_post_videos_select on storage.objects;
create policy bd_post_videos_select on storage.objects for select
  using (bucket_id = 'post-videos');

drop policy if exists bd_post_videos_insert on storage.objects;
create policy bd_post_videos_insert on storage.objects for insert
  with check (bucket_id = 'post-videos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists bd_post_videos_update on storage.objects;
create policy bd_post_videos_update on storage.objects for update
  using (bucket_id = 'post-videos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists bd_post_videos_delete on storage.objects;
create policy bd_post_videos_delete on storage.objects for delete
  using (bucket_id = 'post-videos' and auth.uid()::text = (storage.foldername(name))[1]);
