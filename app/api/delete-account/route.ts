import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// アプリ内アカウント削除。クライアントの匿名キーではauth.usersの削除・他人のprofilesの
// 書き換えができないため、サービスロールキーを使ってサーバー側で行う（/api/remindと同じ考え方）。
//
// 「削除」といっても、profilesの行自体は消さない。他のテーブル（投稿・参加履歴・コメント等）が
// profiles.idを参照しているため、行を消すとそれらが壊れてしまう。代わりに個人情報だけ
// 匿名化した上で、Supabase Authの deleteUser を「ソフトデリート」モードで呼び、
// ログインだけできない状態にする（auth.usersの行自体は残るのでprofilesとの整合性は保たれる）。
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!accessToken) return NextResponse.json({ error: "ログインしていません" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 渡されたアクセストークンから本人を特定する（他人のアカウントを消せないようにするため必須）
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) return NextResponse.json({ error: "本人確認に失敗しました" }, { status: 401 });
  const userId = userData.user.id;

  // プロフィールの個人情報を匿名化する。id・作成した投稿・参加履歴等はそのまま残る
  const { error: profileError } = await supabase.from("profiles").update({
    dancer_name: "退会したユーザー",
    avatar_url: null,
    instagram: null,
    bio: null,
    genres: [],
    playlist_url: null,
    team: null,
    birth_year: null,
    age_group: null,
    gender: null,
    dance_years: null,
    is_private: true,
    deleted_at: new Date().toISOString(),
  }).eq("id", userId);
  if (profileError) {
    console.error("delete-account profile update error:", profileError);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // ソフトデリート：ログインだけできなくする（auth.usersの行自体は残す）
  const { error: authError } = await supabase.auth.admin.deleteUser(userId, true);
  if (authError) {
    console.error("delete-account auth delete error:", authError);
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
