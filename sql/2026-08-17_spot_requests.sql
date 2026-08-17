-- ============================================================================
-- スポット申請 (2026-08-17)
--
-- 適用方法: Supabase Dashboard > SQL Editor に全文を貼り付けて Run。
-- ★実行前にバックアップを取ってください（docs/はじめかた.md 第6章）★
--
-- 何をするか:
--   ユーザーが「リストにない練習場所」を送るための spot_requests テーブルを作る。
--   運営が中身を見て、良さそうなら spots に手で追加する運用。
--   （spots に直接書かせると誰でも好きな場所を出せてしまうので分けている）
--
-- 失敗したら何が起きるか:
--   新しいテーブルを足すだけなので、既存のデータには一切触れない。
--   途中で失敗した場合はもう一度実行すればよい（if not exists 付き）。
--
-- 実行後: Supabase → Advisors → Security Advisor を開いて警告が出ていないか確認。
-- 申請の中身を見るには: Table Editor → spot_requests
-- ============================================================================

create table if not exists public.spot_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  location text not null,
  note text,
  created_at timestamptz not null default now()
);

-- RLSを有効にしないと誰でも全件読み書きできてしまうので必ず入れる
alter table public.spot_requests enable row level security;

-- 自分が出した申請だけ見える（他人の申請は見えない）
drop policy if exists bd_spot_requests_select on public.spot_requests;
create policy bd_spot_requests_select on public.spot_requests
  for select using (profile_id = auth.uid());

-- 申請できるのは本人としてだけ（他人になりすまして出せない）
drop policy if exists bd_spot_requests_insert on public.spot_requests;
create policy bd_spot_requests_insert on public.spot_requests
  for insert with check (profile_id = auth.uid());

-- 更新・削除のポリシーは作らない＝アプリからは変更できない（運営がSQL Editorで扱う）
