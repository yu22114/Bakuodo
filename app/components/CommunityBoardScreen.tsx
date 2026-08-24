"use client";
import { useState, useEffect } from "react";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { GENRES, GENRE_COLORS, genreLabel, toggleGenre, normalizeInstagramUrl, instagramHandle } from "../lib/constants";
import type { GenreKey } from "../lib/types";
import { useSwipeBack } from "../lib/useSwipeBack";
import { Loading } from "./Loading";
import { showToast } from "./Toast";
import { PracticeScheduleList, type Member } from "./PracticeScheduleList";
import { CommunityGenreCardScreen, type GenreCard } from "./CommunityGenreCardScreen";

type BoardDetail = { creator_id: string; subtitle: string | null };

// マイコミュニティのカードを押すと開く画面。中身は練習カードの一覧（タップすると中の練習日程を見られる）。
// 閲覧は誰でもできるが、書き換えられるのは作成者だけ
export function CommunityBoardScreen({ board, user, onBack }: {
  board: { id: string; title: string };
  user: SupabaseUser;
  onBack: () => void;
  onViewProfile?: (id: string) => void;
}) {
  const swipeBack = useSwipeBack(onBack);
  const [detail, setDetail] = useState<BoardDetail | null>(null);
  // 練習カード（作成者がタイトルを決めて自由に作る。練習日程はこのカードの中に追加する）
  const [genreCards, setGenreCards] = useState<GenreCard[] | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardInstructorName, setNewCardInstructorName] = useState("");
  const [newCardInstagram, setNewCardInstagram] = useState("");
  const [newCardGenre, setNewCardGenre] = useState<GenreKey[]>([]);
  const [addingCard, setAddingCard] = useState(false);
  const [deleteCardTarget, setDeleteCardTarget] = useState<string | null>(null);
  const [deletingCard, setDeletingCard] = useState(false);
  const [members, setMembers] = useState<Member[] | null>(null);
  // タップして開いている練習カード（もう一段階中に入った画面）
  const [openCard, setOpenCard] = useState<GenreCard | null>(null);
  // カード一覧に出す「全X件」のための件数だけの集計（詳細は各カードの画面で取る）
  const [scheduleCounts, setScheduleCounts] = useState<Record<string, number>>({});

  // メンバー欄：作成者＋招待された人。両方を取ってきて1つのリストにする
  const fetchMembers = async (creatorId: string) => {
    const [{ data: creatorProfile }, { data: invites }] = await Promise.all([
      supabase.from("profiles").select("id, dancer_name, avatar_url, instagram").eq("id", creatorId).single(),
      supabase.from("community_board_invites").select("user_id, profiles:user_id(dancer_name, avatar_url, instagram)").eq("board_id", board.id),
    ]);
    const list: Member[] = [];
    if (creatorProfile) list.push({ id: (creatorProfile as any).id, dancer_name: (creatorProfile as any).dancer_name, avatar_url: (creatorProfile as any).avatar_url, instagram: (creatorProfile as any).instagram, isCreator: true });
    (invites as any[] ?? []).forEach(i => {
      list.push({ id: i.user_id, dancer_name: i.profiles?.dancer_name ?? "UNKNOWN", avatar_url: i.profiles?.avatar_url ?? null, instagram: i.profiles?.instagram ?? null, isCreator: false });
    });
    setMembers(list);
  };

  // 練習カードの一覧（作成者がタイトルを入れて作ったもの）
  const fetchGenreCards = async () => {
    const { data } = await supabase.from("community_board_genre_cards").select("id, title, instructor_name, instructor_instagram, genre")
      .eq("board_id", board.id).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    setGenreCards((data as any[]) ?? []);
  };

  // カード一覧の「全X件」表示用。日程の中身は見ないのでcard_idだけ軽く取る
  const fetchScheduleCounts = async () => {
    const { data } = await supabase.from("community_board_practice_schedules").select("card_id").eq("board_id", board.id);
    const counts: Record<string, number> = {};
    (data as any[] ?? []).forEach(r => { if (r.card_id) counts[r.card_id] = (counts[r.card_id] ?? 0) + 1; });
    setScheduleCounts(counts);
  };

  useEffect(() => {
    async function fetchDetail() {
      const { data } = await supabase.from("community_boards").select("creator_id, subtitle").eq("id", board.id).single();
      if (data) {
        setDetail(data as any);
        fetchMembers((data as any).creator_id);
      }
    }
    fetchDetail();
    fetchGenreCards();
    fetchScheduleCounts();
  }, [board.id]);

  const isOwn = detail?.creator_id === user.id;

  // 練習カードを作る。IDは先に用意して読み返しをしない＝RLSのRETURNING問題を避ける
  const addCard = async () => {
    const title = newCardTitle.trim();
    if (!title || addingCard) return;
    setAddingCard(true);
    const newId = crypto.randomUUID();
    const instructor_name = newCardInstructorName.trim() || null;
    const instructor_instagram = normalizeInstagramUrl(newCardInstagram);
    const genre = newCardGenre[0] ?? null;
    const { error } = await supabase.from("community_board_genre_cards").insert({ id: newId, board_id: board.id, title, instructor_name, instructor_instagram, genre });
    setAddingCard(false);
    if (error) { console.error("community_board_genre_cards insert error:", error); showToast(`カードの作成に失敗しました: ${error.message}`); return; }
    setGenreCards(list => [...(list ?? []), { id: newId, title, instructor_name, instructor_instagram, genre }]);
    setNewCardTitle(""); setNewCardInstructorName(""); setNewCardInstagram(""); setNewCardGenre([]); setShowAddCard(false);
  };

  const deleteCard = async () => {
    if (!deleteCardTarget || deletingCard) return;
    setDeletingCard(true);
    const { error } = await supabase.from("community_board_genre_cards").delete().eq("id", deleteCardTarget);
    setDeletingCard(false);
    if (!error) setGenreCards(list => (list ?? []).filter(c => c.id !== deleteCardTarget));
    setDeleteCardTarget(null);
  };

  return (
    <div {...swipeBack} style={{ position: "fixed", inset: 0, zIndex: 150, background: "#000000", display: "flex", flexDirection: "column", animation: "slideInRight 0.22s ease-out" }}>
      <div style={{ flexShrink: 0, padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D", display: "flex", alignItems: "flex-start", gap: "16px" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "600", padding: "10px 16px", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px", flexShrink: 0 }}>
          <ChevronLeft size={18} strokeWidth={2.5} /> 戻る
        </button>
        <div style={{ minWidth: 0 }}>
          {/* タイトル・サブタイトルは省略せず全部見えるように折り返す */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "8px" }}>
            <h2 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "18px", color: "#F0F0F0", wordBreak: "break-word" }}>【{board.title}】</h2>
            {detail?.subtitle && (
              <span style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.55)", wordBreak: "break-word" }}>{detail.subtitle}</span>
            )}
          </div>
        </div>
      </div>

      <div className="bd-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        {detail === null ? (
          <Loading />
        ) : (
          <>
          {/* メンバー欄：一覧は出さず合計人数だけ表示する */}
          {members && members.length > 0 && (
            <div style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginBottom: "16px" }}>メンバー {members.length}人</div>
          )}

          {/* 練習カードを作る（作成者だけ）。タイトルを自由に決められる */}
          {isOwn && (
            <div style={{ marginBottom: "16px" }}>
              {!showAddCard ? (
                <button onClick={() => setShowAddCard(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", background: "none", border: "1px dashed rgba(255,255,255,0.25)", borderRadius: "8px", padding: "10px", color: "rgba(255,255,255,0.6)", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", boxSizing: "border-box" }}>
                  <Plus size={14} /> カードを作る
                </button>
              ) : (
                <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "8px", padding: "10px" }}>
                  <input value={newCardTitle} onChange={e => setNewCardTitle(e.target.value)} placeholder="タイトル（例: Hip-Hopクラス）" maxLength={40} autoFocus
                    style={{ width: "100%", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
                  <input value={newCardInstructorName} onChange={e => setNewCardInstructorName(e.target.value)} placeholder="講師の名前（任意）" maxLength={30}
                    style={{ width: "100%", marginTop: "6px", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
                  <input value={newCardInstagram} onChange={e => setNewCardInstagram(e.target.value)} placeholder="講師のInstagram（URLか@ユーザー名・任意）" maxLength={200} autoCapitalize="none" autoCorrect="off"
                    style={{ width: "100%", marginTop: "6px", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
                  <div style={{ marginTop: "8px" }}>
                    <label style={{ display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginBottom: "5px" }}>ジャンル（任意）</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {GENRES.map(g => { const sel = newCardGenre.includes(g); const col = GENRE_COLORS[g]; return (
                        <button key={g} onClick={() => setNewCardGenre(list => toggleGenre(list, g))}
                          style={{ padding: "6px 10px", border: sel ? `1px solid ${col}` : "1px solid rgba(255,255,255,0.14)", borderRadius: "20px", background: sel ? `${col}15` : "transparent", color: sel ? col : "rgba(255,255,255,0.5)", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>
                          {genreLabel(g)}
                        </button>
                      ); })}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
                    <button onClick={() => { setShowAddCard(false); setNewCardTitle(""); setNewCardInstructorName(""); setNewCardInstagram(""); setNewCardGenre([]); }} disabled={addingCard} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", padding: "7px 12px", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif" }}>キャンセル</button>
                    <button onClick={addCard} disabled={!newCardTitle.trim() || addingCard} style={{ background: newCardTitle.trim() ? "#DC2626" : "rgba(255,255,255,0.12)", border: "none", borderRadius: "8px", cursor: newCardTitle.trim() ? "pointer" : "default", color: newCardTitle.trim() ? "#fff" : "rgba(255,255,255,0.3)", padding: "7px 12px", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700 }}>{addingCard ? "作成中..." : "作成する"}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 練習カードの一覧。タップするとその中の練習日程を見る画面が開く */}
          {genreCards === null ? (
            <Loading />
          ) : genreCards.length === 0 ? (
            !isOwn && <div style={{ textAlign: "center", padding: "40px 16px", color: "rgba(255,255,255,0.4)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>まだ練習カードがありません</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {genreCards.map(card => {
                const genreColor = card.genre && (GENRE_COLORS as Record<string, string>)[card.genre] ? (GENRE_COLORS as Record<string, string>)[card.genre] : "#DC2626";
                const count = scheduleCounts[card.id] ?? 0;
                // 背景に敷くジャンル名。ホーム画面のCYPHERカードと同じ仕組み（右下に大きく薄く）
                const genreText = card.genre ? genreLabel(card.genre).toUpperCase() : "";
                return (
                  <button key={card.id} onClick={() => setOpenCard(card)}
                    style={{ width: "100%", boxSizing: "border-box", textAlign: "left", background: "linear-gradient(150deg, #2c2c2c 0%, #1a1a1a 25%, #242424 48%, #161616 70%, #282828 100%)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "10px", padding: "14px 16px", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                    {card.genre && (
                      <div aria-hidden="true" style={{ position: "absolute", right: "14px", bottom: "-8px", fontSize: `${Math.round(Math.min(68, Math.round(360 / genreText.length)) * 1.1)}px`, fontStyle: "italic", fontWeight: 900, fontFamily: "'Playfair Display','Noto Sans JP',sans-serif", letterSpacing: "-0.02em", lineHeight: 1, whiteSpace: "nowrap", color: genreColor + "40", pointerEvents: "none", userSelect: "none" }}>
                        {genreText}
                      </div>
                    )}
                    <div style={{ position: "relative" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: genreColor, flexShrink: 0 }} />
                          <span style={{ fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.title}</span>
                          {count > 0 && <span style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>全{count}件</span>}
                        </div>
                        {isOwn && (
                          <span onClick={e => { e.stopPropagation(); setDeleteCardTarget(card.id); }} title="カードを削除"
                            style={{ background: "none", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "6px", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: "5px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Trash2 size={13} />
                          </span>
                        )}
                      </div>
                      {/* 講師名・その下にInstagramアカウントを表示する。設定されているものだけ出す */}
                      {card.instructor_name && (
                        <div style={{ marginTop: "6px", paddingLeft: "14px" }}>
                          <div style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.6)" }}>講師: {card.instructor_name}</div>
                          {card.instructor_instagram && (
                            <div style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "#A855F7", marginTop: "2px" }}>@{instagramHandle(card.instructor_instagram)}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 練習カードを作る前に登録された既存の練習日程。カードが無いだけで消してはいない */}
          <PracticeScheduleList boardId={board.id} cardId={null} isOwn={isOwn} user={user} members={members} allowAdd={false} heading="カード未設定" />
          </>
        )}
      </div>

      {/* 練習カードの削除確認モーダル */}
      {deleteCardTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 260, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setDeleteCardTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#141414", borderRadius: "12px", padding: "28px 24px", width: "100%", maxWidth: "320px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>🗑️</div>
            <div style={{ fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "20px", color: "#F0F0F0", marginBottom: "8px" }}>カードを削除</div>
            <div style={{ fontSize: "13px", color: "#F0F0F0", marginBottom: "24px", lineHeight: "1.6" }}>削除すると、このカードの中の練習日程もすべて消えます。元に戻せません。本当に削除しますか？</div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteCardTarget(null)} style={{ flex: 1, padding: "12px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "8px", background: "none", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#F0F0F0" }}>キャンセル</button>
              <button onClick={deleteCard} disabled={deletingCard} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", background: "#DC2626", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#FFFFFF", fontWeight: "bold" }}>{deletingCard ? "削除中..." : "削除する"}</button>
            </div>
          </div>
        </div>
      )}

      {/* カードをタップして開く画面（もう一段階中に入る） */}
      {openCard && (
        <CommunityGenreCardScreen
          card={openCard}
          boardId={board.id}
          isOwn={isOwn}
          user={user}
          members={members}
          onBack={() => { setOpenCard(null); fetchScheduleCounts(); }}
          onDeleted={cardId => setGenreCards(list => (list ?? []).filter(c => c.id !== cardId))}
          onUpdated={updated => setGenreCards(list => (list ?? []).map(c => c.id === updated.id ? updated : c))}
        />
      )}
    </div>
  );
}
