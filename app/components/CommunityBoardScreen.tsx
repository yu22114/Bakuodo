"use client";
import { useState, useEffect } from "react";
import { ChevronLeft, Plus, Trash2, UserPlus, X, LayoutGrid } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { GENRES, GENRE_COLORS, genreLabel, toggleGenre, normalizeInstagramUrl } from "../lib/constants";
import type { GenreKey } from "../lib/types";
import { useSwipeBack } from "../lib/useSwipeBack";
import { useScrollShadow } from "../lib/useScrollShadow";
import { Loading } from "./Loading";
import { CardSkeleton } from "./CardSkeleton";
import { EmptyState } from "./EmptyState";
import { showToast } from "./Toast";
import { PracticeScheduleList, type Member } from "./PracticeScheduleList";
import { CommunityGenreCardScreen, InstructorList, type GenreCard, type CardInstructor } from "./CommunityGenreCardScreen";

type BoardDetail = { creator_id: string; subtitle: string | null; image_urls: string[] };
type DraftInstructor = { name: string; instagram: string };
const EMPTY_INSTRUCTOR: DraftInstructor = { name: "", instagram: "" };

// マイコミュニティのカードを押すと開く画面。中身は練習カードの一覧（タップすると中の練習日程を見られる）。
// 閲覧・練習カードの作成はこの掲示板を見られる人なら誰でもできる。掲示板自体の削除・編集は作成者だけ
export function CommunityBoardScreen({ board, user, onBack, onViewProfile }: {
  board: { id: string; title: string };
  user: SupabaseUser;
  onBack: () => void;
  onViewProfile?: (id: string) => void;
}) {
  const swipeBack = useSwipeBack(onBack);
  // 一覧をスクロールした時、固定ヘッダーの下にうっすら影を出す
  const scrollShadow = useScrollShadow<HTMLDivElement>();
  const [detail, setDetail] = useState<BoardDetail | null>(null);
  // 練習カード（作成者がタイトルを決めて自由に作る。練習日程はこのカードの中に追加する）
  const [genreCards, setGenreCards] = useState<GenreCard[] | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardInstructors, setNewCardInstructors] = useState<DraftInstructor[]>([{ ...EMPTY_INSTRUCTOR }]);
  const [newCardGenre, setNewCardGenre] = useState<GenreKey[]>([]);
  const [addingCard, setAddingCard] = useState(false);
  const [deleteCardTarget, setDeleteCardTarget] = useState<string | null>(null);
  const [deletingCard, setDeletingCard] = useState(false);
  const [members, setMembers] = useState<Member[] | null>(null);
  // タップして開いている練習カード（もう一段階中に入った画面）
  const [openCard, setOpenCard] = useState<GenreCard | null>(null);
  // 個人用アカウントが参加申請済みのカードID一覧（作成者はnullのまま＝全カードにアクセスできる）
  const [myCardIds, setMyCardIds] = useState<Set<string> | null>(null);
  const [applyingCardId, setApplyingCardId] = useState<string | null>(null);

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
    const { data } = await supabase.from("community_board_genre_cards")
      .select("id, title, instructor_name, instructor_instagram, genre, instructors:community_board_genre_card_instructors(id, name, instagram, sort_order)")
      .eq("board_id", board.id).order("sort_order", { ascending: true }).order("created_at", { ascending: true })
      .order("sort_order", { referencedTable: "community_board_genre_card_instructors", ascending: true });
    setGenreCards((data as any[])?.map(c => ({ ...c, instructors: c.instructors ?? [] })) ?? []);
  };

  // 自分が参加申請済みのカードID一覧（MYBOARDを開いた時点で取得する）
  const fetchMyCardMemberships = async () => {
    const { data } = await supabase.from("community_board_genre_card_members").select("card_id").eq("profile_id", user.id);
    setMyCardIds(new Set((data ?? []).map((r: any) => r.card_id)));
  };

  useEffect(() => {
    async function fetchDetail() {
      const { data } = await supabase.from("community_boards").select("creator_id, subtitle, image_urls").eq("id", board.id).single();
      if (data) {
        setDetail({ creator_id: (data as any).creator_id, subtitle: (data as any).subtitle, image_urls: (data as any).image_urls ?? [] });
        fetchMembers((data as any).creator_id);
        if ((data as any).creator_id !== user.id) fetchMyCardMemberships();
      }
    }
    fetchDetail();
    fetchGenreCards();
  }, [board.id]);

  const isOwn = detail?.creator_id === user.id;

  // 参加を申請する。承認は不要ですぐに入れるようになる
  const applyToCard = async (cardId: string) => {
    if (applyingCardId) return;
    setApplyingCardId(cardId);
    const { error } = await supabase.from("community_board_genre_card_members").insert({ card_id: cardId, profile_id: user.id });
    setApplyingCardId(null);
    if (error) { console.error("community_board_genre_card_members insert error:", error); showToast(`申請に失敗しました: ${error.message}`); return; }
    setMyCardIds(prev => new Set(prev ?? []).add(cardId));
  };

  // 参加申請を取り消す
  const cancelApplication = async (cardId: string) => {
    const { error } = await supabase.from("community_board_genre_card_members").delete().eq("card_id", cardId).eq("profile_id", user.id);
    if (error) { console.error("community_board_genre_card_members delete error:", error); showToast(`取り消しに失敗しました: ${error.message}`); return; }
    setMyCardIds(prev => { const next = new Set(prev ?? []); next.delete(cardId); return next; });
  };

  // 作成者は全カードが対象。個人用アカウントは参加申請済みのカードだけが「入れるカード」、
  // それ以外は「参加を申請できるカード」に振り分ける
  const joinedCards = isOwn ? (genreCards ?? []) : (genreCards ?? []).filter(c => myCardIds?.has(c.id));
  const unjoinedCards = isOwn ? [] : (genreCards ?? []).filter(c => !myCardIds?.has(c.id));

  const updateNewInstructor = (i: number, field: keyof DraftInstructor, value: string) => {
    setNewCardInstructors(list => list.map((ins, idx) => idx === i ? { ...ins, [field]: value } : ins));
  };
  const addNewInstructor = () => setNewCardInstructors(list => [...list, { ...EMPTY_INSTRUCTOR }]);
  const removeNewInstructor = (i: number) => setNewCardInstructors(list => list.filter((_, idx) => idx !== i));
  const resetAddCardForm = () => { setNewCardTitle(""); setNewCardInstructors([{ ...EMPTY_INSTRUCTOR }]); setNewCardGenre([]); };

  // 練習カードを作る。IDは先に用意して読み返しをしない＝RLSのRETURNING問題を避ける
  const addCard = async () => {
    const title = newCardTitle.trim();
    if (!title || addingCard) return;
    setAddingCard(true);
    const newId = crypto.randomUUID();
    const genre = newCardGenre[0] ?? null;
    const { error } = await supabase.from("community_board_genre_cards").insert({ id: newId, board_id: board.id, title, genre });
    if (error) { setAddingCard(false); console.error("community_board_genre_cards insert error:", error); showToast(`カードの作成に失敗しました: ${error.message}`); return; }

    // 作成者本人（掲示板の作成者）以外が作った場合は、自分をそのカードのメンバーとして
    // 登録しておく。そうしないと自分で作ったカードなのに参加申請が必要になってしまう
    if (!isOwn) {
      const { error: memErr } = await supabase.from("community_board_genre_card_members").insert({ card_id: newId, profile_id: user.id });
      if (memErr) console.error("community_board_genre_card_members insert error:", memErr);
      else setMyCardIds(prev => new Set(prev ?? []).add(newId));
    }

    // 名前を入れた講師だけ登録する（空欄の行は無視）
    const validInstructors = newCardInstructors.map(ins => ({ name: ins.name.trim(), instagram: normalizeInstagramUrl(ins.instagram) })).filter(ins => ins.name);
    const instructors: CardInstructor[] = validInstructors.map(ins => ({ id: crypto.randomUUID(), name: ins.name, instagram: ins.instagram }));
    if (instructors.length > 0) {
      const { error: insErr } = await supabase.from("community_board_genre_card_instructors").insert(
        instructors.map((ins, i) => ({ id: ins.id, card_id: newId, name: ins.name, instagram: ins.instagram, sort_order: i }))
      );
      if (insErr) console.error("community_board_genre_card_instructors insert error:", insErr);
    }
    setAddingCard(false);
    setGenreCards(list => [...(list ?? []), { id: newId, title, instructor_name: null, instructor_instagram: null, genre, instructors }]);
    resetAddCardForm(); setShowAddCard(false);
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
      <div style={{ flexShrink: 0, padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D", display: "flex", alignItems: "flex-start", gap: "16px", boxShadow: scrollShadow.scrolled ? "0 4px 12px rgba(0,0,0,0.35)" : "none", transition: "box-shadow 0.2s ease", position: "relative", zIndex: 1 }}>
        <button onClick={onBack} style={{ background: "linear-gradient(180deg, #303030, #1c1c1c)", boxShadow: "0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "600", padding: "10px 16px", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px", flexShrink: 0 }}>
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

      <div ref={scrollShadow.ref} className="bd-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        {detail === null ? (
          <Loading />
        ) : (
          <>
          {/* 添付画像はカード（一覧）側だけの表紙用。詳細画面には出さない */}
          {/* メンバー欄：一覧は出さず合計人数だけ表示する */}
          {members && members.length > 0 && (
            <div style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginBottom: "16px" }}>メンバー {members.length}人</div>
          )}

          {/* 練習カードを作る（作成者以外も含め、この掲示板を見られる人なら誰でも）。タイトルを自由に決められる */}
          <div style={{ marginBottom: "16px" }}>
              {!showAddCard ? (
                <button onClick={() => setShowAddCard(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", background: "none", border: "1px dashed rgba(255,255,255,0.25)", borderRadius: "8px", padding: "10px", color: "rgba(255,255,255,0.6)", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", boxSizing: "border-box" }}>
                  <Plus size={14} /> カードを作る
                </button>
              ) : (
                <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "8px", padding: "10px" }}>
                  <input value={newCardTitle} onChange={e => setNewCardTitle(e.target.value)} placeholder="タイトル（例: Hip-Hopクラス）" maxLength={40} autoFocus
                    style={{ width: "100%", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />

                  <div style={{ marginTop: "10px" }}>
                    <label style={{ display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>講師（任意・複数登録できます）</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {newCardInstructors.map((ins, i) => (
                        <div key={i} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                            <input value={ins.name} onChange={e => updateNewInstructor(i, "name", e.target.value)} placeholder="講師名" maxLength={30}
                              style={{ width: "100%", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
                            <input value={ins.instagram} onChange={e => updateNewInstructor(i, "instagram", e.target.value)} placeholder="Instagram（URLか@ユーザー名・任意）" maxLength={200} autoCapitalize="none" autoCorrect="off"
                              style={{ width: "100%", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
                          </div>
                          {newCardInstructors.length > 1 && (
                            <button onClick={() => removeNewInstructor(i)} title="この講師を削除" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: "4px", flexShrink: 0 }}><X size={15} /></button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button onClick={addNewInstructor} style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "5px", background: "none", border: "1px dashed rgba(255,255,255,0.25)", borderRadius: "6px", padding: "7px 10px", color: "rgba(255,255,255,0.6)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>
                      <UserPlus size={13} /> 講師を追加
                    </button>
                  </div>

                  <div style={{ marginTop: "10px" }}>
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
                    <button onClick={() => { setShowAddCard(false); resetAddCardForm(); }} disabled={addingCard} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", padding: "7px 12px", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif" }}>キャンセル</button>
                    <button onClick={addCard} disabled={!newCardTitle.trim() || addingCard} style={{ background: newCardTitle.trim() ? "#DC2626" : "rgba(255,255,255,0.12)", border: "none", borderRadius: "8px", cursor: newCardTitle.trim() ? "pointer" : "default", color: newCardTitle.trim() ? "#fff" : "rgba(255,255,255,0.3)", padding: "7px 12px", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700 }}>{addingCard ? "作成中..." : "作成する"}</button>
                  </div>
                </div>
              )}
            </div>

          {/* 練習カードの一覧（参加申請済みのカードだけ）。参加中のカードを優先して上に出す。
              タップするとその中の練習日程を見る画面が開く */}
          {genreCards === null || (!isOwn && myCardIds === null) ? (
            <CardSkeleton />
          ) : joinedCards.length === 0 ? (
            <EmptyState icon={LayoutGrid} padding="40px 16px">
              {isOwn ? "まだ練習カードがありません" : "参加申請したカードはまだありません"}
            </EmptyState>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {joinedCards.map(card => {
                const genreColor = card.genre && (GENRE_COLORS as Record<string, string>)[card.genre] ? (GENRE_COLORS as Record<string, string>)[card.genre] : "#DC2626";
                // 背景に敷くジャンル名。ホーム画面のCYPHERカードと同じ仕組み（右下に大きく薄く）
                const genreText = card.genre ? genreLabel(card.genre).toUpperCase() : "";
                return (
                  <button key={card.id} onClick={() => setOpenCard(card)}
                    style={{ width: "100%", boxSizing: "border-box", textAlign: "left", background: "linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.1) 46%, rgba(255,255,255,0.02) 58%, transparent 72%), linear-gradient(150deg, #2c2c2c 0%, #1a1a1a 25%, #242424 48%, #161616 70%, #282828 100%)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "10px", padding: "14px 16px", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                    {card.genre && (
                      <div aria-hidden="true" style={{ position: "absolute", right: "14px", bottom: "-8px", fontSize: `${Math.round(Math.min(68, Math.round(360 / genreText.length)) * 1.1)}px`, fontStyle: "italic", fontWeight: 900, fontFamily: "'Playfair Display','Noto Sans JP',sans-serif", letterSpacing: "-0.02em", lineHeight: 1, whiteSpace: "nowrap", color: genreColor + "73", pointerEvents: "none", userSelect: "none" }}>
                        {genreText}
                      </div>
                    )}
                    <div style={{ position: "relative" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: genreColor, flexShrink: 0 }} />
                          <span style={{ fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.title}</span>
                        </div>
                        {isOwn ? (
                          <span onClick={e => { e.stopPropagation(); setDeleteCardTarget(card.id); }} title="カードを削除"
                            style={{ background: "none", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "6px", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: "5px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Trash2 size={13} />
                          </span>
                        ) : (
                          <span onClick={e => { e.stopPropagation(); cancelApplication(card.id); }} title="参加申請を取り消す"
                            style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "6px", cursor: "pointer", padding: "5px 8px", flexShrink: 0 }}>
                            取り消す
                          </span>
                        )}
                      </div>
                      {/* 講師名・その下にInstagramアカウントを表示する。instructorsが空の古いカードは旧フィールドにフォールバック */}
                      <div style={{ paddingLeft: "14px" }}>
                        <InstructorList instructors={card.instructors.length > 0 ? card.instructors : card.instructor_name ? [{ name: card.instructor_name, instagram: card.instructor_instagram }] : []} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 個人用アカウント：参加を申請できるカード。参加中のカードより下に置く。
              タイトル・講師・ジャンルは見えるが中には入れず、申請ボタンだけを出す */}
          {!isOwn && genreCards !== null && myCardIds !== null && unjoinedCards.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>参加を申請できるカード</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {unjoinedCards.map(card => {
                  const genreColor = card.genre && (GENRE_COLORS as Record<string, string>)[card.genre] ? (GENRE_COLORS as Record<string, string>)[card.genre] : "#DC2626";
                  return (
                    <div key={card.id} style={{ width: "100%", boxSizing: "border-box", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: genreColor, flexShrink: 0 }} />
                        <span style={{ fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.title}</span>
                      </div>
                      <div style={{ paddingLeft: "14px" }}>
                        <InstructorList instructors={card.instructors.length > 0 ? card.instructors : card.instructor_name ? [{ name: card.instructor_name, instagram: card.instructor_instagram }] : []} />
                      </div>
                      <button onClick={() => applyToCard(card.id)} disabled={applyingCardId === card.id}
                        style={{ marginTop: "10px", width: "100%", padding: "9px", border: "none", borderRadius: "8px", background: "linear-gradient(135deg, #DC2626, #A61B1B)", color: "#fff", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, cursor: "pointer", opacity: applyingCardId === card.id ? 0.6 : 1 }}>
                        {applyingCardId === card.id ? "申請中..." : "参加を申請する"}
                      </button>
                    </div>
                  );
                })}
              </div>
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
          <div onClick={e => e.stopPropagation()} style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderRadius: "12px", padding: "28px 24px", width: "100%", maxWidth: "320px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>🗑️</div>
            <div style={{ fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "20px", color: "#F0F0F0", marginBottom: "8px" }}>カードを削除</div>
            <div style={{ fontSize: "13px", color: "#F0F0F0", marginBottom: "24px", lineHeight: "1.6" }}>削除すると、このカードの中の練習日程もすべて消えます。元に戻せません。本当に削除しますか？</div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteCardTarget(null)} style={{ flex: 1, padding: "12px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "8px", background: "none", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#F0F0F0" }}>キャンセル</button>
              <button onClick={deleteCard} disabled={deletingCard} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", background: "linear-gradient(135deg, #DC2626, #A61B1B)", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#FFFFFF", fontWeight: "bold" }}>{deletingCard ? "削除中..." : "削除する"}</button>
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
          onBack={() => setOpenCard(null)}
          onDeleted={cardId => setGenreCards(list => (list ?? []).filter(c => c.id !== cardId))}
          onUpdated={updated => setGenreCards(list => (list ?? []).map(c => c.id === updated.id ? updated : c))}
          onViewProfile={onViewProfile}
        />
      )}
    </div>
  );
}
