-- 練習カードを編集できるようにする（今までselect/insert/deleteしかなかった）。
-- 更新できるのは掲示板の作成者だけ

create policy bd_community_board_genre_cards_update on public.community_board_genre_cards for update
  using (exists (select 1 from public.community_boards b where b.id = board_id and b.creator_id = auth.uid()));
