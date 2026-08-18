#!/bin/bash
# Claude Code on the web（ブラウザ版）用のセットアップ。
# webセッションには .env.local が無いので、そのままだと npm run build が
# 「Error: supabaseUrl is required.」で必ず落ちる。それを防ぐ。
set -euo pipefail

# 手元のパソコン（本物の .env.local がある）では何もしない
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# 環境設定に本物のSupabase接続情報があればそれを使う。無ければビルドを通すためのダミー。
if [ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ] && [ -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
  SUPABASE_MODE=real
  if [ ! -f .env.local ]; then
    {
      echo "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}"
      echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
    } > .env.local
  fi
else
  SUPABASE_MODE=dummy
  if [ ! -f .env.local ]; then
    {
      echo "NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co"
      echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy"
    } > .env.local
  fi
fi

# npm run build / npm run dev を走らせるために依存を入れておく
if [ ! -d node_modules ]; then
  npm install --no-audit --no-fund
fi

echo "【この環境について（Claude向けの申し送り）】"
if [ "$SUPABASE_MODE" = real ]; then
  echo "- .env.local は本物のSupabase接続情報。npm run dev で本番DBを見る。テストデータで遊ぶこと。"
  echo "  DBに繋がらない場合は、環境のネットワーク設定で *.supabase.co が許可されているか疑う。"
else
  echo "- .env.local はダミー値。npm run build は通るが、DBには繋がらない。"
  echo "  npm run dev を本物のDBで動かすには、環境設定に NEXT_PUBLIC_SUPABASE_URL と"
  echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY を入れ、ネットワーク設定で *.supabase.co を許可する。"
fi
cat << 'MSG'
- ビルドが env まわりで落ちても lib/supabase.ts を書き換えて回避しないこと。
- .env.local はコミットしない（.gitignore 済み）。
- DBを変えたい時、ClaudeがDBを直接触ることはできない。
  sql/YYYY-MM-DD_内容.sql にSQLを書いて、人間がSupabaseのSQL Editorに貼って実行する。
  実行前にバックアップを取る（docs/はじめかた.md 第4章・第5章）。
MSG
