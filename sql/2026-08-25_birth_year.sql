-- プロフィール編集で「生まれた年（西暦）」を選べるようにする
-- 用途: 既存の「年代」（10代/20代…のざっくり区分）とは別に、正確な生まれ年を持たせる

alter table public.profiles add column if not exists birth_year int;

-- ありえない値が入らないよう、ゆるい範囲だけチェックする
alter table public.profiles drop constraint if exists profiles_birth_year_check;
alter table public.profiles add constraint profiles_birth_year_check
  check (birth_year is null or (birth_year >= 1900 and birth_year <= 2100));
