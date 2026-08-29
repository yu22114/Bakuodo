import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { NumberSharePage } from "./NumberSharePage";

// OGP用メタデータをサーバー側で取得する（/c/[id]と同じ作り）。
// NUMBERは限定公開を持たないので、visibilityのチェックは不要
async function fetchMeta(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("numbers")
    .select("title, starts_at, location")
    .eq("id", id)
    .maybeSingle();
  return data;
}

// サーバーはUTCで動くため、JSTに寄せてから表示用に整形する。NUMBERは時刻を持たないので日付だけ出す
function formatJstDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const n = await fetchMeta(id);
  if (!n) return { title: "爆踊 | 今日、ここで、踊ろう。" };
  const description = `${formatJstDate(n.starts_at)}〜 @ ${n.location} — このNUMBERに参加しよう`;
  return {
    title: `${n.title} | 爆踊`,
    description,
    openGraph: {
      title: `${n.title} | 爆踊`,
      description,
      siteName: "爆踊",
      type: "website",
    },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NumberSharePage numberId={id} />;
}
