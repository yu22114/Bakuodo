-- ============================================================================
-- 開催が近づいたサイファーのお知らせ (2026-08-17)
--
-- 適用方法: Supabase Dashboard > SQL Editor に全文を貼り付けて Run。
-- ★実行前にバックアップを取ってください（docs/はじめかた.md 第6章）★
--
-- 何をするか:
--   1. cyphers に reminded_at 列を足す（NULL許容。既存の行はNULLのまま）
--      → 「このサイファーはもう通知を送った」という印。二重に届くのを防ぐ。
--   2. notifications.type に許可された値を増やす
--      → 今のDBは 'join','leave','follow','comment' の4つしか受け付けない設定
--        （CHECK制約）になっている。アプリ側のトリガーはすでに
--        'join_request' / 'join_approved' / 'follow_request' も入れようとするので、
--        承認制の参加申請などがエラーで失敗している状態。ここで許可値を広げて直す。
--        今回のリマインド用に 'reminder' も足す。
--
-- 失敗したら何が起きるか:
--   ・1 は列を足すだけなので、失敗しても今のデータは無傷。
--   ・2 は「許可する値のリスト」を広げるだけ。今入っているデータは
--     すべて新しいリストにも含まれるので、消えるデータはない。
--     万一途中で失敗した場合は制約が外れたままになることがあるので、
--     その時はこのファイルをもう一度最初から実行してください。
-- ============================================================================

-- 1. 通知を送った印
alter table public.cyphers
  add column if not exists reminded_at timestamptz;

-- 2. 通知の種類の許可リストを広げる（値を消さずに増やすだけ）
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (type in (
    'join',            -- 参加した
    'leave',           -- キャンセルした
    'follow',          -- フォローされた
    'comment',         -- コメントされた
    'join_request',    -- 参加申請（承認制）
    'join_approved',   -- 参加が承認された
    'follow_request',  -- フォロー申請（鍵アカ）
    'reminder'         -- まもなく開催（今回追加）
  ));
