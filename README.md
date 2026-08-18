# 爆踊（BakuOdori）

サイファーを開催したい人と参加したい人をつなぐ、ダンスイベント管理サービス。

本番: https://bakuodo.vercel.app

## 技術スタック

- Next.js 16 (App Router) / TypeScript / Tailwind CSS v4
- Supabase（Google OAuth・DB・Storage）
- Vercel（デプロイ・Cron）

## セットアップ

1. `.env.local` に以下を設定:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

Vercel側には追加で `SUPABASE_SERVICE_ROLE_KEY`（Cron用）と `CRON_SECRET` を設定する。

2. `sql/` 配下のSQLを日付順にSupabaseのSQL Editorで実行する（RLS・トリガー・ビュー）。

3. 起動:

```bash
npm install
npm run dev
```

## 画面構成

| パス | 内容 |
|------|------|
| `/` | アプリ本体（ログイン→サイファー/レッスン/スポット一覧・投稿・プロフィール） |
| `/c/[id]` | サイファー共有ページ（OGP付き・未ログイン閲覧可） |
| `/u/[id]` | 公開プロフィール |
| `/help` `/terms` | 使い方ガイド・利用規約 |
| `/api/remind` | まもなく開催のお知らせ作成（Vercel Cron・毎日0:00 UTC = 9時JST） |

## アーキテクチャの約束事

- クライアントは **anonキーで直接Supabaseに読み書き**する。書き込みの整合性
  （参加status・定員・なりすまし防止）は**DBトリガーとRLS**が守る。
- **通知（notifications）はDBトリガーだけが作成する**。クライアントからの
  INSERTはRLSで禁止されている。通知を増やしたいときは `sql/` にトリガーを足す。
- 詳細は `sql/2026-07-07_security.sql` のコメント参照。
