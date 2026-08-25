-- 担当振付のパートの並び替えを、掲示板の作成者だけでなく、
-- そのカードに参加申請しているメンバーなら誰でもできるようにする。
--
-- sort_order列への直接UPDATEは今まで通り「作成者 or カードを見られる人」より狭い
-- 「作成者 or 掲示板の作成者」のポリシーのままにしておき（タイトル等の編集はそのまま守る）、
-- 並び替え専用のRPC関数を新しく用意する。この関数はsecurity definerで動くので、
-- 関数の中で「このカードを見られる人か」だけをチェックし、通ればsort_orderをまとめて更新する。

create or replace function public.bd_reorder_choreography_parts(p_card_id uuid, p_ordered_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
begin
  if not public.bd_can_view_card_schedules(p_card_id) then
    raise exception 'not allowed';
  end if;
  if p_ordered_ids is null or array_length(p_ordered_ids, 1) is null then
    return;
  end if;
  for i in 1..array_length(p_ordered_ids, 1) loop
    update public.community_board_choreography_parts
    set sort_order = i - 1
    where id = p_ordered_ids[i] and card_id = p_card_id;
  end loop;
end;
$$;

grant execute on function public.bd_reorder_choreography_parts(uuid, uuid[]) to authenticated;
