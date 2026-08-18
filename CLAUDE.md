# 爆踊 — CLAUDE.md

## プロジェクト概要

**爆踊**は、サイファーを開催したい人と参加したい人をつなぐダンスイベント管理サービス。
MVP完成済みで、現在は機能改善・追加フェーズ。

- 実装担当: ユーザー（ソロ開発）
- 発起人は別にいる（ユーザーは実装担当）

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS v4
- **バックエンド**: Supabase（認証・DB）
- **認証**: Google OAuth (Supabase Auth)
- **デプロイ**: Vercel
- **アイコン**: Lucide React

## ディレクトリ構成

```
app/          # Next.js App Router のページ・レイアウト
lib/          # ユーティリティ（supabase.ts など）
public/       # 静的ファイル
```

## よく使うコマンド

```bash
npm run dev    # 開発サーバー起動
npm run build  # ビルド
npm run start  # 本番起動
```

### ブラウザ版Claude Code（claude.ai/code）で作業するとき

セッション開始時に `.claude/hooks/session-start.sh` が走り、依存のインストールと
`.env.local` の用意をする。

- 環境設定に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` があればそれを使う。
  無ければダミー値を置く（`npm run build` を通すため）。
- ビルドが `Error: supabaseUrl is required.` で落ちても `lib/supabase.ts` は書き換えない。
  `.env.local` があるかを先に疑う。
- `npm run dev` は起動してログイン画面まで出る。ただし環境のネットワーク設定で
  `*.supabase.co` を許可していないとDBに繋がらず、ログインから先は動かない。
- 本番（https://bakuodo.vercel.app）を開いて確認するには `bakuodo.vercel.app` の許可も要る。
  どちらも塞がれている場合、Claude側でできる確認は `npm run build` までになる。

## Claudeへの指示

### やること
- コードを変更・追加するときは、何をなぜ変えたか日本語で説明する
- コード内のコメントは日本語で書く
- コミットメッセージは英語でOK

### やらないこと
- 頼んでいない部分のリファクタリングはしない
- 特に指示がない限りテストコードは書かない
- 不要な抽象化・ヘルパー関数を作らない
- 頼んでいない機能を追加しない

## セキュリティの約束事（2026-07-07〜）

- 書き込みの整合性（参加status・定員・なりすまし防止・フォロー承認）は
  **DBトリガーとRLS**が守る。定義は `sql/2026-07-07_security.sql`。
- **notifications へのINSERTはクライアントから禁止**（RLSにINSERTポリシーなし）。
  通知は原則すべてDBトリガーが作成する。新しい通知が必要なら sql/ にトリガーを追加する。
  例外は**時間で飛ばす通知**だけ（トリガーは「誰かが何かした時」しか動けないため）。
  それは `app/api/remind/route.ts` がサービスロールキーで作る＝サーバー側限定。
  `notifications.type` に新しい種類を足す時は CHECK制約も広げる
  （`sql/2026-08-17_reminder.sql` と同じ形。値は消さずに増やすだけ）。
- クライアントは参加行を INSERT する際に status を送らない。
  `insert().select("status").single()` でトリガーが決めた結果を読み取る。
- スキーマ変更・ポリシー変更は `sql/` に日付付きファイルで追加し、
  SupabaseのSQL Editorで手動適用する運用。

## 共同編集ルール

運営メンバーが各自Claudeを使って開発・リリースまで行う。**専任のレビュー係はいない。**
つまりClaudeが最後の砦になる。手順書は `docs/はじめかた.md`。

### 禁止（提案もしない）
- `git push --force`, `git reset --hard`, ブランチ・タグの削除。復元手段そのものを壊す操作。
- `.env*` の中身の出力、`SUPABASE_SERVICE_ROLE_KEY` をクライアント側コードへ持ち込むこと。
- `notifications` への INSERT（既存ルール通り、DBトリガーの担当）。
- 依頼されていない範囲のファイル変更。1回の作業＝1テーマに閉じる。

### DBを変えるとき（`sql/` に置くSQL）

**DBは足し算だけ。引き算はしない。** 使わなくなった列やテーブルは消さずに放置する。
消さなければ、間違えても既存データは無傷で、コードを戻すだけで復旧できる。

やっていいこと: `add column if not exists` / `create table if not exists` /
`create index if not exists` / `create or replace function` / `create trigger`

やらないこと（頼まれても代替案を出して止まる）:
- `drop table` / `drop column` / `truncate` / 条件なしの `delete`・`update`
- 列の型変更・リネーム → 新しい列を足して両方書く方式（expand）を提案する
- 既存のRLS・トリガー（`sql/2026-07-07_security.sql`）の無効化・迂回

手順:
1. バックアップを取ったか確認する（`docs/はじめかた.md` 第5章）。取っていなければ先に進まない。
2. そのSQLが何をするか、失敗したら何が起きるかを日本語で先に説明する。
3. `sql/YYYY-MM-DD_内容.sql` に保存し、**Supabaseの SQL Editor で人間が実行する。**
   ClaudeがDBを直接触ることはない。

**新しいテーブルを作るときは、同じファイルにRLSも書く。** `create table` だけだと
RLSが無効のまま＝誰でも全件読み書きできる状態になる。情報漏洩はバックアップでは直せない。

```sql
alter table public.新テーブル enable row level security;
create policy "..." on public.新テーブル for select using (...);
```

書き方は `sql/2026-07-07_security.sql` の末尾を真似る。実行後は
**Supabase → Advisors → Security Advisor** に警告が出ていないか確認するよう促す。

### 出し方

**mainに直接コミットしてpushする。** Vercelが自動で本番に反映する。
おかしければ `git revert` で戻す。

ブランチを切って、先に日本語で説明してから出すもの:
- `sql/` を伴う変更（DBは戻せない）
- ログイン・認証まわり（壊れると全員が入れなくなる）
- 環境変数まわり

### やること
- 変更後は `npm run build` が通ることを確認してから完了報告する。ここが唯一の自動チェック。
- 相手は非エンジニア。専門用語を使ったら、その場で一言で言い換える。

## 補足

- Supabaseのクライアントは `lib/supabase.ts` に集約（anonキー・クライアントサイド認証）
- **終了したサイファーは自動削除しない**（2026-08-17に掃除Cronを廃止）。主催者の開催履歴として
  残すため。消したい時はプロフィール → ACTIVITY → 主催 の🗑ボタンから（レッスンも同じ）。
  トップ一覧には出ない（これから始まる／開催中だけを取るクエリのため）。
- `/c/[id]` はサイファー共有ページ（OGPはサーバー側で生成、本体はクライアント）
- トースト表示は `app/components/Toast.tsx` の `showToast()` を使う（alertは使わない）
