-- プロフィールに「個人用」「団体用」の種別を持たせる
-- 用途: 同じ人が団体用Googleアカウントと個人用Googleアカウントを使い分ける際、
--       それぞれのプロフィールがどちらの用途かを見分けられるようにする（プロフィール編集画面で設定）

alter table public.profiles add column if not exists account_type text not null default 'individual';

-- 値は増やすだけにできるよう、制約は緩め（個人/団体の2値のみ許可）
alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles add constraint profiles_account_type_check
  check (account_type in ('individual', 'organization'));
