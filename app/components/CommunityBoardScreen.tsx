"use client";
import { useState, useEffect } from "react";
import { ChevronLeft, Trash2, Send, MapPin, Calendar } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { timeAgo } from "../lib/constants";
import type { GenreKey } from "../lib/types";
import { useCommunityBoard } from "../lib/useCommunityBoard";
import { useSwipeBack } from "../lib/useSwipeBack";
import { Loading } from "./Loading";
import { GenreBadge } from "./GenreBadge";

const ACCENT = "#DC2626";

// 公演日程を「9/20(日)」のように短く表示する（CommunityScreenと同じ）
function formatJaDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`;
}

type BoardDetail = { subtitle: string | null; venue: string | null; genre: GenreKey | null; event_date: string | null; event_start_date: string | null; event_end_date: string | null };
type Instructor = { id: string; name: string; instagram: string | null };

export function CommunityBoardScreen({ board, user, onBack, onViewProfile }: {
  board: { id: string; title: string };
  user: SupabaseUser;
  onBack: () => void;
  onViewProfile?: (id: string) => void;
}) {
  const swipeBack = useSwipeBack(onBack);
  const { posts, loading, postText, setPostText, posting, postMessage, deletePost } = useCommunityBoard(board.id, user);
  const [detail, setDetail] = useState<BoardDetail | null>(null);
  const [instructors, setInstructors] = useState<Instructor[]>([]);

  useEffect(() => {
    async function fetchDetail() {
      const [{ data: boardData }, { data: instructorData }] = await Promise.all([
        supabase.from("community_boards").select("subtitle, venue, genre, event_date, event_start_date, event_end_date").eq("id", board.id).single(),
        supabase.from("community_board_instructors").select("id, name, instagram").eq("board_id", board.id).order("sort_order", { ascending: true }),
      ]);
      if (boardData) setDetail(boardData as any);
      if (instructorData) setInstructors(instructorData as any);
    }
    fetchDetail();
  }, [board.id]);

  const hasDetail = detail && (detail.subtitle || detail.genre || detail.event_start_date || detail.event_date || detail.venue);

  return (
    <div {...swipeBack} style={{ position: "fixed", inset: 0, zIndex: 150, background: "#000000", display: "flex", flexDirection: "column", animation: "slideInRight 0.22s ease-out" }}>
      <div style={{ flexShrink: 0, padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D", display: "flex", alignItems: "center", gap: "16px" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "600", padding: "10px 16px", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px", flexShrink: 0 }}>
          <ChevronLeft size={18} strokeWidth={2.5} /> 戻る
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: ACCENT, letterSpacing: "0.15em", marginBottom: "2px" }}>BOARD</div>
          <h2 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "18px", color: "#F0F0F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>【{board.title}】</h2>
        </div>
      </div>

      <div className="bd-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        {(hasDetail || instructors.length > 0) && (
          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "14px 16px", marginBottom: "20px" }}>
            {detail?.genre && <div style={{ marginBottom: "10px" }}><GenreBadge genre={detail.genre} /></div>}
            {detail?.subtitle && <div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", marginBottom: "10px" }}>{detail.subtitle}</div>}
            {(detail?.event_start_date || detail?.event_date) && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", marginBottom: "6px" }}>
                <Calendar size={12} color="rgba(255,255,255,0.5)" />
                {detail?.event_start_date
                  ? formatJaDate(detail.event_start_date) + (detail.event_end_date ? `〜${formatJaDate(detail.event_end_date)}` : "")
                  : detail?.event_date}
              </div>
            )}
            {detail?.venue && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", marginBottom: instructors.length > 0 ? "10px" : 0 }}>
                <MapPin size={12} color="rgba(255,255,255,0.5)" />{detail.venue}
              </div>
            )}
            {instructors.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", paddingTop: (detail?.genre || detail?.subtitle || detail?.event_start_date || detail?.event_date || detail?.venue) ? "8px" : 0, borderTop: (detail?.genre || detail?.subtitle || detail?.event_start_date || detail?.event_date || detail?.venue) ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                {instructors.map(ins => (
                  <div key={ins.id} style={{ display: "flex", alignItems: "baseline", gap: "8px", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif" }}>
                    <span style={{ color: "#F0F0F0", fontWeight: "bold" }}>{ins.name}</span>
                    {ins.instagram && (
                      <a href={`https://instagram.com/${ins.instagram}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: "#A855F7", textDecoration: "none" }}>@{ins.instagram}</a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
