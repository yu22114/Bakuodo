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

// community_board_posts（コミュニティ画面の「＋」で作った自由な掲示板）用のフック。
// useComments.tsと同じ形にしている
export function useCommunityBoard(boardId: string, user: SupabaseUser | null) {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!boardId) return;
    async function fetchPosts() {
      setLoading(true);
      const { data } = await supabase
        .from("community_board_posts").select(SELECT)
        .eq("board_id", boardId)
        .order("created_at", { ascending: true });
      if (data) setPosts(data.map((p: any) => ({ ...p, profile: p.profile ?? { id: "", dancer_name: "UNKNOWN", avatar_url: null } })));
      setLoading(false);
    }
    fetchPosts();
  }, [boardId]);

  const postMessage = async () => {
    const text = postText.trim();
    if (!text || posting || !user || !boardId) return;
    setPosting(true);
    const { data, error } = await supabase
      .from("community_board_posts")
      .insert({ board_id: boardId, profile_id: user.id, body: text })
      .select(SELECT).single();
    if (!error && data) {
      setPosts(p => [...p, { ...(data as any), profile: (data as any).profile ?? { id: user.id, dancer_name: "YOU", avatar_url: null } }]);
      setPostText("");
    }
    setPosting(false);
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase.from("community_board_posts").delete().eq("id", id);
    if (!error) setPosts(p => p.filter(x => x.id !== id));
  };

  return { posts, loading, postText, setPostText, posting, postMessage, deletePost };
}
