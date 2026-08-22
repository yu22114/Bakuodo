-- 「コミュニティ」機能：特定のイベント（サイファー／レッスン／イベント）の
-- 主催者と参加者だけが読み書きできる掲示板。既存のcommentsは誰でも見られる仕様のため、
-- こちらは別の新しい表として作る
-- Supabaseダッシュボードで手動適用してください

create table if not exists public.event_board_posts (
  id uuid primary key default gen_random_uuid(),
  cypher_id uuid references public.cyphers(id) on delete cascade,
  lesson_id uuid references public.private_lessons(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  check ((cypher_id is not null) <> (lesson_id is not null))
);

create index if not exists event_board_posts_cypher_idx on public.event_board_posts(cypher_id);
create index if not exists event_board_posts_lesson_idx on public.event_board_posts(lesson_id);

alter table public.event_board_posts enable row level security;

-- 主催者本人、または承認済み参加者かどうかを判定する関数（follows等と同じくsecurity definer）
create or replace function public.bd_is_event_member(p_cypher_id uuid, p_lesson_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select auth.uid() is not null and (
    (p_cypher_id is not null and (
      exists (select 1 from cyphers c where c.id = p_cypher_id and c.organizer_id = auth.uid())
      or exists (select 1 from participations p where p.cypher_id = p_cypher_id and p.profile_id = auth.uid() and p.status = 'approved')
    ))
    or
    (p_lesson_id is not null and (
      exists (select 1 from private_lessons l where l.id = p_lesson_id and l.organizer_id = auth.uid())
      or exists (select 1 from pl_participations pp where pp.lesson_id = p_lesson_id and pp.profile_id = auth.uid() and pp.status = 'approved')
    ))
  );
$$;

-- 閲覧・投稿は主催者・承認済み参加者のみ。削除は投稿した本人のみ
create policy bd_event_board_select on public.event_board_posts for select
  using (bd_is_event_member(cypher_id, lesson_id));
create policy bd_event_board_insert on public.event_board_posts for insert
  with check (profile_id = auth.uid() and bd_is_event_member(cypher_id, lesson_id));
create policy bd_event_board_delete on public.event_board_posts for delete
  using (profile_id = auth.uid());
