import { useState, useEffect } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

export type BoardPost = {
  id: string;
  body: string;
  created_at: string;
  profile: { id: string; dancer_name: string; avatar_url: string | null };
};

const SELECT = "id, body, created_at, profile:profile_id(id, dancer_name, avatar_url)";

// event_board_posts（主催者・承認済み参加者だけが読み書きできる掲示板）用のフック。
// useComments.tsと同じ形にして、コメント機能と迷わず対応できるようにする
export function useEventBoard(target: { cypherId: string } | { lessonId: string }, user: SupabaseUser | null) {
  const key = "cypherId" in target ? target.cypherId : target.lessonId;
  const column = "cypherId" in target ? "cypher_id" : "lesson_id";
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!key) return;
    async function fetchPosts() {
      setLoading(true);
      // 参加者でなければRLSに弾かれて空配列が返る（想定内なのでエラー扱いしない）
      const { data } = await supabase
        .from("event_board_posts").select(SELECT)
        .eq(column, key)
        .order("created_at", { ascending: true });
      if (data) setPosts(data.map((p: any) => ({ ...p, profile: p.profile ?? { id: "", dancer_name: "UNKNOWN", avatar_url: null } })));
      setLoading(false);
    }
    fetchPosts();
  }, [key, column]);

  const postMessage = async () => {
    const text = postText.trim();
    if (!text || posting || !user || !key) return;
    setPosting(true);
    const { data, error } = await supabase
      .from("event_board_posts")
      .insert({ [column]: key, profile_id: user.id, body: text })
      .select(SELECT).single();
    if (!error && data) {
      setPosts(p => [...p, { ...(data as any), profile: (data as any).profile ?? { id: user.id, dancer_name: "YOU", avatar_url: null } }]);
      setPostText("");
    }
    setPosting(false);
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase.from("event_board_posts").delete().eq("id", id);
    if (!error) setPosts(p => p.filter(x => x.id !== id));
  };

  return { posts, loading, postText, setPostText, posting, postMessage, deletePost };
}
