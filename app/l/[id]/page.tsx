import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { LessonSharePage } from "./LessonSharePage";

// OGP用メタデータをサーバー側で取得する。/c/[id]と同じ考え方。
// 限定公開のレッスン・イベントはRLS（anon）で読めないため、自動的に汎用メタデータになる。
async function fetchMeta(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("private_lessons")
    .select("title, starts_at, location, visibility, kind")
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
  const l = await fetchMeta(id);
  if (!l) return { title: "爆踊 | 今日、ここで、踊ろう。" };
  const noun = l.kind === "event" ? "イベント" : "レッスン";
  const description = `${formatJst(l.starts_at)}〜 @ ${l.location} — この${noun}に参加しよう`;
  return {
    title: `${l.title} | 爆踊`,
    description,
    openGraph: {
      title: `${l.title} | 爆踊`,
      description,
      siteName: "爆踊",
      type: "website",
    },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LessonSharePage lessonId={id} />;
}
