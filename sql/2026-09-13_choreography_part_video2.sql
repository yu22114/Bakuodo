-- 担当振付のパートの添付を「画像1枚 + 動画2本」まで同時に持てるようにする。
-- （これまでは画像 or 動画のどちらか1つだけだった）
-- 動画は2本目の保存先として列をもう1つ足すだけ。1本目はこれまで通りvideo_urlを使う

alter table public.community_board_choreography_parts add column if not exists video_url_2 text;
