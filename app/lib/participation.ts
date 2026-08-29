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

// NUMBER参加申請時だけ必須で答えてもらう項目（EVENTのダンサーネーム・メール・電話番号とは別の項目）
export type NumberApplicationAnswers = { dancerName: string; instagram: string };

// NUMBERは承認制がないので、参加は単純なINSERT/DELETEだけで完結する（statusは扱わない）
export async function joinNumber(userId: string, numberId: string, answers?: NumberApplicationAnswers): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("number_participations")
    .insert({
      number_id: numberId, profile_id: userId,
      ...(answers ? { answer_dancer_name: answers.dancerName, answer_instagram: answers.instagram } : {}),
    });
  if (error) {
    console.error("number join error:", error);
    return { error: mapJoinError(error.message) };
  }
  return {};
}

export async function cancelNumber(userId: string, numberId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("number_participations").delete()
    .eq("number_id", numberId).eq("profile_id", userId);
  if (error) {
    console.error("number cancel error:", error);
    return { error: "キャンセルに失敗しました" };
  }
  return {};
}

// EVENTの参加申請時だけ必須で答えてもらう項目（レッスンでは使わない）
export type EventApplicationAnswers = { dancerName: string; email: string; phone: string };

export async function joinLesson(userId: string, lessonId: string, answers?: EventApplicationAnswers): Promise<JoinResult> {
  const { data, error } = await supabase
    .from("pl_participations")
    .insert({
      lesson_id: lessonId, profile_id: userId,
      ...(answers ? { answer_dancer_name: answers.dancerName, answer_email: answers.email, answer_phone: answers.phone } : {}),
    })
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
