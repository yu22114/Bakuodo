"use client";
import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Pencil, Check, X, GripVertical, Camera } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { showToast } from "./Toast";

const ACCENT = "#DC2626";

export type Assignee = { id: string; dancer_name: string; avatar_url: string | null };
type ChoreoPart = { id: string; title: string; eightCount: number | null; createdBy: string | null; assigneeIds: string[]; imageUrl: string | null };

// パートの画像（フォーメーション図・参考写真など、任意で1枚）。
// 「保存済み（existing）」か「今回選び直した新しい画像（new）」かで表示・保存の扱いが変わる
type PartImage = { kind: "existing"; url: string } | { kind: "new"; file: File; preview: string };

function loadImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像を読み込めませんでした"));
    img.src = URL.createObjectURL(blob);
  });
}

async function convertHeicIfNeeded(file: File): Promise<Blob> {
  const isHeic = /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  if (!isHeic) return file;
  if (file.size > 4 * 1024 * 1024) return file;
  const res = await fetch("/api/convert-heic", { method: "POST", body: file });
  if (!res.ok) throw new Error(`HEIC変換に失敗しました (status ${res.status})`);
  return await res.blob();
}

// パート画像は正方形に中央で切り抜いてから縮小する（フォーメーション図などは縦長・横長どちらもあるため）
const PART_IMAGE_SIZE = 900;

async function uploadPartImage(userId: string, file: File): Promise<string> {
  const source = await convertHeicIfNeeded(file);
  const img = await loadImageElement(source);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = PART_IMAGE_SIZE;
  canvas.height = PART_IMAGE_SIZE;
  const ctx = canvas.getContext("2d");
  URL.revokeObjectURL(img.src);
  if (!ctx) throw new Error("画像の処理に失敗しました");
  ctx.drawImage(img, sx, sy, side, side, 0, 0, PART_IMAGE_SIZE, PART_IMAGE_SIZE);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("画像の処理に失敗しました");
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("post-images").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw new Error(`画像のアップロードに失敗しました: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(path);
  return publicUrl;
}

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
  const [newImage, setNewImage] = useState<PartImage | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editEightCount, setEditEightCount] = useState("");
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
  const [editImage, setEditImage] = useState<PartImage | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // タップすると開く「誰が一緒に踊るか」の一覧
  const [viewingPartId, setViewingPartId] = useState<string | null>(null);
  // タップして開く、添付画像の全画面表示
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  // 並び替え（つまみを長押し→ドラッグ）用の状態。掲示板の作成者だけが並び替えできる
  // （他人が作ったパートのsort_orderまでは更新できないため）
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const partsRef = useRef<ChoreoPart[] | null>(null);
  useEffect(() => { partsRef.current = parts; }, [parts]);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartYRef = useRef(0);
  const dragOriginTopRef = useRef(0);
  const dragHeightRef = useRef(0);
  const dragMovedRef = useRef(false);
  const orderChangedRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  useEffect(() => () => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); }, []);

  const fetchParts = async () => {
    const { data: partRows } = await supabase.from("community_board_choreography_parts").select("id, title, eight_count, created_by, image_url")
      .eq("card_id", cardId).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    const list = (partRows as { id: string; title: string; eight_count: number | null; created_by: string | null; image_url: string | null }[] | null) ?? [];
    if (list.length === 0) { setParts([]); return; }
    const { data: assigneeRows } = await supabase.from("community_board_choreography_assignees").select("part_id, profile_id").in("part_id", list.map(p => p.id));
    setParts(list.map(p => ({
      id: p.id,
      title: p.title,
      eightCount: p.eight_count,
      createdBy: p.created_by,
      imageUrl: p.image_url,
      assigneeIds: (assigneeRows as any[] ?? []).filter(r => r.part_id === p.id).map(r => r.profile_id),
    })));
  };

  useEffect(() => { fetchParts(); }, [cardId]);

  const toggleId = (list: string[], id: string) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];

  // 並び替えた結果をDBに反映する（sort_orderを配列の並び順で振り直す）。
  // 直接UPDATEだと「作成者 or 掲示板の作成者」しか通らないので、
  // 「このカードを見られる人なら誰でも並び替えできる」専用のRPCを使う
  const persistOrder = async (list: ChoreoPart[]) => {
    const { error } = await supabase.rpc("bd_reorder_choreography_parts", { p_card_id: cardId, p_ordered_ids: list.map(p => p.id) });
    if (error) { console.error("bd_reorder_choreography_parts error:", error); showToast(`並び替えの保存に失敗しました: ${error.message}`); }
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
  };

  // つまみを長押し（450ms）すると並び替えモードが始まる。
  // このリストはカードに参加申請したメンバー（or 掲示板の作成者）にしか表示されないので、
  // ここに来ている時点で誰でも並び替えてよい
  const handleGripPointerDown = (e: React.PointerEvent<HTMLSpanElement>, id: string) => {
    dragStartYRef.current = e.clientY;
    dragMovedRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      if (dragMovedRef.current) return;
      const el = itemRefs.current.get(id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      dragOriginTopRef.current = rect.top;
      dragHeightRef.current = rect.height;
      activePointerIdRef.current = e.pointerId;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
      orderChangedRef.current = false;
      setDraggingId(id);
      setDragOffsetY(0);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
    }, 450);
  };

  // 指を動かした分だけカードを追従させ、隣のカードの中央を超えたら順番を入れ替える
  const handleGripPointerMove = (e: React.PointerEvent<HTMLSpanElement>, id: string) => {
    const dy = e.clientY - dragStartYRef.current;
    if (draggingId !== id) {
      if (Math.abs(dy) > 10) { clearLongPressTimer(); dragMovedRef.current = true; }
      return;
    }
    e.preventDefault();
    setDragOffsetY(dy);
    const draggedCenter = dragOriginTopRef.current + dy + dragHeightRef.current / 2;
    setParts(list => {
      if (!list) return list;
      const idx = list.findIndex(p => p.id === id);
      if (idx === -1) return list;
      let swapIdx = -1;
      if (idx > 0) {
        const prevEl = itemRefs.current.get(list[idx - 1].id);
        if (prevEl) {
          const r = prevEl.getBoundingClientRect();
          if (draggedCenter < r.top + r.height / 2) swapIdx = idx - 1;
        }
      }
      if (swapIdx === -1 && idx < list.length - 1) {
        const nextEl = itemRefs.current.get(list[idx + 1].id);
        if (nextEl) {
          const r = nextEl.getBoundingClientRect();
          if (draggedCenter > r.top + r.height / 2) swapIdx = idx + 1;
        }
      }
      if (swapIdx === -1) return list;
      const next = [...list];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      orderChangedRef.current = true;
      return next;
    });
  };

  const handleGripPointerUp = (e: React.PointerEvent<HTMLSpanElement>, id: string) => {
    clearLongPressTimer();
    if (draggingId === id) {
      if (activePointerIdRef.current != null) {
        try { e.currentTarget.releasePointerCapture(activePointerIdRef.current); } catch {}
      }
      activePointerIdRef.current = null;
      setDraggingId(null);
      setDragOffsetY(0);
      if (orderChangedRef.current) {
        orderChangedRef.current = false;
        if (partsRef.current) persistOrder(partsRef.current);
      }
    }
  };

  // パートを作る。IDは先に用意して読み返しをしない＝RLSのRETURNING問題を避ける
  const addPart = async () => {
    const title = newTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    const newId = crypto.randomUUID();
    const eightCount = newEightCount ? Number(newEightCount) : null;
    const sortOrder = parts?.length ?? 0; // 新しいパートは常に一番下に追加する
    let imageUrl: string | null = null;
    if (newImage?.kind === "new") {
      try { imageUrl = await uploadPartImage(user.id, newImage.file); }
      catch (e) { setAdding(false); showToast(e instanceof Error ? e.message : "画像のアップロードに失敗しました"); return; }
    }
    const { error } = await supabase.from("community_board_choreography_parts").insert({ id: newId, card_id: cardId, title, eight_count: eightCount, created_by: user.id, sort_order: sortOrder, image_url: imageUrl });
    if (error) { setAdding(false); console.error("community_board_choreography_parts insert error:", error); showToast(`パートの作成に失敗しました: ${error.message}`); return; }
    if (newAssigneeIds.length > 0) {
      const { error: aErr } = await supabase.from("community_board_choreography_assignees").insert(newAssigneeIds.map(pid => ({ part_id: newId, profile_id: pid })));
      if (aErr) console.error("community_board_choreography_assignees insert error:", aErr);
    }
    setAdding(false);
    setParts(list => [...(list ?? []), { id: newId, title, eightCount, createdBy: user.id, imageUrl, assigneeIds: newAssigneeIds }]);
    setNewTitle(""); setNewEightCount(""); setNewAssigneeIds([]); setNewImage(null); setShowAdd(false);
  };

  const openEdit = (part: ChoreoPart) => {
    setEditingId(part.id);
    setEditTitle(part.title);
    setEditEightCount(part.eightCount != null ? String(part.eightCount) : "");
    setEditAssigneeIds(part.assigneeIds);
    setEditImage(part.imageUrl ? { kind: "existing", url: part.imageUrl } : null);
  };

  const saveEdit = async () => {
    const title = editTitle.trim();
    if (!title || !editingId || savingEdit) return;
    setSavingEdit(true);
    const eightCount = editEightCount ? Number(editEightCount) : null;
    let imageUrl: string | null = editImage?.kind === "existing" ? editImage.url : null;
    if (editImage?.kind === "new") {
      try { imageUrl = await uploadPartImage(user.id, editImage.file); }
      catch (e) { setSavingEdit(false); showToast(e instanceof Error ? e.message : "画像のアップロードに失敗しました"); return; }
    }
    const { error } = await supabase.from("community_board_choreography_parts").update({ title, eight_count: eightCount, image_url: imageUrl }).eq("id", editingId);
    if (error) { setSavingEdit(false); console.error("community_board_choreography_parts update error:", error); showToast(`保存に失敗しました: ${error.message}`); return; }
    // 担当者は一旦全部消してから今のフォームの内容で入れ直す
    await supabase.from("community_board_choreography_assignees").delete().eq("part_id", editingId);
    if (editAssigneeIds.length > 0) {
      const { error: aErr } = await supabase.from("community_board_choreography_assignees").insert(editAssigneeIds.map(pid => ({ part_id: editingId, profile_id: pid })));
      if (aErr) { console.error("community_board_choreography_assignees insert error:", aErr); showToast(`担当者の保存に失敗しました: ${aErr.message}`); }
    }
    setSavingEdit(false);
    setParts(list => (list ?? []).map(p => p.id === editingId ? { ...p, title, eightCount, imageUrl, assigneeIds: editAssigneeIds } : p));
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

  // パート作成・編集フォーム共通（タイトル・エイト数・画像＋担当者のチェックリスト）
  const renderForm = (title: string, setTitle: (v: string) => void, eightCount: string, setEightCount: (v: string) => void, assigneeIds: string[], setAssigneeIds: (v: string[]) => void, image: PartImage | null, setImage: (v: PartImage | null) => void, onCancel: () => void, onSave: () => void, saving: boolean) => {
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setImage({ kind: "new", file, preview: URL.createObjectURL(file) });
    };
    const imageSrc = image?.kind === "existing" ? image.url : image?.kind === "new" ? image.preview : null;
    return (
    <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "8px", padding: "10px" }}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="パート名（例: 1番サビ）" maxLength={40} autoFocus style={inp} />
      <input value={eightCount} onChange={e => setEightCount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="エイト数（任意）" inputMode="numeric" maxLength={3}
        style={{ ...inp, marginTop: "6px" }} />
      <div style={{ marginTop: "10px" }}>
        <label style={{ display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>画像（任意・フォーメーション図など）</label>
        {imageSrc ? (
          <div style={{ position: "relative", width: "84px" }}>
            <img src={imageSrc} alt="" style={{ width: "84px", height: "84px", objectFit: "cover", borderRadius: "8px", display: "block" }} />
            <button type="button" onClick={() => setImage(null)} style={{ position: "absolute", top: "-6px", right: "-6px", width: "20px", height: "20px", borderRadius: "50%", background: "rgba(0,0,0,0.75)", border: "none", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={12} /></button>
          </div>
        ) : (
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", width: "84px", height: "84px", border: "1px dashed rgba(255,255,255,0.24)", borderRadius: "8px", color: "rgba(255,255,255,0.5)", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>
            <Camera size={16} /> 追加
            <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: "none" }} />
          </label>
        )}
      </div>
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
  };

  if (parts === null) return <div style={{ textAlign: "center", padding: "40px 16px", color: "rgba(255,255,255,0.4)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>読み込み中...</div>;

  return (
    // フォーム（画像添付などで縦に長くなることがある）も一覧も同じ領域でスクロールできるように、
    // 「上は固定・下だけスクロール」ではなく全体を1つのスクロール領域にする
    <div className="bd-scroll" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, overflowY: "auto" }}>
      {/* 自分が担当のパートをゴールドに光らせるアニメーション */}
      <style>{`@keyframes bdGoldShine{
        0%,100%{box-shadow:0 0 0 1px rgba(250,204,21,0.35), 0 4px 14px rgba(217,119,6,0.25);}
        50%{box-shadow:0 0 0 1.5px rgba(253,224,71,0.8), 0 6px 24px rgba(250,204,21,0.55);}
      }`}</style>
      {/* パートを作る。この掲示板を見られる人なら誰でも追加できる */}
      <div style={{ marginBottom: "12px" }}>
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", background: "none", border: "1px dashed rgba(255,255,255,0.25)", borderRadius: "8px", padding: "10px", color: "rgba(255,255,255,0.6)", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", boxSizing: "border-box" }}>
            <Plus size={14} /> パートを作る
          </button>
        ) : renderForm(newTitle, setNewTitle, newEightCount, setNewEightCount, newAssigneeIds, setNewAssigneeIds, newImage, setNewImage, () => { setShowAdd(false); setNewTitle(""); setNewEightCount(""); setNewAssigneeIds([]); setNewImage(null); }, addPart, adding)}
      </div>

      {parts.length === 0 ? (
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", fontFamily: "'Noto Sans JP',sans-serif", padding: "2px 2px 4px" }}>まだ担当振付がありません</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {parts.map(part => {
            // 編集・削除できるのは掲示板の作成者、またはこのパートを作った本人
            const canManage = isOwn || part.createdBy === user.id;
            const dragging = draggingId === part.id;
            // 自分がこのパートの担当に選ばれているかどうか。一覧を見ただけで
            // 「自分は何を担当しているか」が分かるように、カードをゴールドに光らせる
            const isMine = part.assigneeIds.includes(user.id);
            return (
            <div key={part.id}
              ref={el => { if (el) itemRefs.current.set(part.id, el); else itemRefs.current.delete(part.id); }}
              style={{
                width: "100%", boxSizing: "border-box", background: isMine
                  ? "linear-gradient(105deg, transparent 32%, rgba(255,215,0,0.14) 46%, rgba(255,215,0,0.03) 58%, transparent 72%), linear-gradient(150deg, #33291a 0%, #241c10 25%, #2c220f 48%, #1c160a 70%, #302410 100%)"
                  : "linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.1) 46%, rgba(255,255,255,0.02) 58%, transparent 72%), linear-gradient(150deg, #2c2c2c 0%, #1a1a1a 25%, #242424 48%, #161616 70%, #282828 100%)",
                border: isMine ? "1px solid rgba(250,204,21,0.6)" : "1px solid rgba(255,255,255,0.14)", borderRadius: "10px", padding: "14px 16px",
                position: "relative",
                zIndex: dragging ? 5 : undefined,
                transform: dragging ? `translateY(${dragOffsetY}px) scale(1.02)` : undefined,
                boxShadow: dragging ? "0 10px 26px rgba(0,0,0,0.55)" : undefined,
                animation: isMine && !dragging ? "bdGoldShine 2.6s ease-in-out infinite" : undefined,
                transition: dragging ? "none" : "box-shadow 0.15s ease",
              }}>
              {editingId === part.id ? (
                renderForm(editTitle, setEditTitle, editEightCount, setEditEightCount, editAssigneeIds, setEditAssigneeIds, editImage, setEditImage, () => setEditingId(null), saveEdit, savingEdit)
              ) : (
                <button onClick={() => setViewingPartId(part.id)} style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                    {part.imageUrl && (
                      <img src={part.imageUrl} alt="" style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>{part.title}</div>
                      <div style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>
                        {part.eightCount != null && <>{part.eightCount}エイト・</>}担当{part.assigneeIds.length}人
                      </div>
                    </div>
                  </div>
                  {/* 並び替えのつまみは、この一覧を見られるメンバーなら誰でも操作できる。
                      編集・削除は今まで通り作成者/パートを作った本人だけ */}
                  <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}>
                    <span
                      onPointerDown={e => handleGripPointerDown(e, part.id)}
                      onPointerMove={e => handleGripPointerMove(e, part.id)}
                      onPointerUp={e => handleGripPointerUp(e, part.id)}
                      onPointerCancel={e => handleGripPointerUp(e, part.id)}
                      title="長押しで並び替え"
                      style={{ cursor: "grab", color: "rgba(255,255,255,0.35)", padding: "4px", display: "flex", touchAction: "none" }}>
                      <GripVertical size={14} />
                    </span>
                    {canManage && (
                      <>
                        <span onClick={() => openEdit(part)} title="編集" style={{ cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: "4px", display: "flex" }}><Pencil size={14} /></span>
                        <span onClick={() => setDeleteTarget(part.id)} title="削除" style={{ cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: "4px", display: "flex" }}><Trash2 size={14} /></span>
                      </>
                    )}
                  </div>
                </button>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* タップすると開く「誰が一緒に踊るか」の一覧 */}
      {viewingPartId && (() => {
        const part = parts.find(p => p.id === viewingPartId);
        if (!part) return null;
        const assignees = part.assigneeIds.map(id => candidates.find(c => c.id === id)).filter((c): c is Assignee => !!c);
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setViewingPartId(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.1) 46%, rgba(255,255,255,0.02) 58%, transparent 72%), linear-gradient(150deg, #2c2c2c 0%, #1a1a1a 25%, #242424 48%, #161616 70%, #282828 100%)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "16px", padding: "24px 20px", width: "100%", maxWidth: "340px", maxHeight: "80vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em" }}>一緒に踊るメンバー</div>
                <button onClick={() => setViewingPartId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={18} /></button>
              </div>
              {part.imageUrl && (
                <img src={part.imageUrl} alt="" onClick={() => setViewingImageUrl(part.imageUrl)}
                  style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: "10px", marginBottom: "12px", display: "block", cursor: "pointer" }} />
              )}
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

      {/* 添付画像の全画面表示。タップまたは背景クリックで閉じる */}
      {viewingImageUrl && (
        <div onClick={() => setViewingImageUrl(null)} style={{ position: "fixed", inset: 0, zIndex: 280, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <button onClick={() => setViewingImageUrl(null)} style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", cursor: "pointer", color: "#fff", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
          <img src={viewingImageUrl} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "8px" }} />
        </div>
      )}

      {/* パートの削除確認モーダル */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 260, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setDeleteTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderRadius: "12px", padding: "28px 24px", width: "100%", maxWidth: "320px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>🗑️</div>
            <div style={{ fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "20px", color: "#F0F0F0", marginBottom: "8px" }}>パートを削除</div>
            <div style={{ fontSize: "13px", color: "#F0F0F0", marginBottom: "24px", lineHeight: "1.6" }}>削除すると元に戻せません。本当に削除しますか？</div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: "12px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "8px", background: "none", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#F0F0F0" }}>キャンセル</button>
              <button onClick={deletePart} disabled={deleting} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", background: "linear-gradient(135deg, #DC2626, #A61B1B)", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#FFFFFF", fontWeight: "bold" }}>{deleting ? "削除中..." : "削除する"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
