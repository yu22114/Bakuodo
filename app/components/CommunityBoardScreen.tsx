"use client";
import { ChevronLeft, Trash2, Send } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { timeAgo } from "../lib/constants";
import { useCommunityBoard } from "../lib/useCommunityBoard";
import { useSwipeBack } from "../lib/useSwipeBack";
import { Loading } from "./Loading";

const ACCENT = "#DC2626";

export function CommunityBoardScreen({ board, user, onBack, onViewProfile }: {
  board: { id: string; title: string };
  user: SupabaseUser;
  onBack: () => void;
  onViewProfile?: (id: string) => void;
}) {
  const swipeBack = useSwipeBack(onBack);
  const { posts, loading, postText, setPostText, posting, postMessage, deletePost } = useCommunityBoard(board.id, user);

  return (
    <div {...swipeBack} style={{ position: "fixed", inset: 0, zIndex: 150, background: "#000000", display: "flex", flexDirection: "column", animation: "slideInRight 0.22s ease-out" }}>
      <div style={{ flexShrink: 0, padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D", display: "flex", alignItems: "center", gap: "16px" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "600", padding: "10px 16px", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px", flexShrink: 0 }}>
          <ChevronLeft size={18} strokeWidth={2.5} /> 戻る
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: ACCENT, letterSpacing: "0.15em", marginBottom: "2px" }}>BOARD</div>
          <h2 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "18px", color: "#F0F0F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{board.title}</h2>
        </div>
      </div>

      <div className="bd-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        {loading ? (
          <Loading />
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 16px", color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>
            まだ投稿はありません。最初のメッセージを書き込みましょう
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {posts.map(p => (
              <div key={p.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <button onClick={() => p.profile.id && onViewProfile?.(p.profile.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>
                    {p.profile.avatar_url
                      ? <img src={p.profile.avatar_url} alt={p.profile.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : p.profile.dancer_name[0]?.toUpperCase() ?? "?"}
                  </div>
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "3px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "bold", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>{p.profile.dancer_name}</span>
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans JP',sans-serif" }}>{timeAgo(p.created_at)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "13px", color: "#F0F0F0", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{p.body}</p>
                </div>
                {p.profile.id === user.id && (
                  <button onClick={() => deletePost(p.id)} title="削除" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: "4px", flexShrink: 0 }}><Trash2 size={13} /></button>
                )}
              </div>
            ))}
          </div>
        )}
        <div style={{ height: "16px" }} />
      </div>

      <div style={{ flexShrink: 0, padding: "12px 16px 24px", borderTop: "1px solid rgba(255,255,255,0.1)", background: "#141414", display: "flex", gap: "8px", alignItems: "flex-end" }}>
        <textarea
          value={postText}
          onChange={e => setPostText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postMessage(); } }}
          placeholder="メッセージを入力..."
          rows={1}
          maxLength={500}
          style={{ flex: 1, resize: "none", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "20px", padding: "10px 14px", fontSize: "13px", fontFamily: "inherit", color: "#F0F0F0", background: "#1A1A1A", outline: "none", lineHeight: 1.5 }}
        />
        <button
          onClick={postMessage}
          disabled={!postText.trim() || posting}
          style={{ width: "38px", height: "38px", borderRadius: "50%", background: postText.trim() ? ACCENT : "rgba(255,255,255,0.12)", border: "none", cursor: postText.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
          <Send size={15} color="#fff" />
        </button>
      </div>
    </div>
  );
}
