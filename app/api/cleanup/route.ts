import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 終了したサイファーを自動削除するCronジョブ用エンドポイント
export async function GET(request: Request) {
  // Vercel CronからのリクエストかどうかをAuthorizationヘッダーで確認
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // サービスロールキーでSupabaseに接続（RLSをバイパス）
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const threshold = Date.now() - 60 * 60 * 1000; // 終了から1時間後

  // 削除候補（開始が閾値より前）を取得し、終了時刻がある場合はそちらで判定する。
  // starts_at だけで消すと、深夜跨ぎなど長時間のサイファーが開催中に消えてしまう。
  const { data: candidates, error: fetchError } = await supabase
    .from("cyphers")
    .select("id, starts_at, ends_at")
    .lt("starts_at", new Date(threshold).toISOString());

  if (fetchError) {
    console.error("cleanup fetch error:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const expired = (candidates ?? []).filter(
    (c: { starts_at: string; ends_at: string | null }) =>
      new Date(c.ends_at ?? c.starts_at).getTime() < threshold
  );

  if (expired.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  const ids = expired.map((c: { id: string }) => c.id);

  // FK制約があるため、関連レコードを先に削除する
  await supabase.from("participations").delete().in("cypher_id", ids);
  await supabase.from("cypher_genres").delete().in("cypher_id", ids);

  const { error, count } = await supabase
    .from("cyphers")
    .delete({ count: "exact" })
    .in("id", ids);

  if (error) {
    console.error("cleanup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: count });
}
