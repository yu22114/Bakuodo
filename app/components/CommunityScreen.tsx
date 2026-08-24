"use client";
import { useState, useEffect } from "react";
import { Plus, X, Check } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { todayStr } from "../lib/constants";
import { Loading } from "./Loading";
import { showToast } from "./Toast";
import { CommunityBoardCard, type Board } from "./CommunityBoardCard";

// 「コミュニティ」タブ：みんなが自由に作れる掲示板の一覧。
// 右上の「＋」でタイトル等を入力して新しい掲示板を作り、タップすると中身（CommunityBoardScreen）が開く
export function CommunityScreen({ user, onOpenBoard, onViewProfile, accountType }: {
  user: SupabaseUser;
  onOpenBoard: (board: { id: string; title: string }) => void;
  onViewProfile?: (id: string) => void;
  // 掲示板の作成（＋ボタン）は団体用アカウントだけ
  accountType?: string;
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
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const openCreate = () => { setShowCreate(true); };

  const resetForm = () => {
    setNewTitle(""); setNewSubtitle(""); setNewStartDate(""); setNewEndDate(""); setNewVenue("");
  };

  // カードの編集ボタン：フォームに既存の内容を詰めて、作成と同じモーダルを編集モードで開く
  const startEdit = (b: Board) => {
    setEditingId(b.id);
    setNewTitle(b.title);
    setNewSubtitle(b.subtitle ?? "");
    setNewStartDate(b.event_start_date ?? "");
    setNewEndDate(b.event_end_date ?? "");
    setNewVenue(b.venue ?? "");
    setShowCreate(true);
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
    };

    if (editingId) {
      const { error } = await supabase.from("community_boards").update(fields).eq("id", editingId);
      if (error) { console.error("community_boards update error:", error); showToast(`保存に失敗しました: ${error.message}`); setCreating(false); return; }
      setCreating(false);
      closeModal();
      fetchBoards();
      return;
    }

    // IDは先にこちら側で作って渡す。insertの直後に.select()で読み返すと、
    // 閲覧ポリシーの判定が作成直後の自分自身の閲覧確認にも働いてしまい、
    // 作成自体が失敗することがあるため、読み返しをせず済むようにする
    const newId = crypto.randomUUID();
    const { error } = await supabase.from("community_boards").insert({ ...fields, id: newId, creator_id: user.id });
    if (error) { console.error("community_boards insert error:", error); showToast(`作成に失敗しました: ${error.message}`); setCreating(false); return; }
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
        {accountType === "organization" && (
          <button onClick={openCreate} aria-label="掲示板を作る"
            style={{ background: "#DC2626", border: "none", borderRadius: "10px", cursor: "pointer", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "4px" }}>
            <Plus size={20} color="#fff" />
          </button>
        )}
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
