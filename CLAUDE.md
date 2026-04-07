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

## 補足

- Supabaseのクライアントは `lib/supabase.ts` に集約
- 認証フローはSupabase SSR (`@supabase/ssr`) を使用
