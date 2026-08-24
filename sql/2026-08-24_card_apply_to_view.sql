-- 個人用アカウントが練習カードに入るには「参加申請」を必要にする（申請すればすぐ入れる＝自動承認）。
-- 申請していないカードは、練習日程の中身（日時・場所・参加可否）が見えない＝実質「入れない」。
-- カード自体（タイトル・講師・ジャンル）は今まで通り、マイコミュニティに追加している人なら見える
-- （見えないと何に申請すればいいか分からなくなるため）。

create table if not exists public.community_board_genre_card_members (
  card_id uuid not null references public.community_board_genre_cards(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (card_id, profile_id)
);

alter table public.community_board_genre_card_members enable row level security;

-- 誰でも閲覧できる（自分が参加済みかどうかをアプリ側で判定するため）
create policy bd_community_board_genre_card_members_select on public.community_board_genre_card_members for select using (true);
-- 申請（追加）・取り消し（削除）は本人の分だけ
create policy bd_community_board_genre_card_members_insert on public.community_board_genre_card_members for insert with check (profile_id = auth.uid());
create policy bd_community_board_genre_card_members_delete on public.community_board_genre_card_members for delete using (profile_id = auth.uid());

-- 「そのカードの練習日程を見られるか」＝カードのある掲示板の作成者 or そのカードに参加申請済み
create or replace function public.bd_can_view_card_schedules(p_card_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.community_board_genre_cards c
    join public.community_boards b on b.id = c.board_id
    where c.id = p_card_id
      and (
        b.creator_id = auth.uid()
        or exists (select 1 from public.community_board_genre_card_members m where m.card_id = c.id and m.profile_id = auth.uid())
      )
  );
$$;

-- 練習日程：カードに紐づく分だけ上の条件で絞る。
-- カード未設定（card_id is null、カード機能より前の古いデータ）は今まで通り掲示板の閲覧条件のまま
drop policy if exists bd_community_board_practice_schedules_select on public.community_board_practice_schedules;
create policy bd_community_board_practice_schedules_select on public.community_board_practice_schedules for select
  using (
    (card_id is null and public.bd_can_view_board(board_id))
    or (card_id is not null and public.bd_can_view_card_schedules(card_id))
  );

drop policy if exists bd_community_board_practice_schedules_insert on public.community_board_practice_schedules;
create policy bd_community_board_practice_schedules_insert on public.community_board_practice_schedules for insert
  with check (
    (card_id is null and public.bd_can_view_board(board_id))
    or (card_id is not null and public.bd_can_view_card_schedules(card_id))
  );

-- 参加可否（○/△/×）も同じ条件に揃える
drop policy if exists bd_community_board_attendances_select on public.community_board_attendances;
create policy bd_community_board_attendances_select on public.community_board_attendances for select
  using (exists (
    select 1 from public.community_board_practice_schedules s
    where s.id = schedule_id
      and ((s.card_id is null and public.bd_can_view_board(s.board_id)) or (s.card_id is not null and public.bd_can_view_card_schedules(s.card_id)))
  ));

drop policy if exists bd_community_board_attendances_insert on public.community_board_attendances;
create policy bd_community_board_attendances_insert on public.community_board_attendances for insert
  with check (user_id = auth.uid() and exists (
    select 1 from public.community_board_practice_schedules s
    where s.id = schedule_id
      and ((s.card_id is null and public.bd_can_view_board(s.board_id)) or (s.card_id is not null and public.bd_can_view_card_schedules(s.card_id)))
  ));
