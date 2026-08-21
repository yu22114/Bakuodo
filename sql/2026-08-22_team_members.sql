-- 「Rep」ボタンで表示するチームメイトを管理する新しいテーブル。
-- 誰が誰をチームメイトとして登録したか（フォロー中のアカウントから選ぶ）を記録する
-- Supabaseダッシュボードで手動適用してください
create table if not exists public.team_members (
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  teammate_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (profile_id, teammate_id),
  check (profile_id <> teammate_id)
);

alter table public.team_members enable row level security;

-- 誰でも閲覧できる（プロフィール画面で公開表示するため）
create policy bd_team_members_select on public.team_members for select using (true);
-- 追加できるのは自分の欄にだけ
create policy bd_team_members_insert on public.team_members for insert with check (profile_id = auth.uid());
-- 削除できるのも自分の欄にだけ
create policy bd_team_members_delete on public.team_members for delete using (profile_id = auth.uid());
