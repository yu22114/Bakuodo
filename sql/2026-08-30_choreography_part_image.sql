-- 担当振付のパートに画像（フォーメーション図・参考写真など）を1枚添付できるようにする。
-- アップロード先は既存のpost-imagesバケット（LESSON/EVENT/NUMBER/コミュニティ掲示板と同じ）を
-- そのまま使うので、ストレージ側のポリシー変更は不要
alter table public.community_board_choreography_parts add column if not exists image_url text;
