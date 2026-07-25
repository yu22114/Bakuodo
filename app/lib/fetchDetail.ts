import { supabase } from "../../lib/supabase";
import type { Cypher, PrivateLesson, GenreKey } from "./types";

// サイファーIDからDetailModal用のフルデータを組み立てる
// （page.tsx のトップ画面と /c/[id] の共有ページの両方から使う）
export async function fetchCypherById(cypherId: string): Promise<Cypher | null> {
  const { data: row } = await supabase.from("cyphers").select(`
    id, title, organizer_id, starts_at, ends_at, location, description, max_members, status, visibility, requires_approval, studio_fee,
    profiles:organizer_id ( dancer_name, avatar_url, instagram ),
    cypher_genres ( genres:genre_id ( name ) )
  `).eq("id", cypherId).single();
  if (!row) return null;
  const name = (row as any).profiles?.dancer_name ?? "UNKNOWN";
  const genres: GenreKey[] = ((row as any).cypher_genres ?? [])
    .map((cg: any) => cg.genres?.name as GenreKey)
    .filter(Boolean);
  const { count: partCount } = await supabase
    .from("participations").select("id", { count: "exact", head: true })
    .eq("cypher_id", cypherId).eq("status", "approved");
  return {
    id: (row as any).id,
    title: (row as any).title,
    starts_at: (row as any).starts_at,
    ends_at: (row as any).ends_at ?? null,
    location: (row as any).location,
    description: (row as any).description ?? "",
    max_members: (row as any).max_members,
    status: (row as any).status,
    visibility: (row as any).visibility ?? "public",
    requires_approval: (row as any).requires_approval ?? false,
    studio_fee: (row as any).studio_fee ?? null,
    genres,
    organizer: { id: (row as any).organizer_id, dancer_name: name, avatar: name[0]?.toUpperCase() ?? "?", avatar_url: (row as any).profiles?.avatar_url ?? null, instagram: (row as any).profiles?.instagram ?? null },
    participant_count: partCount ?? 0,
    hot: (partCount ?? 0) >= 5,
  };
}

// レッスンIDからPLDetailModal用のフルデータを組み立てる
export async function fetchLessonById(lessonId: string): Promise<PrivateLesson | null> {
  const { data: row } = await supabase.from("private_lessons").select(`
    id, title, organizer_id, starts_at, ends_at, location, description, max_members, price, target_level, visibility, requires_approval,
    profiles:organizer_id ( dancer_name, avatar_url, instagram ),
    pl_genres ( genres:genre_id ( name ) )
  `).eq("id", lessonId).single();
  if (!row) return null;
  const name = (row as any).profiles?.dancer_name ?? "UNKNOWN";
  const genres: GenreKey[] = ((row as any).pl_genres ?? [])
    .map((cg: any) => cg.genres?.name as GenreKey)
    .filter(Boolean);
  const { count } = await supabase
    .from("pl_participations").select("id", { count: "exact", head: true })
    .eq("lesson_id", lessonId).eq("status", "approved");
  return {
    id: (row as any).id,
    title: (row as any).title,
    starts_at: (row as any).starts_at,
    ends_at: (row as any).ends_at ?? null,
    location: (row as any).location,
    description: (row as any).description ?? "",
    max_members: (row as any).max_members,
    price: (row as any).price ?? null,
    target_level: (row as any).target_level ?? "all",
    visibility: (row as any).visibility ?? "public",
    requires_approval: (row as any).requires_approval ?? false,
    genres,
    organizer: { id: (row as any).organizer_id, dancer_name: name, avatar: name[0]?.toUpperCase() ?? "?", avatar_url: (row as any).profiles?.avatar_url ?? null, instagram: (row as any).profiles?.instagram ?? null },
    participant_count: count ?? 0,
  };
}
