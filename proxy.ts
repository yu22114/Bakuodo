import { NextRequest, NextResponse } from "next/server";

// 爆踊アプリ本体（bakuodo.vercel.app）はそのまま"/"で今まで通り動かしつつ、
// 紹介LP用に別ドメインを割り当てた時だけ、中身をapp/lp（紹介ページ）にすり替える。
//
// 設定方法（Vercel側の作業）:
//   1. Vercelプロジェクトの Settings → Domains で、取得したドメイン（例: bakuodo.jp）を追加する
//      （このアプリと同じVercelプロジェクトに追加するだけでよい。DNS設定はドメイン取得元で行う）
//   2. Settings → Environment Variables に
//      NEXT_PUBLIC_LP_HOSTNAME = bakuodo.jp（実際に取得したドメイン名） を追加して再デプロイ
// これだけで、そのドメインへのアクセスだけ紹介LPが表示され、bakuodo.vercel.app側の
// アプリ本体（ログイン・DB連携など）には一切影響しない。
export function proxy(request: NextRequest) {
  const lpHost = process.env.NEXT_PUBLIC_LP_HOSTNAME;
  if (!lpHost) return NextResponse.next();

  const host = (request.headers.get("host") ?? "").split(":")[0];
  if (host === lpHost && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/lp";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

// "/"だけを見る。API・静的ファイル・アプリ内の他の画面には一切干渉しない
export const config = {
  matcher: ["/"],
};
