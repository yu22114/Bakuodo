-- ============================================================================
-- EVENTが終わった後、参加者・主催者が当日の写真を投稿できる「振り返り」欄を追加する。
-- 今ある添付画像（image_urls）は開催前の宣伝用なので、それとは別に
-- 「開催後の記録・思い出用」の写真置き場を新しく作る。LESSON・CYPHER・NUMBERは対象外。
--
-- 画像置き場（Storage）は新しく作らず、既存のpost-imagesバケットをそのまま使う。
-- ============================================================================

create table if not exists public.pl_recap_photos (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.private_lessons(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  image_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists pl_recap_photos_lesson_id_idx on public.pl_recap_photos (lesson_id);

alter table public.pl_recap_photos enable row level security;

-- 閲覧は誰でも（開催ページに来た人が振り返りを見られるように）
drop policy if exists bd_pl_recap_photos_select on public.pl_recap_photos;
create policy bd_pl_recap_photos_select on public.pl_recap_photos for select using (true);

-- 投稿できるのは、そのEVENTの主催者か、承認済みの参加者だけ
drop policy if exists bd_pl_recap_photos_insert on public.pl_recap_photos;
create policy bd_pl_recap_photos_insert on public.pl_recap_photos for insert with check (
  profile_id = auth.uid()
  and exists (
    select 1 from private_lessons l
    where l.id = lesson_id
      and (
        l.organizer_id = auth.uid()
        or exists (
          select 1 from pl_participations p
          where p.lesson_id = l.id and p.profile_id = auth.uid() and p.status = 'approved'
        )
      )
  )
);

-- 削除は、投稿した本人か、そのEVENTの主催者（モデレーション用）
drop policy if exists bd_pl_recap_photos_delete on public.pl_recap_photos;
create policy bd_pl_recap_photos_delete on public.pl_recap_photos for delete using (
  profile_id = auth.uid()
  or exists (select 1 from private_lessons l where l.id = lesson_id and l.organizer_id = auth.uid())
);
