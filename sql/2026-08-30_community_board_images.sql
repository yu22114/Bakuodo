-- ============================================================================
-- マイコミュニティの掲示板（community_boards）にも、LESSON/EVENT/NUMBERと
-- 同じように画像を複数枚（最大5枚）添付できるようにする。
-- 掲示板を作れるのは団体用アカウントだけなので、実質「団体用アカウントの投稿」に画像が付く形になる。
-- ============================================================================

alter table public.community_boards add column if not exists image_urls text[] not null default '{}';

-- 画像置き場（Storageバケット・RLS）は sql/2026-08-30_post_images.sql で作成済みの
-- post-imagesバケットをそのまま使う（パス規則・権限とも変更不要）
