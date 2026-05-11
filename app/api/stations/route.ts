import { NextRequest, NextResponse } from "next/server";

// HeartRails Express API（無料・認証不要）で駅名を検索するプロキシ
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json([]);
  try {
    const res = await fetch(
      `https://express.heartrails.com/api/json?method=getStations&name=${encodeURIComponent(q)}`
    );
    const data = await res.json();
    const seen = new Set<string>();
    const names: string[] = [];
    for (const s of data?.response?.station ?? []) {
      if (!seen.has(s.name)) {
        seen.add(s.name);
        names.push(s.name);
      }
    }
    return NextResponse.json(names.slice(0, 8));
  } catch {
    return NextResponse.json([]);
  }
}
