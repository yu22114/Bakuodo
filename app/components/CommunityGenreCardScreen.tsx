"use client";
import { useState } from "react";
import { ChevronLeft, Trash2 } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { GENRE_COLORS, genreLabel } from "../lib/constants";
import { useSwipeBack } from "../lib/useSwipeBack";
import { PracticeScheduleList, type Member } from "./PracticeScheduleList";

const ACCENT = "#DC2626";

export type GenreCard = { id: string; title: string; instructor_name: string | null; instructor_instagram: string | null; genre: string | null };

// 練習カードをタップして開く画面。中身は練習日程の追加・一覧（PracticeScheduleList）だけ。
// 閲覧は誰でもできるが、書き換えられるのは掲示板の作成者だけ
export function CommunityGenreCardScreen({ card, boardId, isOwn, user, members, onBack, onDeleted }: {
  card: GenreCard;
  boardId: string;
  isOwn: boolean;
  user: SupabaseUser;
  members: Member[] | null;
  onBack: () => void;
  onDeleted: (cardId: string) => void; // カード削除後、親のカード一覧から消してもらう
}) {
  const swipeBack = useSwipeBack(onBack);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const genreColor = card.genre && (GENRE_COLORS as Record<string, string>)[card.genre] ? (GENRE_COLORS as Record<string, string>)[card.genre] : ACCENT;

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    const { error } = await supabase.from("community_board_genre_cards").delete().eq("id", card.id);
    setDeleting(false);
    if (!error) { onDeleted(card.id); onBack(); }
  };

  return (
    <div {...swipeBack} style={{ position: "fixed", inset: 0, zIndex: 160, background: "#000000", display: "flex", flexDirection: "column", animation: "slideInRight 0.22s ease-out" }}>
      <div style={{ flexShrink: 0, padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D", display: "flex", alignItems: "flex-start", gap: "16px", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", minWidth: 0 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "600", padding: "10px 16px", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px", flexShrink: 0 }}>
            <ChevronLeft size={18} strokeWidth={2.5} /> 戻る
          </button>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "18px", color: "#F0F0F0", wordBreak: "break-word" }}>{card.title}</h2>
            {/* 講師名・Instagram・ジャンルは、設定されているものだけ出す */}
            {(card.instructor_name || card.instructor_instagram || card.genre) && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
                {card.instructor_name && <span style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.6)" }}>講師: {card.instructor_name}</span>}
                {card.instructor_instagram && (
                  <a href={card.instructor_instagram} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "#A855F7", textDecoration: "none" }}>Instagram</a>
                )}
                {card.genre && <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: `${genreColor}15`, color: genreColor, fontFamily: "'Noto Sans JP',sans-serif" }}>{genreLabel(card.genre)}</span>}
              </div>
            )}
          </div>
        </div>
        {isOwn && (
          <button onClick={() => setDeleteConfirm(true)} title="カードを削除"
            style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "rgba(255,255,255,0.6)", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="bd-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        <PracticeScheduleList boardId={boardId} cardId={card.id} isOwn={isOwn} user={user} members={members} allowAdd={true} />
      </div>

      {/* カードの削除確認モーダル */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 260, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setDeleteConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#141414", borderRadius: "12px", padding: "28px 24px", width: "100%", maxWidth: "320px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>🗑️</div>
            <div style={{ fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "20px", color: "#F0F0F0", marginBottom: "8px" }}>カードを削除</div>
            <div style={{ fontSize: "13px", color: "#F0F0F0", marginBottom: "24px", lineHeight: "1.6" }}>削除すると、このカードの中の練習日程もすべて消えます。元に戻せません。本当に削除しますか？</div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirm(false)} style={{ flex: 1, padding: "12px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "8px", background: "none", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#F0F0F0" }}>キャンセル</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", background: "#DC2626", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#FFFFFF", fontWeight: "bold" }}>{deleting ? "削除中..." : "削除する"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
