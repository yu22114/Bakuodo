import { useState, useEffect } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

export type Comment = {
  id: string;
  content: string;
  created_at: string;
  profile: { id: string; dancer_name: string; avatar_url: string | null };
};

const SELECT = "id, content, created_at, profile:profile_id(id, dancer_name, avatar_url)";

// サイファーとレッスン（イベント）で同じcommentsテーブルを使う。
// どちらの画面から呼ばれたかは、渡された方のIDで決まる
export function useComments(target: { cypherId: string } | { lessonId: string }, user: SupabaseUser | null) {
  const key = "cypherId" in target ? target.cypherId : target.lessonId;
  const column = "cypherId" in target ? "cypher_id" : "lesson_id";
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!key) return; // モーダルを閉じている間は取りに行かない
    async function fetchComments() {
      const { data } = await supabase
        .from("comments").select(SELECT)
        .eq(column, key)
        .order("created_at", { ascending: true });
      if (data) setComments(data.map((c: any) => ({ ...c, profile: c.profile ?? { id: "", dancer_name: "UNKNOWN", avatar_url: null } })));
    }
    fetchComments();
  }, [key, column]);

  const postComment = async () => {
    const text = commentText.trim();
    if (!text || posting || !user || !key) return;
    setPosting(true);
    // 主催者・参加者への通知はDBトリガーが作成する（sql/2026-08-18_pl_comments.sql）
    const { data, error } = await supabase
      .from("comments")
      .insert({ [column]: key, profile_id: user.id, content: text })
      .select(SELECT).single();
    if (!error && data) {
      setComments(c => [...c, { ...(data as any), profile: (data as any).profile ?? { id: user.id, dancer_name: "YOU", avatar_url: null } }]);
      setCommentText("");
    }
    setPosting(false);
  };

  return { comments, commentText, setCommentText, posting, postComment };
}
