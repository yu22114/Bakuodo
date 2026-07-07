import { supabase } from "../../lib/supabase";

// 参加・キャンセルのDB操作。
// status（承認制ならpending）・定員チェック・通知の作成はすべてDBトリガーが行うので、
// クライアントはINSERT/DELETEするだけでよい（sql/2026-07-07_security.sql 参照）。

export type JoinResult = { status: "approved" | "pending" } | { error: string };

function mapJoinError(message: string): string {
  if (message.includes("CAPACITY_FULL")) return "定員に達しています";
  if (message.includes("duplicate")) return "すでに参加しています";
  return "参加に失敗しました。時間をおいてもう一度お試しください";
}

export async function joinCypher(userId: string, cypherId: string): Promise<JoinResult> {
  const { data, error } = await supabase
    .from("participations")
    .insert({ cypher_id: cypherId, profile_id: userId })
    .select("status")
    .single();
  if (error || !data) {
    console.error("join error:", error);
    return { error: mapJoinError(error?.message ?? "") };
  }
  return { status: data.status === "pending" ? "pending" : "approved" };
}

export async function cancelCypher(userId: string, cypherId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("participations").delete()
    .eq("cypher_id", cypherId).eq("profile_id", userId);
  if (error) {
    console.error("cancel error:", error);
    return { error: "キャンセルに失敗しました" };
  }
  return {};
}

export async function joinLesson(userId: string, lessonId: string): Promise<JoinResult> {
  const { data, error } = await supabase
    .from("pl_participations")
    .insert({ lesson_id: lessonId, profile_id: userId })
    .select("status")
    .single();
  if (error || !data) {
    console.error("pl join error:", error);
    return { error: mapJoinError(error?.message ?? "") };
  }
  return { status: data.status === "pending" ? "pending" : "approved" };
}

export async function cancelLesson(userId: string, lessonId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("pl_participations").delete()
    .eq("lesson_id", lessonId).eq("profile_id", userId);
  if (error) {
    console.error("pl cancel error:", error);
    return { error: "キャンセルに失敗しました" };
  }
  return {};
}
