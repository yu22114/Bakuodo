import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 終了したサイファーを自動削除するCronジョブ用エンドポイント
export async function GET(request: Request) {
  // Vercel CronからのリクエストかどうかをAuthorizationヘッダーで確認
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // サービスロールキーでSupabaseに接続（RLSをバイパス）
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const threshold = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 終了から1時間後

  // 削除対象のcypher_idを先に取得
  const { data: expired, error: fetchError } = await supabase
    .from("cyphers")
    .select("id")
    .lt("starts_at", threshold);

  if (fetchError) {
    console.error("cleanup fetch error:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!expired || expired.length === 0) {
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
