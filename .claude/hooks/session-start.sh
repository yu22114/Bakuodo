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

# ダミーのSupabase接続情報。ビルドを通すためだけのもので、本番DBには繋がらない
if [ ! -f .env.local ]; then
  cat > .env.local << 'ENV'
NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy
ENV
fi

# npm run build を走らせるために依存を入れておく
if [ ! -d node_modules ]; then
  npm install --no-audit --no-fund
fi

cat << 'MSG'
【この環境について（Claude向けの申し送り）】
- .env.local はダミー値。npm run build を通すためだけのもので、本番DBには繋がっていない。
  そのため `npm run dev` で画面を開いても何も表示されない。ここでは使わない。
- 変更後の確認は `npm run build` が通ることだけ。それが唯一の自動チェック。
  ビルドが env まわりで落ちたら、lib/supabase.ts を書き換えて回避しないこと。
- .env.local はコミットしない（.gitignore 済み）。
- DBを変えたい時、ClaudeがDBを直接触ることはできない。
  `sql/YYYY-MM-DD_内容.sql` にSQLを書いて、人間がSupabaseのSQL Editorに貼って手動で実行する。
  実行前にバックアップを取る（docs/はじめかた.md 第4章・第6章）。
MSG
