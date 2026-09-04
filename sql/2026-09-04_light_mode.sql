-- ホーム画面（背景・タブ・カード）を自分の画面だけ白テーマにできる設定。
-- 既存のテーマカラー（他人から見た時のアクセントカラー）とは別の、本人の画面表示だけに効く設定なので分けて持つ。
-- profilesは既に本人だけ更新できるポリシー（bd_profiles_update）があるため、RLSの変更は不要
alter table public.profiles add column if not exists light_mode boolean not null default false;
