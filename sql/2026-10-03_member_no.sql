-- 会員番号（No.0001 の形でプロフィール画面に出す）
--
-- 何をするか：
--   1. profiles に member_no 列を足す（既存のユーザーは空のまま。番号は付かない）
--   2. これから新しくプロフィールができた人に、1・2・3…と登録順に番号を付ける
--   3. 本人や他人が番号を書き換えられないようにする（DB側で守る）
--
-- 気をつけた点：
--   page.tsx はログインのたびに profiles へ upsert（既にあれば何もしない）している。
--   「挿入する前」に番号を取ると、既存ユーザーがログインするだけで番号が消費されて飛んでしまうので、
--   「実際に新しい行ができた後」（after insert）にだけ番号を付ける。
--
-- 既存データは消さない・書き換えない。足し算だけ。

-- 番号の元になる連番（1から始まる）
create sequence if not exists public.bd_member_no_seq start with 1;

-- 会員番号の列。既存の行は空（null）のまま
alter table public.profiles add column if not exists member_no bigint;

-- 同じ番号が2人に付かないように
create unique index if not exists bd_profiles_member_no_key on public.profiles (member_no);

-- 挿入時：アプリから番号を送ってきても無視する（自分で No.0001 を名乗れないように）
create or replace function public.bd_profiles_member_no_guard_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.member_no := null;
  return new;
end;
$$;

drop trigger if exists bd_trg_profiles_member_no_guard_insert on public.profiles;
create trigger bd_trg_profiles_member_no_guard_insert
  before insert on public.profiles
  for each row execute function public.bd_profiles_member_no_guard_insert();

-- 新しい行が本当にできた後だけ、次の番号を付ける
create or replace function public.bd_profiles_member_no_assign()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set member_no = nextval('public.bd_member_no_seq')
   where id = new.id and member_no is null;
  return null;
end;
$$;

drop trigger if exists bd_trg_profiles_member_no_assign on public.profiles;
create trigger bd_trg_profiles_member_no_assign
  after insert on public.profiles
  for each row execute function public.bd_profiles_member_no_assign();

-- 更新時：番号は変えさせない。
-- ただし上の「番号を付ける」処理（トリガーの中から呼ばれる更新）だけは通す
create or replace function public.bd_profiles_member_no_guard_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.member_no is distinct from old.member_no and pg_trigger_depth() <= 1 then
    new.member_no := old.member_no;
  end if;
  return new;
end;
$$;

drop trigger if exists bd_trg_profiles_member_no_guard_update on public.profiles;
create trigger bd_trg_profiles_member_no_guard_update
  before update on public.profiles
  for each row execute function public.bd_profiles_member_no_guard_update();
