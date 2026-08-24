"use client";
import { useState, useEffect } from "react";
import { Plus, X, Check, UserPlus } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { GENRES, GENRE_COLORS, genreLabel, toggleGenre, todayStr } from "../lib/constants";
import type { GenreKey } from "../lib/types";
import { Loading } from "./Loading";
import { showToast } from "./Toast";
import { CommunityBoardCard, type Board } from "./CommunityBoardCard";

type InstructorInput = { name: string; instagram: string };
const EMPTY_INSTRUCTOR: InstructorInput = { name: "", instagram: "" };

// 「コミュニティ」タブ：みんなが自由に作れる掲示板の一覧。
// 右上の「＋」でタイトル等を入力して新しい掲示板を作り、タップすると中身（CommunityBoardScreen）が開く
export function CommunityScreen({ user, onOpenBoard, onViewProfile }: {
  user: SupabaseUser;
  onOpenBoard: (board: { id: string; title: string }) => void;
  onViewProfile?: (id: string) => void;
}) {
  const [boards, setBoards] = useState<Board[] | null>(null);
  // プロフィール画面の「マイコミュニティ」ボタンで追加したメンバー。この画面の見出しと同じ名前なので、
  // ここにも一覧を出す（community_membersテーブル。詳細はPublicProfileScreen参照）
  const [communityMembers, setCommunityMembers] = useState<{ id: string; dancer_name: string; avatar_url: string | null; instagram: string | null; bio: string | null }[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newVenue, setNewVenue] = useState("");
  const [newGenres, setNewGenres] = useState<GenreKey[]>([]);
  const [instructors, setInstructors] = useState<InstructorInput[]>([{ ...EMPTY_INSTRUCTOR }]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [followingCandidates, setFollowingCandidates] = useState<{ id: string; dancer_name: string; avatar_url: string | null }[] | null>(null);
  const [inviteIds, setInviteIds] = useState<string[]>([]);

  const fetchBoards = async () => {
    const { data } = await supabase
      .from("community_boards")
      .select("id, title, subtitle, venue, genre, event_date, event_start_date, event_end_date, created_at, creator_id, instructors:community_board_instructors(id, name, instagram, sort_order)")
      .order("created_at", { ascending: false })
      .order("sort_order", { referencedTable: "community_board_instructors", ascending: true });
    setBoards((data as any[])?.map(b => ({ ...b, instructors: b.instructors ?? [] })) ?? []);
  };

  // マイコミュニティのメンバー取得（結合クエリだと名前が引けないことがあったため2段階で取る）
  const fetchCommunityMembers = async () => {
    const { data: memberRows } = await supabase.from("community_members").select("member_id").eq("profile_id", user.id);
    if (!memberRows || memberRows.length === 0) { setCommunityMembers([]); return; }
    const memberIds = memberRows.map((r: any) => r.member_id);
    const { data: profileRows } = await supabase.from("profiles").select("id, dancer_name, avatar_url, instagram, bio").in("id", memberIds);
    const profileMap = new Map((profileRows ?? []).map((p: any) => [p.id, p]));
    setCommunityMembers(memberIds.map(id => {
      const p = profileMap.get(id);
      return { id, dancer_name: p?.dancer_name ?? "UNKNOWN", avatar_url: p?.avatar_url ?? null, instagram: p?.instagram ?? null, bio: p?.bio ?? null };
    }));
  };

  useEffect(() => { fetchBoards(); fetchCommunityMembers(); }, []);

  // フォロー中のアカウント一覧を取得する（招待の候補。一度取れたら使い回す）
  const fetchFollowing = async () => {
    if (followingCandidates !== null) return;
    const { data } = await supabase.from("follows").select("following_id, profiles:following_id(dancer_name, avatar_url)").eq("follower_id", user.id);
    setFollowingCandidates((data ?? []).map((r: any) => ({ id: r.following_id, dancer_name: r.profiles?.dancer_name ?? "UNKNOWN", avatar_url: r.profiles?.avatar_url ?? null })));
  };
  const toggleInvite = (id: string) => setInviteIds(list => list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

  const openCreate = () => { setShowCreate(true); fetchFollowing(); };

  const resetForm = () => {
    setNewTitle(""); setNewSubtitle(""); setNewStartDate(""); setNewEndDate(""); setNewVenue(""); setNewGenres([]);
    setInstructors([{ ...EMPTY_INSTRUCTOR }]);
    setInviteIds([]);
  };

  const updateInstructor = (i: number, field: keyof InstructorInput, value: string) => {
    setInstructors(list => list.map((ins, idx) => idx === i ? { ...ins, [field]: value } : ins));
  };
  const addInstructor = () => setInstructors(list => [...list, { ...EMPTY_INSTRUCTOR }]);
  const removeInstructor = (i: number) => setInstructors(list => list.filter((_, idx) => idx !== i));

  // カードの編集ボタン：フォームに既存の内容を詰めて、作成と同じモーダルを編集モードで開く
  const startEdit = async (b: Board) => {
    setEditingId(b.id);
    setNewTitle(b.title);
    setNewSubtitle(b.subtitle ?? "");
    setNewStartDate(b.event_start_date ?? "");
    setNewEndDate(b.event_end_date ?? "");
    setNewVenue(b.venue ?? "");
    setNewGenres(b.genre ? [b.genre] : []);
    setInstructors(b.instructors.length > 0 ? b.instructors.map(ins => ({ name: ins.name, instagram: ins.instagram ?? "" })) : [{ ...EMPTY_INSTRUCTOR }]);
    setShowCreate(true);
    fetchFollowing();
    const { data } = await supabase.from("community_board_invites").select("user_id").eq("board_id", b.id);
    setInviteIds((data ?? []).map((r: any) => r.user_id));
  };

  const closeModal = () => { setShowCreate(false); setEditingId(null); resetForm(); };

  const handleSubmit = async () => {
    const title = newTitle.trim();
    if (!title || creating) return;
    setCreating(true);
    const fields = {
      title,
      subtitle: newSubtitle.trim() || null,
      event_start_date: newStartDate || null,
      // 2日目は1日目より後の日を選んだ時だけ意味がある値として保存する
      event_end_date: newEndDate && newEndDate > newStartDate ? newEndDate : null,
      venue: newVenue.trim() || null,
      genre: newGenres[0] ?? null,
    };
    // 名前を入れた講師だけ登録する（空欄の行は無視）
    const validInstructors = instructors.map(ins => ({ name: ins.name.trim(), instagram: ins.instagram.trim() })).filter(ins => ins.name);

    if (editingId) {
      const { error } = await supabase.from("community_boards").update(fields).eq("id", editingId);
      if (error) { console.error("community_boards update error:", error); showToast(`保存に失敗しました: ${error.message}`); setCreating(false); return; }
      // 講師は一旦全部消してから今のフォームの内容で入れ直す（作成者しか触れないのでRLS上も問題ない）
      await supabase.from("community_board_instructors").delete().eq("board_id", editingId);
      if (validInstructors.length > 0) {
        await supabase.from("community_board_instructors").insert(
          validInstructors.map((ins, i) => ({ board_id: editingId, name: ins.name, instagram: ins.instagram || null, sort_order: i }))
        );
      }
      // 招待リストも同様に一旦全部消してから入れ直す
      await supabase.from("community_board_invites").delete().eq("board_id", editingId);
      if (inviteIds.length > 0) {
        await supabase.from("community_board_invites").insert(inviteIds.map(uid => ({ board_id: editingId, user_id: uid })));
      }
      setCreating(false);
      closeModal();
      fetchBoards();
      return;
    }

    // IDは先にこちら側で作って渡す。insertの直後に.select()で読み返すと、
    // 「招待されている人だけ見える」の閲覧ポリシーが自分自身の閲覧確認にも働いてしまい、
    // 作成自体が失敗することがあるため（作成直後はまだ招待リストが空で、閲覧ポリシーの
    // 判定に間に合わないケースがある）、読み返しをせず済むようにする
    const newId = crypto.randomUUID();
    const { error } = await supabase.from("community_boards").insert({ ...fields, id: newId, creator_id: user.id });
    if (error) { console.error("community_boards insert error:", error); showToast(`作成に失敗しました: ${error.message}`); setCreating(false); return; }
    if (validInstructors.length > 0) {
      await supabase.from("community_board_instructors").insert(
        validInstructors.map((ins, i) => ({ board_id: newId, name: ins.name, instagram: ins.instagram || null, sort_order: i }))
      );
    }
    if (inviteIds.length > 0) {
      await supabase.from("community_board_invites").insert(inviteIds.map(uid => ({ board_id: newId, user_id: uid })));
    }
    setCreating(false);
    closeModal();
    fetchBoards();
    onOpenBoard({ id: newId, title });
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const { error } = await supabase.from("community_boards").delete().eq("id", deleteTarget);
    setDeleting(false);
    if (!error) setBoards(list => list?.filter(b => b.id !== deleteTarget) ?? list);
    setDeleteTarget(null);
  };

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.12em", color: "rgba(255,255,255,0.5)", marginBottom: "5px" };

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flexShrink: 0, padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "32px", color: "#F0F0F0" }}>マイコミュニティ</h2>
        </div>
        <button onClick={openCreate} aria-label="掲示板を作る"
          style={{ background: "#DC2626", border: "none", borderRadius: "10px", cursor: "pointer", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "4px" }}>
          <Plus size={20} color="#fff" />
        </button>
      </div>

      <div className="bd-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {/* プロフィール画面の「マイコミュニティ」ボタンで追加したメンバー。1人もいなければ何も出さない。
            名前だけでなくInstagram・一言（自己紹介）も見えるよう、アイコンの並びではなく縦のカードにする */}
        {communityMembers && communityMembers.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
            {communityMembers.map(m => (
              <button key={m.id} onClick={() => onViewProfile?.(m.id)}
                style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", cursor: onViewProfile ? "pointer" : "default", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px", textAlign: "left" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", flexShrink: 0 }}>
                  {m.avatar_url ? <img src={m.avatar_url} alt={m.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : m.dancer_name[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>{m.dancer_name}</span>
                  {m.instagram && <span style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "#A855F7" }}>@{m.instagram}</span>}
                  {m.bio && <span style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.bio}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
        {boards === null ? (
          <Loading />
        ) : boards.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 16px", color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>
            まだ掲示板がありません。右上の＋から作ってみましょう
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {boards.map(b => (
              <CommunityBoardCard key={b.id} board={b} isOwn={b.creator_id === user.id}
                onClick={() => onOpenBoard(b)} onEdit={() => startEdit(b)} onDelete={() => setDeleteTarget(b.id)} />
            ))}
          </div>
        )}
        <div style={{ height: "80px" }} />
      </div>

      {/* 掲示板を作る・編集する */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={closeModal}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#141414", borderRadius: "16px", padding: "24px 20px", width: "100%", maxWidth: "340px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em" }}>{editingId ? "EDIT BOARD" : "NEW BOARD"}</div>
              <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={18} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div><label style={lbl}>タイトル</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="例: 〇〇ダンスショーケース" maxLength={50} autoFocus style={inp} />
              </div>
              <div><label style={lbl}>サブタイトル（任意）</label>
                <input value={newSubtitle} onChange={e => setNewSubtitle(e.target.value)} placeholder="例: 〜集大成〜" maxLength={80} style={inp} />
              </div>
              <div>
                <label style={lbl}>ジャンル（任意）</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                  {GENRES.map(g => { const sel = newGenres.includes(g); const col = GENRE_COLORS[g]; return (
                    <button key={g} onClick={() => setNewGenres(list => toggleGenre(list, g))}
                      style={{ padding: "6px 12px", border: sel ? `1px solid ${col}` : "1px solid rgba(255,255,255,0.14)", borderRadius: "20px", background: sel ? `${col}15` : "transparent", color: sel ? col : "rgba(255,255,255,0.5)", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>
                      {genreLabel(g)}
                    </button>
                  ); })}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div><label style={lbl}>開催日 1日目（任意）</label>
                  <div style={{ display: "flex" }}><input type="date" style={{ ...inp, flex: 1 }} min={todayStr()} value={newStartDate} onChange={e => { setNewStartDate(e.target.value); if (newEndDate && newEndDate < e.target.value) setNewEndDate(""); }} /></div>
                </div>
                <div><label style={lbl}>2日目（任意）</label>
                  <div style={{ display: "flex" }}><input type="date" style={{ ...inp, flex: 1 }} min={newStartDate || todayStr()} value={newEndDate} onChange={e => setNewEndDate(e.target.value)} disabled={!newStartDate} /></div>
                </div>
              </div>
              <div><label style={lbl}>公演会場（任意）</label>
                <input value={newVenue} onChange={e => setNewVenue(e.target.value)} placeholder="例: 渋谷〇〇ホール" maxLength={100} style={inp} />
              </div>

              <div>
                <label style={lbl}>講師（任意・複数登録できます）</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {instructors.map((ins, i) => (
                    <div key={i} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                        <input value={ins.name} onChange={e => updateInstructor(i, "name", e.target.value)} placeholder="講師名" maxLength={30} style={inp} />
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>@</span>
                          <input value={ins.instagram} onChange={e => updateInstructor(i, "instagram", e.target.value)} placeholder="Instagram（任意）" maxLength={60} style={{ ...inp, paddingLeft: "26px" }} />
                        </div>
                      </div>
                      {instructors.length > 1 && (
                        <button onClick={() => removeInstructor(i)} title="この講師を削除" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: "4px", flexShrink: 0 }}><X size={15} /></button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addInstructor} style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "5px", background: "none", border: "1px dashed rgba(255,255,255,0.25)", borderRadius: "6px", padding: "7px 10px", color: "rgba(255,255,255,0.6)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>
                  <UserPlus size={13} /> 講師を追加
                </button>
              </div>

              <div>
                <label style={lbl}>招待するアカウント（フォロー中・任意）</label>
                {followingCandidates === null ? (
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "'Noto Sans JP',sans-serif" }}>読み込み中...</div>
                ) : followingCandidates.length === 0 ? (
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "'Noto Sans JP',sans-serif" }}>フォロー中のアカウントがいません</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "160px", overflowY: "auto" }}>
                    {followingCandidates.map(f => {
                      const sel = inviteIds.includes(f.id);
                      return (
                        <button key={f.id} onClick={() => toggleInvite(f.id)} type="button"
                          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", borderRadius: "8px", border: sel ? "1px solid #DC2626" : "1px solid rgba(255,255,255,0.1)", background: sel ? "rgba(220,38,38,0.12)" : "transparent", cursor: "pointer", textAlign: "left" }}>
                          <div style={{ width: "26px", height: "26px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", flexShrink: 0 }}>
                            {f.avatar_url ? <img src={f.avatar_url} alt={f.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : f.dancer_name[0]?.toUpperCase()}
                          </div>
                          <span style={{ flex: 1, fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0" }}>{f.dancer_name}</span>
                          {sel && <Check size={14} color="#DC2626" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", fontFamily: "'Noto Sans JP',sans-serif", marginTop: "5px" }}>招待した人だけがこの掲示板を見られます</div>
              </div>
            </div>

            <button onClick={handleSubmit} disabled={!newTitle.trim() || creating}
              style={{ marginTop: "18px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", border: "none", borderRadius: "8px", background: newTitle.trim() ? "#DC2626" : "rgba(255,255,255,0.08)", color: newTitle.trim() ? "#fff" : "rgba(255,255,255,0.3)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "bold", cursor: newTitle.trim() ? "pointer" : "default" }}>
              <Check size={14} /> {creating ? (editingId ? "保存中..." : "作成中...") : (editingId ? "保存する" : "作成する")}
            </button>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 260, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setDeleteTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#141414", borderRadius: "12px", padding: "28px 24px", width: "100%", maxWidth: "320px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>🗑️</div>
            <div style={{ fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "20px", color: "#F0F0F0", marginBottom: "8px" }}>掲示板を削除</div>
            <div style={{ fontSize: "13px", color: "#F0F0F0", marginBottom: "24px", lineHeight: "1.6" }}>削除すると投稿・練習内容もすべて消えます。元に戻せません。本当に削除しますか？</div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: "12px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "8px", background: "none", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#F0F0F0" }}>キャンセル</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", background: "#DC2626", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#FFFFFF", fontWeight: "bold" }}>{deleting ? "削除中..." : "削除する"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
