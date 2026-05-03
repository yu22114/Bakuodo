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

  const { error, count } = await supabase
    .from("cyphers")
    .delete({ count: "exact" })
    .lt("starts_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()); // 終了から1時間後に削除

  if (error) {
    console.error("cleanup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: count });
}
