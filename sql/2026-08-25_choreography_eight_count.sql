-- パートに「エイト数」（8カウント単位の長さ）を持たせる
alter table public.community_board_choreography_parts add column if not exists eight_count int;
