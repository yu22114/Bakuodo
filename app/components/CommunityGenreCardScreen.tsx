"use client";
import { useState } from "react";
import { ChevronLeft, Trash2, Pencil, X, Check } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { GENRES, GENRE_COLORS, genreLabel, toggleGenre, normalizeInstagramUrl, instagramHandle } from "../lib/constants";
import type { GenreKey } from "../lib/types";
import { useSwipeBack } from "../lib/useSwipeBack";
import { showToast } from "./Toast";
import { PracticeScheduleList, type Member } from "./PracticeScheduleList";

const ACCENT = "#DC2626";

export type GenreCard = { id: string; title: string; instructor_name: string | null; instructor_instagram: string | null; genre: string | null };

// 練習カードをタップして開く画面。中身は練習日程の追加・一覧（PracticeScheduleList）だけ。
// 閲覧は誰でもできるが、書き換えられるのは掲示板の作成者だけ
export function CommunityGenreCardScreen({ card, boardId, isOwn, user, members, onBack, onDeleted, onUpdated }: {
  card: GenreCard;
  boardId: string;
  isOwn: boolean;
  user: SupabaseUser;
  members: Member[] | null;
  onBack: () => void;
  onDeleted: (cardId: string) => void; // カード削除後、親のカード一覧から消してもらう
  onUpdated: (card: GenreCard) => void; // カード編集後、親のカード一覧にも反映してもらう
}) {
  const swipeBack = useSwipeBack(onBack);
  const [cardState, setCardState] = useState(card);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editInstructorName, setEditInstructorName] = useState("");
  const [editInstagram, setEditInstagram] = useState("");
  const [editGenre, setEditGenre] = useState<GenreKey[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const genreColor = cardState.genre && (GENRE_COLORS as Record<string, string>)[cardState.genre] ? (GENRE_COLORS as Record<string, string>)[cardState.genre] : ACCENT;

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    const { error } = await supabase.from("community_board_genre_cards").delete().eq("id", cardState.id);
    setDeleting(false);
    if (!error) { onDeleted(cardState.id); onBack(); }
  };

  const openEdit = () => {
    setEditTitle(cardState.title);
    setEditInstructorName(cardState.instructor_name ?? "");
    setEditInstagram(cardState.instructor_instagram ?? "");
    setEditGenre(cardState.genre ? [cardState.genre as GenreKey] : []);
    setShowEdit(true);
  };

  const saveEdit = async () => {
    const title = editTitle.trim();
    if (!title || savingEdit) return;
    setSavingEdit(true);
    const instructor_name = editInstructorName.trim() || null;
    const instructor_instagram = normalizeInstagramUrl(editInstagram);
    const genre = editGenre[0] ?? null;
    const { error } = await supabase.from("community_board_genre_cards").update({ title, instructor_name, instructor_instagram, genre }).eq("id", cardState.id);
    setSavingEdit(false);
    if (error) { console.error("community_board_genre_cards update error:", error); showToast(`保存に失敗しました: ${error.message}`); return; }
    const updated = { ...cardState, title, instructor_name, instructor_instagram, genre };
    setCardState(updated);
    onUpdated(updated);
    setShowEdit(false);
  };

  return (
    <div {...swipeBack} style={{ position: "fixed", inset: 0, zIndex: 160, background: "#000000", display: "flex", flexDirection: "column", animation: "slideInRight 0.22s ease-out" }}>
      <div style={{ flexShrink: 0, padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D", display: "flex", alignItems: "flex-start", gap: "16px", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
        {/* 背景に敷くジャンル名。ホーム画面のCYPHERカードと同じ仕組み（右側に大きく薄く色付き） */}
        {cardState.genre && (() => {
          const genreText = genreLabel(cardState.genre).toUpperCase();
          return (
            <div aria-hidden="true" style={{ position: "absolute", right: "14px", bottom: "-8px", fontSize: `${Math.round(Math.min(68, Math.round(360 / genreText.length)) * 1.1)}px`, fontStyle: "italic", fontWeight: 900, fontFamily: "'Playfair Display','Noto Sans JP',sans-serif", letterSpacing: "-0.02em", lineHeight: 1, whiteSpace: "nowrap", color: genreColor + "40", pointerEvents: "none", userSelect: "none" }}>
              {genreText}
            </div>
          );
        })()}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", minWidth: 0, position: "relative" }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "600", padding: "10px 16px", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px", flexShrink: 0 }}>
            <ChevronLeft size={18} strokeWidth={2.5} /> 戻る
          </button>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "18px", color: "#F0F0F0", wordBreak: "break-word" }}>{cardState.title}</h2>
            {/* 講師名、その下にInstagramアカウント。設定されているものだけ出す */}
            {cardState.instructor_name && (
              <div style={{ marginTop: "6px" }}>
                <div style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.6)" }}>講師: {cardState.instructor_name}</div>
                {cardState.instructor_instagram && (
                  <a href={cardState.instructor_instagram} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "#A855F7", textDecoration: "none", display: "inline-block", marginTop: "2px" }}>@{instagramHandle(cardState.instructor_instagram)}</a>
                )}
              </div>
            )}
          </div>
        </div>
        {isOwn && (
          <div style={{ display: "flex", gap: "6px", flexShrink: 0, position: "relative" }}>
            <button onClick={openEdit} title="カードを編集"
              style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "rgba(255,255,255,0.6)", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Pencil size={16} />
            </button>
            <button onClick={() => setDeleteConfirm(true)} title="カードを削除"
              style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "rgba(255,255,255,0.6)", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="bd-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        <PracticeScheduleList boardId={boardId} cardId={cardState.id} isOwn={isOwn} user={user} members={members} allowAdd={true} />
      </div>

      {/* カードの編集モーダル。入力項目は作成時と同じ */}
      {showEdit && (
        <div style={{ position: "fixed", inset: 0, zIndex: 260, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setShowEdit(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#141414", borderRadius: "16px", padding: "24px 20px", width: "100%", maxWidth: "340px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em" }}>EDIT CARD</div>
              <button onClick={() => setShowEdit(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={18} /></button>
            </div>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="タイトル（例: Hip-Hopクラス）" maxLength={40} autoFocus
              style={{ width: "100%", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
            <input value={editInstructorName} onChange={e => setEditInstructorName(e.target.value)} placeholder="講師の名前（任意）" maxLength={30}
              style={{ width: "100%", marginTop: "6px", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
            <input value={editInstagram} onChange={e => setEditInstagram(e.target.value)} placeholder="講師のInstagram（URLか@ユーザー名・任意）" maxLength={200} autoCapitalize="none" autoCorrect="off"
              style={{ width: "100%", marginTop: "6px", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
            <div style={{ marginTop: "8px" }}>
              <label style={{ display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginBottom: "5px" }}>ジャンル（任意）</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {GENRES.map(g => { const sel = editGenre.includes(g); const col = GENRE_COLORS[g]; return (
                  <button key={g} onClick={() => setEditGenre(list => toggleGenre(list, g))}
                    style={{ padding: "6px 10px", border: sel ? `1px solid ${col}` : "1px solid rgba(255,255,255,0.14)", borderRadius: "20px", background: sel ? `${col}15` : "transparent", color: sel ? col : "rgba(255,255,255,0.5)", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>
                    {genreLabel(g)}
                  </button>
                ); })}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
              <button onClick={() => setShowEdit(false)} disabled={savingEdit} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", padding: "8px 14px", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif" }}>キャンセル</button>
              <button onClick={saveEdit} disabled={!editTitle.trim() || savingEdit} style={{ background: editTitle.trim() ? ACCENT : "rgba(255,255,255,0.12)", border: "none", borderRadius: "8px", cursor: editTitle.trim() ? "pointer" : "default", color: editTitle.trim() ? "#fff" : "rgba(255,255,255,0.3)", padding: "8px 14px", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700 }}>
                <Check size={13} /> {savingEdit ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}

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
