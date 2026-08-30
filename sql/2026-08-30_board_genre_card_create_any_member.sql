-- 練習カード（community_board_genre_cards）の作成を、掲示板の作成者だけでなく、
-- その掲示板を閲覧できる人（＝マイコミュニティに追加している人 or 作成者本人）全員に広げる。
-- 条件は既存のSELECTポリシーと同じ bd_can_view_board() を使う。
-- 削除は今まで通り作成者だけ（変更しない）。

drop policy if exists bd_community_board_genre_cards_insert on public.community_board_genre_cards;
create policy bd_community_board_genre_cards_insert on public.community_board_genre_cards for insert
  with check (public.bd_can_view_board(board_id));
