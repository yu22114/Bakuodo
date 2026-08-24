-- 練習カードに、講師名・講師のInstagram URL・ジャンルを持たせる。
-- どれも任意項目（タイトルだけ必須のまま）

alter table public.community_board_genre_cards add column if not exists instructor_name text;
alter table public.community_board_genre_cards add column if not exists instructor_instagram text;
alter table public.community_board_genre_cards add column if not exists genre text;
