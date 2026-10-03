#!/bin/zsh
# アプリ用の新しいSupabaseに、今のSupabase（プロトタイプ）の「入れ物」だけを写すスクリプト。
#
# 写すもの：表・仕組み（関数・トリガー・RLS）、ジャンル一覧（genres）と聖地スポット（spots）のデータ、
#           写真・動画の置き場所（storage のバケット）とそのルール、ログイン時に動く仕組み（auth.users のトリガー）
# 写さないもの：ユーザー・投稿・コメントなど、ほかのデータはすべて（新しい環境は0人から始める）
#
# 今のSupabaseには「読む」操作しかしない（書き換えない）。
# 新しいSupabaseには、まだ表が1つもない時だけ書き込む（間違って今のSupabaseに流さないための安全装置）。
#
# 使い方（Mac のターミナル）： zsh ~/Bakuodo/scripts/setup-new-supabase.sh
# 必要なもの：Postgres.app（pg_dump / psql）

set -u
PGBIN=/Applications/Postgres.app/Contents/Versions/latest/bin
if [ ! -x "$PGBIN/pg_dump" ]; then
  echo "Postgres.app が見つかりません。先に https://postgresapp.com から入れてください。"
  exit 1
fi

echo "【1/2】今のSupabase（プロトタイプ）の接続文字列（Session pooler）を貼り付けて Enter（画面には出ません）"
read -s OLD_DB; echo
echo "【2/2】新しいSupabase（アプリ用）の接続文字列（Session pooler）を貼り付けて Enter（画面には出ません）"
read -s NEW_DB; echo

if [ -z "$OLD_DB" ] || [ -z "$NEW_DB" ]; then
  echo "接続文字列が空です。中止しました。"; exit 1
fi
if [ "$OLD_DB" = "$NEW_DB" ]; then
  echo "2つの接続文字列が同じです。中止しました。"; exit 1
fi

# 安全装置：新しいSupabaseに既に表があれば止める（今のSupabaseを書き換えてしまう事故を防ぐ）
NEW_TABLES=$("$PGBIN/psql" "$NEW_DB" -tAc "select count(*) from information_schema.tables where table_schema = 'public'") || { echo "新しいSupabaseにつながりませんでした。接続文字列を確認してください。"; exit 1; }
if [ "$NEW_TABLES" != "0" ]; then
  echo "新しいSupabaseに既に表が ${NEW_TABLES} 個あります。今のSupabaseを指定していないか確認してください。中止しました。"; exit 1
fi
OLD_TABLES=$("$PGBIN/psql" "$OLD_DB" -tAc "select count(*) from information_schema.tables where table_schema = 'public'") || { echo "今のSupabaseにつながりませんでした。接続文字列を確認してください。"; exit 1; }
echo "今のSupabaseの表：${OLD_TABLES} 個 → 新しいSupabaseに写します"

WORK=~/bakuodo-backup/new-env
mkdir -p "$WORK" && cd "$WORK" || exit 1

echo "1. 表と仕組みを書き出しています…"
"$PGBIN/pg_dump" "$OLD_DB" --schema-only --no-owner -n public -f 1_schema.sql || { echo "書き出しに失敗しました。"; exit 1; }

echo "2. ジャンル一覧と聖地スポットのデータを書き出しています…"
"$PGBIN/pg_dump" "$OLD_DB" --data-only --no-owner -t public.genres -t public.spots -f 2_master.sql || { echo "書き出しに失敗しました。"; exit 1; }

echo "3. 写真の置き場所のルールと、ログイン時の仕組みを書き出しています…"
"$PGBIN/psql" "$OLD_DB" -tA -f /dev/stdin > 3_storage_auth.sql <<'SQL' || { echo "書き出しに失敗しました。"; exit 1; }
-- バケット（写真・動画の置き場所）
select format('insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values (%L, %L, %L, %L, %L) on conflict (id) do nothing;',
              id, name, public, file_size_limit, allowed_mime_types)
  from storage.buckets;
-- 置き場所の読み書きルール
select format('drop policy if exists %I on storage.objects; create policy %I on storage.objects as %s for %s to %s%s%s;',
              policyname, policyname, permissive, cmd, array_to_string(roles, ', '),
              case when qual is not null then ' using (' || qual || ')' else '' end,
              case when with_check is not null then ' with check (' || with_check || ')' else '' end)
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects';
-- auth.users に付いているトリガー（ログイン・登録時に動く仕組み）
select pg_get_triggerdef(t.oid) || ';'
  from pg_trigger t
 where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;
SQL

echo "4. 新しいSupabaseに写しています…"
{
  "$PGBIN/psql" "$NEW_DB" -f 1_schema.sql
  "$PGBIN/psql" "$NEW_DB" -f 2_master.sql
  "$PGBIN/psql" "$NEW_DB" -f 3_storage_auth.sql
} > 4_apply.log 2>&1

# 「既にある」は新しいプロジェクトに最初から入っている分なので問題ない。それ以外のエラーだけ数える
ERRORS=$(grep "ERROR" 4_apply.log | grep -v "already exists" | wc -l | tr -d ' ')

echo ""
echo "===== 結果 ====="
"$PGBIN/psql" "$NEW_DB" -tAc "select '新しいSupabaseの表：' || count(*) || ' 個' from information_schema.tables where table_schema = 'public'"
"$PGBIN/psql" "$NEW_DB" -tAc "select 'ジャンル：' || count(*) || ' 件' from public.genres"
"$PGBIN/psql" "$NEW_DB" -tAc "select '聖地スポット：' || count(*) || ' 件' from public.spots"
"$PGBIN/psql" "$NEW_DB" -tAc "select '写真・動画の置き場所：' || count(*) || ' 個' from storage.buckets"
"$PGBIN/psql" "$NEW_DB" -tAc "select 'ユーザー：' || count(*) || ' 人（0人ならOK）' from public.profiles"
echo "見過ごせないエラー：${ERRORS} 件"
if [ "$ERRORS" != "0" ]; then
  echo "---- エラーの内容（この部分をClaudeに貼ってください）----"
  grep "ERROR" 4_apply.log | grep -v "already exists"
fi
echo "作業ファイルの場所：$WORK"
