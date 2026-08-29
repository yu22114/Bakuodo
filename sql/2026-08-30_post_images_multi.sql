-- ============================================================================
-- LESSON・EVENT（private_lessons）・NUMBER（numbers）のカードに、
-- 画像を複数枚添付できるようにする。CYPHERは対象外（頼まれていないので触らない）。
--
-- 既存の image_url（1枚だけ）は消さずに残す。1枚目の画像として引き続き
-- カード表紙のサムネイルに使う。新しく足す image_urls（配列）に全ての
-- 画像URLを順番に保存し、詳細画面のギャラリー表示に使う。
-- ============================================================================

alter table public.private_lessons add column if not exists image_urls text[] not null default '{}';
alter table public.numbers         add column if not exists image_urls text[] not null default '{}';

-- Storageバケット・RLSは sql/2026-08-30_post_images.sql で作成済みのものをそのまま使う
-- （1人が複数ファイルをアップロードすることを制限するポリシーは元々ないため、変更不要）
