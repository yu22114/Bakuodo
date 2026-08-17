import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 開催が近づいたサイファーの参加者に「まもなく開催」のお知らせを作るCronジョブ用エンドポイント。
// 1日1回動かす前提なので、次の36時間以内に始まるものをまとめて対象にする
// （毎朝動かせば、当日ぶんと翌日ぶんが必ず1回は拾える）。
// 同じサイファーで何度も通知しないよう、送ったら cyphers.reminded_at に時刻を書く。
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 通知の作成はクライアントからはできない（RLSにINSERTポリシーがない）ので、
  // サーバー側でサービスロールキーを使う
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const until = new Date(now.getTime() + 36 * 60 * 60 * 1000);

  const { data: soon, error: fetchError } = await supabase
    .from("cyphers")
    .select("id, organizer_id, starts_at")
    .is("reminded_at", null)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", until.toISOString());

  if (fetchError) {
    console.error("remind fetch error:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!soon || soon.length === 0) return NextResponse.json({ notified: 0 });

  const ids = soon.map(c => c.id);
  const { data: parts } = await supabase
    .from("participations")
    .select("cypher_id, profile_id, status")
    .in("cypher_id", ids);

  // 承認待ちの人にはまだ送らない
  const rows = (parts ?? [])
    .filter(p => p.status !== "pending")
    .map(p => ({
      user_id: p.profile_id,
      cypher_id: p.cypher_id,
      actor_id: soon.find(c => c.id === p.cypher_id)?.organizer_id ?? null,
      type: "reminder",
    }));

  if (rows.length > 0) {
    const { error } = await supabase.from("notifications").insert(rows);
    if (error) {
      console.error("remind insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // 送信済みの印。ここで失敗すると翌日もう一度届くだけなので、致命的ではない
  await supabase.from("cyphers").update({ reminded_at: now.toISOString() }).in("id", ids);

  return NextResponse.json({ notified: rows.length, cyphers: ids.length });
}
