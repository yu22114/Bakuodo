import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { CypherSharePage } from "./CypherSharePage";

// OGP用メタデータをサーバー側で取得する。
// 限定公開サイファーはRLS（anon）で読めないため、自動的に汎用メタデータになる。
async function fetchMeta(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("cyphers")
    .select("title, starts_at, location, visibility")
    .eq("id", id)
    .maybeSingle();
  if (!data || (data.visibility && data.visibility !== "public")) return null;
  return data;
}

// サーバーはUTCで動くため、JSTに寄せてから表示用に整形する
function formatJst(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const c = await fetchMeta(id);
  if (!c) return { title: "爆踊 | 今日、ここで、踊ろう。" };
  const description = `${formatJst(c.starts_at)}〜 @ ${c.location} — このサイファーに参加しよう`;
  return {
    title: `${c.title} | 爆踊`,
    description,
    openGraph: {
      title: `${c.title} | 爆踊`,
      description,
      siteName: "爆踊",
      type: "website",
    },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CypherSharePage cypherId={id} />;
}
