-- 担当振付のパートを、作った本人も編集・削除できるようにする
-- （今までは掲示板の作成者だけだった）。誰が作ったかを記録する列を追加し、
-- 更新・削除の許可ルールを「作成者 or パートを作った本人」に広げる

alter table public.community_board_choreography_parts add column if not exists created_by uuid references public.profiles(id);

drop policy if exists bd_community_board_choreography_parts_update on public.community_board_choreography_parts;
create policy bd_community_board_choreography_parts_update on public.community_board_choreography_parts for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.community_board_genre_cards c join public.community_boards b on b.id = c.board_id
      where c.id = card_id and b.creator_id = auth.uid()
    )
  );

drop policy if exists bd_community_board_choreography_parts_delete on public.community_board_choreography_parts;
create policy bd_community_board_choreography_parts_delete on public.community_board_choreography_parts for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.community_board_genre_cards c join public.community_boards b on b.id = c.board_id
      where c.id = card_id and b.creator_id = auth.uid()
    )
  );

-- 担当者の入れ替え（編集時に一旦消して入れ直す）も同じ条件に揃える
drop policy if exists bd_community_board_choreography_assignees_delete on public.community_board_choreography_assignees;
create policy bd_community_board_choreography_assignees_delete on public.community_board_choreography_assignees for delete
  using (exists (
    select 1 from public.community_board_choreography_parts p
    where p.id = part_id
      and (
        p.created_by = auth.uid()
        or exists (
          select 1 from public.community_board_genre_cards c join public.community_boards b on b.id = c.board_id
          where c.id = p.card_id and b.creator_id = auth.uid()
        )
      )
  ));
