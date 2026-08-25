"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { showToast } from "./Toast";

const ACCENT = "#DC2626";

export type Assignee = { id: string; dancer_name: string; avatar_url: string | null };
type ChoreoPart = { id: string; title: string; eightCount: number | null; createdBy: string | null; assigneeIds: string[] };

// 「担当振付」タブの中身：曲・パート名ごとに担当メンバーを紐づける。
// パートの追加はこのカードを見られる人なら誰でも。編集・削除は掲示板の作成者、
// またはそのパートを作った本人だけ
export function ChoreographyPartList({ cardId, isOwn, user, candidates }: {
  cardId: string;
  isOwn: boolean;
  user: SupabaseUser;
  candidates: Assignee[]; // 担当に選べる人（作成者＋参加申請したユーザー）
}) {
  const [parts, setParts] = useState<ChoreoPart[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEightCount, setNewEightCount] = useState("");
  const [newAssigneeIds, setNewAssigneeIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editEightCount, setEditEightCount] = useState("");
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // タップすると開く「誰が一緒に踊るか」の一覧
  const [viewingPartId, setViewingPartId] = useState<string | null>(null);

  const fetchParts = async () => {
    const { data: partRows } = await supabase.from("community_board_choreography_parts").select("id, title, eight_count, created_by")
      .eq("card_id", cardId).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    const list = (partRows as { id: string; title: string; eight_count: number | null; created_by: string | null }[] | null) ?? [];
    if (list.length === 0) { setParts([]); return; }
    const { data: assigneeRows } = await supabase.from("community_board_choreography_assignees").select("part_id, profile_id").in("part_id", list.map(p => p.id));
    setParts(list.map(p => ({
      id: p.id,
      title: p.title,
      eightCount: p.eight_count,
      createdBy: p.created_by,
      assigneeIds: (assigneeRows as any[] ?? []).filter(r => r.part_id === p.id).map(r => r.profile_id),
    })));
  };

  useEffect(() => { fetchParts(); }, [cardId]);

  const toggleId = (list: string[], id: string) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];

  // パートを作る。IDは先に用意して読み返しをしない＝RLSのRETURNING問題を避ける
  const addPart = async () => {
    const title = newTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    const newId = crypto.randomUUID();
    const eightCount = newEightCount ? Number(newEightCount) : null;
    const { error } = await supabase.from("community_board_choreography_parts").insert({ id: newId, card_id: cardId, title, eight_count: eightCount, created_by: user.id });
    if (error) { setAdding(false); console.error("community_board_choreography_parts insert error:", error); showToast(`パートの作成に失敗しました: ${error.message}`); return; }
    if (newAssigneeIds.length > 0) {
      const { error: aErr } = await supabase.from("community_board_choreography_assignees").insert(newAssigneeIds.map(pid => ({ part_id: newId, profile_id: pid })));
      if (aErr) console.error("community_board_choreography_assignees insert error:", aErr);
    }
    setAdding(false);
    setParts(list => [...(list ?? []), { id: newId, title, eightCount, createdBy: user.id, assigneeIds: newAssigneeIds }]);
    setNewTitle(""); setNewEightCount(""); setNewAssigneeIds([]); setShowAdd(false);
  };

  const openEdit = (part: ChoreoPart) => {
    setEditingId(part.id);
    setEditTitle(part.title);
    setEditEightCount(part.eightCount != null ? String(part.eightCount) : "");
    setEditAssigneeIds(part.assigneeIds);
  };

  const saveEdit = async () => {
    const title = editTitle.trim();
    if (!title || !editingId || savingEdit) return;
    setSavingEdit(true);
    const eightCount = editEightCount ? Number(editEightCount) : null;
    const { error } = await supabase.from("community_board_choreography_parts").update({ title, eight_count: eightCount }).eq("id", editingId);
    if (error) { setSavingEdit(false); console.error("community_board_choreography_parts update error:", error); showToast(`保存に失敗しました: ${error.message}`); return; }
    // 担当者は一旦全部消してから今のフォームの内容で入れ直す
    await supabase.from("community_board_choreography_assignees").delete().eq("part_id", editingId);
    if (editAssigneeIds.length > 0) {
      const { error: aErr } = await supabase.from("community_board_choreography_assignees").insert(editAssigneeIds.map(pid => ({ part_id: editingId, profile_id: pid })));
      if (aErr) { console.error("community_board_choreography_assignees insert error:", aErr); showToast(`担当者の保存に失敗しました: ${aErr.message}`); }
    }
    setSavingEdit(false);
    setParts(list => (list ?? []).map(p => p.id === editingId ? { ...p, title, eightCount, assigneeIds: editAssigneeIds } : p));
    setEditingId(null);
  };

  const deletePart = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const { error } = await supabase.from("community_board_choreography_parts").delete().eq("id", deleteTarget);
    setDeleting(false);
    if (!error) setParts(list => (list ?? []).filter(p => p.id !== deleteTarget));
    setDeleteTarget(null);
  };

  const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" };

  // パート作成・編集フォーム共通（タイトル・エイト数＋担当者のチェックリスト）
  const renderForm = (title: string, setTitle: (v: string) => void, eightCount: string, setEightCount: (v: string) => void, assigneeIds: string[], setAssigneeIds: (v: string[]) => void, onCancel: () => void, onSave: () => void, saving: boolean) => (
    <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "8px", padding: "10px" }}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="パート名（例: 1番サビ）" maxLength={40} autoFocus style={inp} />
      <input value={eightCount} onChange={e => setEightCount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="エイト数（任意）" inputMode="numeric" maxLength={3}
        style={{ ...inp, marginTop: "6px" }} />
      {candidates.length > 0 && (
        <div style={{ marginTop: "10px" }}>
          <label style={{ display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>担当（任意・複数選べます）</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "160px", overflowY: "auto" }}>
            {candidates.map(c => {
              const sel = assigneeIds.includes(c.id);
              return (
                <button key={c.id} type="button" onClick={() => setAssigneeIds(toggleId(assigneeIds, c.id))}
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", borderRadius: "8px", border: sel ? "1px solid #DC2626" : "1px solid rgba(255,255,255,0.1)", background: sel ? "rgba(220,38,38,0.12)" : "transparent", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", flexShrink: 0 }}>
                    {c.avatar_url ? <img src={c.avatar_url} alt={c.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : c.dancer_name[0]?.toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0" }}>{c.dancer_name}</span>
                  {sel && <Check size={14} color="#DC2626" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
        <button onClick={onCancel} disabled={saving} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", padding: "7px 12px", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif" }}>キャンセル</button>
        <button onClick={onSave} disabled={!title.trim() || saving} style={{ background: title.trim() ? ACCENT : "rgba(255,255,255,0.12)", border: "none", borderRadius: "8px", cursor: title.trim() ? "pointer" : "default", color: title.trim() ? "#fff" : "rgba(255,255,255,0.3)", padding: "7px 12px", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700 }}>{saving ? "保存中..." : "保存する"}</button>
      </div>
    </div>
  );

  if (parts === null) return <div style={{ textAlign: "center", padding: "40px 16px", color: "rgba(255,255,255,0.4)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>読み込み中...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* パートを作る。この掲示板を見られる人なら誰でも追加できる（ここから上は固定） */}
      <div style={{ flexShrink: 0 }}>
      <div style={{ marginBottom: "12px" }}>
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", background: "none", border: "1px dashed rgba(255,255,255,0.25)", borderRadius: "8px", padding: "10px", color: "rgba(255,255,255,0.6)", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", boxSizing: "border-box" }}>
            <Plus size={14} /> パートを作る
          </button>
        ) : renderForm(newTitle, setNewTitle, newEightCount, setNewEightCount, newAssigneeIds, setNewAssigneeIds, () => { setShowAdd(false); setNewTitle(""); setNewEightCount(""); setNewAssigneeIds([]); }, addPart, adding)}
      </div>
      </div>

      {/* パートの一覧だけがスクロールする */}
      <div className="bd-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      {parts.length === 0 ? (
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", fontFamily: "'Noto Sans JP',sans-serif", padding: "2px 2px 4px" }}>まだ担当振付がありません</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {parts.map(part => {
            // 編集・削除できるのは掲示板の作成者、またはこのパートを作った本人
            const canManage = isOwn || part.createdBy === user.id;
            return (
            <div key={part.id} style={{ width: "100%", boxSizing: "border-box", background: "linear-gradient(150deg, #2c2c2c 0%, #1a1a1a 25%, #242424 48%, #161616 70%, #282828 100%)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "10px", padding: "14px 16px" }}>
              {editingId === part.id ? (
                renderForm(editTitle, setEditTitle, editEightCount, setEditEightCount, editAssigneeIds, setEditAssigneeIds, () => setEditingId(null), saveEdit, savingEdit)
              ) : (
                <button onClick={() => setViewingPartId(part.id)} style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>{part.title}</div>
                    <div style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>
                      {part.eightCount != null && <>{part.eightCount}エイト・</>}担当{part.assigneeIds.length}人
                    </div>
                  </div>
                  {canManage && (
                    <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
                      <span onClick={() => openEdit(part)} title="編集" style={{ cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: "4px", display: "flex" }}><Pencil size={14} /></span>
                      <span onClick={() => setDeleteTarget(part.id)} title="削除" style={{ cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: "4px", display: "flex" }}><Trash2 size={14} /></span>
                    </div>
                  )}
                </button>
              )}
            </div>
            );
          })}
        </div>
      )}
      </div>

      {/* タップすると開く「誰が一緒に踊るか」の一覧 */}
      {viewingPartId && (() => {
        const part = parts.find(p => p.id === viewingPartId);
        if (!part) return null;
        const assignees = part.assigneeIds.map(id => candidates.find(c => c.id === id)).filter((c): c is Assignee => !!c);
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setViewingPartId(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "linear-gradient(150deg, #2c2c2c 0%, #1a1a1a 25%, #242424 48%, #161616 70%, #282828 100%)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "16px", padding: "24px 20px", width: "100%", maxWidth: "340px", maxHeight: "80vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em" }}>一緒に踊るメンバー</div>
                <button onClick={() => setViewingPartId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={18} /></button>
              </div>
              <div style={{ fontSize: "18px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", marginBottom: "4px" }}>{part.title}</div>
              {part.eightCount != null && <div style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginBottom: "16px" }}>{part.eightCount}エイト</div>}
              {assignees.length === 0 ? (
                <div style={{ textAlign: "center", padding: "12px", color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>まだ担当が決まっていません</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {assignees.map(a => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "34px", height: "34px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", flexShrink: 0 }}>
                        {a.avatar_url ? <img src={a.avatar_url} alt={a.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : a.dancer_name[0]?.toUpperCase()}
                      </div>
                      <div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0" }}>{a.dancer_name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* パートの削除確認モーダル */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 260, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setDeleteTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#141414", borderRadius: "12px", padding: "28px 24px", width: "100%", maxWidth: "320px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>🗑️</div>
            <div style={{ fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "20px", color: "#F0F0F0", marginBottom: "8px" }}>パートを削除</div>
            <div style={{ fontSize: "13px", color: "#F0F0F0", marginBottom: "24px", lineHeight: "1.6" }}>削除すると元に戻せません。本当に削除しますか？</div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: "12px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "8px", background: "none", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#F0F0F0" }}>キャンセル</button>
              <button onClick={deletePart} disabled={deleting} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", background: "#DC2626", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#FFFFFF", fontWeight: "bold" }}>{deleting ? "削除中..." : "削除する"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
