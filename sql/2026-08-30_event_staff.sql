-- ============================================================================
-- EVENT（private_lessons、kind='event'）に、JUDGE・DJ・MCを登録できるようにする。
-- 1人ずつ、フォロー中のアカウント（profile_idで紐付け）か、
-- アプリ未登録の人向けにInstagramアカウント（テキスト）のどちらかで登録する。
-- LESSON・NUMBER・CYPHERは対象外（頼まれていないので触らない）。
-- ============================================================================

create table if not exists public.pl_staff (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.private_lessons(id) on delete cascade,
  role text not null check (role in ('judge', 'dj', 'mc')),
  -- フォロー中のアカウントから選んだ場合はprofile_idを入れる（名前・アイコンは表示時にprofilesから引く）
  profile_id uuid references public.profiles(id),
  -- アプリ未登録の人を手入力した場合はinstagramにURLを入れる（profile_idはNULLのまま）
  instagram text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.pl_staff enable row level security;

drop policy if exists bd_pl_staff_select on public.pl_staff;
create policy bd_pl_staff_select on public.pl_staff for select using (true);

drop policy if exists bd_pl_staff_insert on public.pl_staff;
create policy bd_pl_staff_insert on public.pl_staff for insert with check (
  exists (select 1 from private_lessons l where l.id = lesson_id and l.organizer_id = auth.uid())
);

drop policy if exists bd_pl_staff_delete on public.pl_staff;
create policy bd_pl_staff_delete on public.pl_staff for delete using (
  exists (select 1 from private_lessons l where l.id = lesson_id and l.organizer_id = auth.uid())
);
