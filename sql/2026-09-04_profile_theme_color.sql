-- プロフィールに、自分で選べるテーマカラー（アクセントカラー）を追加する。
-- 未設定（null）なら、今まで通り得意ジャンルの色→赤の順にフォールバックする。
-- profilesは既に本人だけ更新できるポリシー（bd_profiles_update）があるため、RLSの変更は不要
alter table public.profiles add column if not exists theme_color text;
