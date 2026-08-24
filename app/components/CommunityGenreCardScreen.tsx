"use client";
import { useState, useEffect } from "react";
import { ChevronLeft, Trash2, Pencil, X, Check, UserPlus } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { GENRES, GENRE_COLORS, genreLabel, toggleGenre, normalizeInstagramUrl, instagramHandle } from "../lib/constants";
import type { GenreKey } from "../lib/types";
import { useSwipeBack } from "../lib/useSwipeBack";
import { showToast } from "./Toast";
import { PracticeScheduleList, type Member } from "./PracticeScheduleList";

const ACCENT = "#DC2626";

export type CardInstructor = { id: string; name: string; instagram: string | null };
type DraftInstructor = { name: string; instagram: string };
const EMPTY_INSTRUCTOR: DraftInstructor = { name: "", instagram: "" };

// instructor_name/instructor_instagramは旧仕様（講師1人だけ）の名残。消さずに残し、
// instructorsが空の古いカードだけ表示にフォールバックで使う
export type GenreCard = { id: string; title: string; instructor_name: string | null; instructor_instagram: string | null; genre: string | null; instructors: CardInstructor[] };

// 講師名・その下にInstagramアカウントを並べて出す。空なら何も出さない
export function InstructorList({ instructors }: { instructors: { name: string; instagram: string | null }[] }) {
  if (instructors.length === 0) return null;
  return (
    <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
      {instructors.map((ins, i) => (
        <div key={i}>
          <div style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.6)" }}>講師: {ins.name}</div>
          {ins.instagram && (
            <a href={ins.instagram} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "#A855F7", textDecoration: "none", display: "inline-block", marginTop: "2px" }}>@{instagramHandle(ins.instagram)}</a>
          )}
        </div>
      ))}
    </div>
  );
}

// 練習カードをタップして開く画面。中身は練習日程の追加・一覧（PracticeScheduleList）だけ。
// 閲覧は誰でもできるが、書き換えられるのは掲示板の作成者だけ
export function CommunityGenreCardScreen({ card, boardId, isOwn, user, members, onBack, onDeleted, onUpdated, onViewProfile }: {
  card: GenreCard;
  boardId: string;
  isOwn: boolean;
  user: SupabaseUser;
  members: Member[] | null;
  onBack: () => void;
  onDeleted: (cardId: string) => void; // カード削除後、親のカード一覧から消してもらう
  onUpdated: (card: GenreCard) => void; // カード編集後、親のカード一覧にも反映してもらう
  onViewProfile?: (id: string) => void;
}) {
  const swipeBack = useSwipeBack(onBack);
  const [cardState, setCardState] = useState(card);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editInstructors, setEditInstructors] = useState<DraftInstructor[]>([{ ...EMPTY_INSTRUCTOR }]);
  const [editGenre, setEditGenre] = useState<GenreKey[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  // 個人用アカウントはこのカードに参加申請していないと練習日程の中身を見られない（自動承認）
  const [isMember, setIsMember] = useState<boolean | null>(isOwn ? true : null);
  const [applying, setApplying] = useState(false);
  // 参加申請したユーザー一覧（練習日程を追加の上に表示する。参加状況にも使う）
  const [applicants, setApplicants] = useState<{ id: string; dancer_name: string; avatar_url: string | null; instagram: string | null }[] | null>(null);

  useEffect(() => {
    if (isOwn) { setIsMember(true); return; }
    supabase.from("community_board_genre_card_members").select("card_id").eq("card_id", cardState.id).eq("profile_id", user.id).maybeSingle()
      .then(({ data }) => setIsMember(!!data));
  }, [cardState.id, isOwn, user.id]);

  useEffect(() => {
    async function fetchApplicants() {
      const { data: memberRows } = await supabase.from("community_board_genre_card_members").select("profile_id").eq("card_id", cardState.id);
      const ids = (memberRows ?? []).map((r: any) => r.profile_id);
      if (ids.length === 0) { setApplicants([]); return; }
      const { data: profileRows } = await supabase.from("profiles").select("id, dancer_name, avatar_url, instagram").in("id", ids);
      setApplicants((profileRows ?? []).map((p: any) => ({ id: p.id, dancer_name: p.dancer_name ?? "UNKNOWN", avatar_url: p.avatar_url ?? null, instagram: p.instagram ?? null })));
    }
    fetchApplicants();
  }, [cardState.id]);

  const applyToCard = async () => {
    if (applying) return;
    setApplying(true);
    const { error } = await supabase.from("community_board_genre_card_members").insert({ card_id: cardState.id, profile_id: user.id });
    setApplying(false);
    if (error) { console.error("community_board_genre_card_members insert error:", error); showToast(`申請に失敗しました: ${error.message}`); return; }
    setIsMember(true);
  };

  const genreColor = cardState.genre && (GENRE_COLORS as Record<string, string>)[cardState.genre] ? (GENRE_COLORS as Record<string, string>)[cardState.genre] : ACCENT;
  // instructorsが登録されていればそちらを優先。空の古いカードだけ旧フィールドにフォールバック
  const displayInstructors = cardState.instructors.length > 0
    ? cardState.instructors
    : cardState.instructor_name ? [{ name: cardState.instructor_name, instagram: cardState.instructor_instagram }] : [];

  // 参加状況（○/△/×）に出すメンバー：掲示板の作成者＋このカードに参加申請した個人用アカウント
  const cardMembers: Member[] = [
    ...(members ?? []).filter(m => m.isCreator),
    ...(applicants ?? []).map(a => ({ id: a.id, dancer_name: a.dancer_name, avatar_url: a.avatar_url, instagram: a.instagram, isCreator: false })),
  ];

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    const { error } = await supabase.from("community_board_genre_cards").delete().eq("id", cardState.id);
    setDeleting(false);
    if (!error) { onDeleted(cardState.id); onBack(); }
  };

  const openEdit = () => {
    setEditTitle(cardState.title);
    setEditInstructors(
      cardState.instructors.length > 0 ? cardState.instructors.map(i => ({ name: i.name, instagram: i.instagram ?? "" }))
      : cardState.instructor_name ? [{ name: cardState.instructor_name, instagram: cardState.instructor_instagram ?? "" }]
      : [{ ...EMPTY_INSTRUCTOR }]
    );
    setEditGenre(cardState.genre ? [cardState.genre as GenreKey] : []);
    setShowEdit(true);
  };
  const updateEditInstructor = (i: number, field: keyof DraftInstructor, value: string) => {
    setEditInstructors(list => list.map((ins, idx) => idx === i ? { ...ins, [field]: value } : ins));
  };
  const addEditInstructor = () => setEditInstructors(list => [...list, { ...EMPTY_INSTRUCTOR }]);
  const removeEditInstructor = (i: number) => setEditInstructors(list => list.filter((_, idx) => idx !== i));

  const saveEdit = async () => {
    const title = editTitle.trim();
    if (!title || savingEdit) return;
    setSavingEdit(true);
    const genre = editGenre[0] ?? null;
    const { error } = await supabase.from("community_board_genre_cards").update({ title, genre }).eq("id", cardState.id);
    if (error) { setSavingEdit(false); console.error("community_board_genre_cards update error:", error); showToast(`保存に失敗しました: ${error.message}`); return; }

    // 講師は一旦全部消してから今のフォームの内容で入れ直す
    await supabase.from("community_board_genre_card_instructors").delete().eq("card_id", cardState.id);
    const validInstructors = editInstructors.map(ins => ({ name: ins.name.trim(), instagram: normalizeInstagramUrl(ins.instagram) })).filter(ins => ins.name);
    const newInstructors: CardInstructor[] = validInstructors.map(ins => ({ id: crypto.randomUUID(), name: ins.name, instagram: ins.instagram }));
    if (newInstructors.length > 0) {
      const { error: insErr } = await supabase.from("community_board_genre_card_instructors").insert(
        newInstructors.map((ins, i) => ({ id: ins.id, card_id: cardState.id, name: ins.name, instagram: ins.instagram, sort_order: i }))
      );
      if (insErr) { console.error("community_board_genre_card_instructors insert error:", insErr); showToast(`講師の保存に失敗しました: ${insErr.message}`); }
    }
    setSavingEdit(false);
    const updated = { ...cardState, title, genre, instructors: newInstructors };
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
            <InstructorList instructors={displayInstructors} />
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
        {/* 参加申請していないと練習日程の中身は見られない（作成者は常に見られる） */}
        {isMember === null ? (
          <div style={{ textAlign: "center", padding: "40px 16px", color: "rgba(255,255,255,0.4)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>読み込み中...</div>
        ) : isMember ? (
          <>
            {/* 参加申請したユーザー。練習日程を追加の上に出す */}
            {applicants && applicants.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>参加申請したユーザー（{applicants.length}人）</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  {applicants.map(a => (
                    <button key={a.id} onClick={() => onViewProfile?.(a.id)}
                      style={{ background: "none", border: "none", cursor: onViewProfile ? "pointer" : "default", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", width: "56px" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>
                        {a.avatar_url ? <img src={a.avatar_url} alt={a.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : a.dancer_name[0]?.toUpperCase()}
                      </div>
                      <span title={a.dancer_name} style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "56px" }}>{a.dancer_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <PracticeScheduleList boardId={boardId} cardId={cardState.id} isOwn={isOwn} user={user} members={cardMembers} allowAdd={true} />
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans JP',sans-serif", lineHeight: 1.7, marginBottom: "16px" }}>
              このカードの練習日程を見るには参加申請が必要です。
            </p>
            <button onClick={applyToCard} disabled={applying}
              style={{ padding: "12px 24px", border: "none", borderRadius: "8px", background: ACCENT, color: "#fff", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, cursor: "pointer", opacity: applying ? 0.6 : 1 }}>
              {applying ? "申請中..." : "参加を申請する"}
            </button>
          </div>
        )}
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

            <div style={{ marginTop: "10px" }}>
              <label style={{ display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>講師（任意・複数登録できます）</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {editInstructors.map((ins, i) => (
                  <div key={i} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                      <input value={ins.name} onChange={e => updateEditInstructor(i, "name", e.target.value)} placeholder="講師名" maxLength={30}
                        style={{ width: "100%", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
                      <input value={ins.instagram} onChange={e => updateEditInstructor(i, "instagram", e.target.value)} placeholder="Instagram（URLか@ユーザー名・任意）" maxLength={200} autoCapitalize="none" autoCorrect="off"
                        style={{ width: "100%", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    {editInstructors.length > 1 && (
                      <button onClick={() => removeEditInstructor(i)} title="この講師を削除" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: "4px", flexShrink: 0 }}><X size={15} /></button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addEditInstructor} style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "5px", background: "none", border: "1px dashed rgba(255,255,255,0.25)", borderRadius: "6px", padding: "7px 10px", color: "rgba(255,255,255,0.6)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>
                <UserPlus size={13} /> 講師を追加
              </button>
            </div>

            <div style={{ marginTop: "10px" }}>
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
