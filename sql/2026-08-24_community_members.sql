-- 「チーム（Rep）」とは別に、もう一枠「マイコミュニティ」を持てるようにする。
-- 仕組みはチームと同じ：名前はprofilesに1つ、メンバーはフォロー中のアカウントから選ぶ

alter table public.profiles add column if not exists community_name text;

create table if not exists public.community_members (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_id  uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, member_id),
  check (profile_id <> member_id)
);

alter table public.community_members enable row level security;

-- 誰でも閲覧できる（プロフィール画面で公開表示するため）
create policy bd_community_members_select on public.community_members for select using (true);
-- 追加できるのは自分の欄にだけ
create policy bd_community_members_insert on public.community_members for insert with check (profile_id = auth.uid());
-- 削除できるのも自分の欄にだけ
create policy bd_community_members_delete on public.community_members for delete using (profile_id = auth.uid());
