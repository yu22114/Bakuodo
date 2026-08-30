-- 練習カード（community_board_genre_cards）にも「作った本人」を記録し、
-- 掲示板の作成者だけでなく、そのカードを作った本人も編集・削除できるようにする。
-- （担当振付パート・練習日程で既にある「作成者本人も管理できる」という考え方と揃える）
alter table public.community_board_genre_cards add column if not exists created_by uuid references public.profiles(id);

drop policy if exists bd_community_board_genre_cards_update on public.community_board_genre_cards;
create policy bd_community_board_genre_cards_update on public.community_board_genre_cards for update
  using (
    exists (select 1 from public.community_boards b where b.id = board_id and b.creator_id = auth.uid())
    or created_by = auth.uid()
  );

drop policy if exists bd_community_board_genre_cards_delete on public.community_board_genre_cards;
create policy bd_community_board_genre_cards_delete on public.community_board_genre_cards for delete
  using (
    exists (select 1 from public.community_boards b where b.id = board_id and b.creator_id = auth.uid())
    or created_by = auth.uid()
  );
