"use client";
import { useState, useEffect } from "react";
import { Plus, X, Check, LayoutGrid, Camera, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { todayStr } from "../lib/constants";
import { CardSkeleton } from "./CardSkeleton";
import { EmptyState } from "./EmptyState";
import { useScrollShadow } from "../lib/useScrollShadow";
import { showToast } from "./Toast";
import { CommunityBoardCard, type Board } from "./CommunityBoardCard";

// 添付画像まわり（LESSON/EVENT/NUMBERと同じ考え方）。縦4:横3の縦長に中央で切り抜いてから縮小する
const POST_IMAGE_WIDTH = 900;
const POST_IMAGE_HEIGHT = 1200; // 900 * 4/3
// 添付できる画像は最大5枚まで
const MAX_POST_IMAGES = 5;

// 画像は「保存済み（existing）」と「今回選び直した新しい画像（new）」が並んだ1つの配列として扱う。
// 表示順のままimage_urlsに保存するため、削除・追加の操作もこの配列に対してだけ行う
type PostImage = { kind: "existing"; url: string } | { kind: "new"; file: File; preview: string };

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

async function uploadPostImage(userId: string, file: File): Promise<string> {
  const source = await convertHeicIfNeeded(file);
  const img = await loadImageElement(source);
  // 縦4:横3になるよう、中央を基準に元画像から切り出す範囲を決める
  const targetRatio = POST_IMAGE_WIDTH / POST_IMAGE_HEIGHT; // 3/4
  const srcRatio = img.naturalWidth / img.naturalHeight;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (srcRatio > targetRatio) {
    sw = img.naturalHeight * targetRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / targetRatio;
    sy = (img.naturalHeight - sh) / 2;
  }
  const canvas = document.createElement("canvas");
  canvas.width = POST_IMAGE_WIDTH;
  canvas.height = POST_IMAGE_HEIGHT;
  const ctx = canvas.getContext("2d");
  URL.revokeObjectURL(img.src);
  if (!ctx) throw new Error("画像の処理に失敗しました");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, POST_IMAGE_WIDTH, POST_IMAGE_HEIGHT);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("画像の処理に失敗しました");
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("post-images").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw new Error(`画像のアップロードに失敗しました: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(path);
  return publicUrl;
}

// 「コミュニティ」タブ：みんなが自由に作れる掲示板の一覧。
// 右上の「＋」でタイトル等を入力して新しい掲示板を作り、タップすると中身（CommunityBoardScreen）が開く
export function CommunityScreen({ user, onOpenBoard, onViewProfile }: {
  user: SupabaseUser;
  onOpenBoard: (board: { id: string; title: string }) => void;
  onViewProfile?: (id: string) => void;
}) {
  const [boards, setBoards] = useState<Board[] | null>(null);
  // 一覧をスクロールした時、固定ヘッダーの下にうっすら影を出す
  const scrollShadow = useScrollShadow<HTMLDivElement>();
  // プロフィール画面の「マイコミュニティ」ボタンで追加したメンバー。この画面の見出しと同じ名前なので、
  // ここにも一覧を出す（community_membersテーブル。詳細はPublicProfileScreen参照）
  const [communityMembers, setCommunityMembers] = useState<{ id: string; dancer_name: string; avatar_url: string | null; instagram: string | null; bio: string | null }[] | null>(null);
  // 左下のカレンダーボタンで開く月間カレンダー（ホーム画面のロゴから開くものと同じ、今日が何日か確認するだけのもの）。
  // マイコミュニティでは、練習日程が設定されている日にドットを付け、日付を押すとその日の日程を出す
  // （RLSで見られる範囲だけが自然に返る）
  type DateSchedule = { id: string; board_id: string; board_title: string; practice_time: string | null; practice_end_time: string | null; place: string | null };
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);
  const [schedulesByDate, setSchedulesByDate] = useState<Map<string, DateSchedule[]> | null>(null);
  const [viewingDate, setViewingDate] = useState<string | null>(null);
  useEffect(() => {
    if (!showCalendar || schedulesByDate !== null) return;
    supabase.from("community_board_practice_schedules")
      .select("id, practice_date, practice_time, practice_end_time, place, board_id, board:board_id(title)")
      .then(({ data }) => {
        const map = new Map<string, DateSchedule[]>();
        (data as any[] ?? []).forEach(r => {
          const list = map.get(r.practice_date) ?? [];
          list.push({ id: r.id, board_id: r.board_id, board_title: r.board?.title ?? "UNKNOWN", practice_time: r.practice_time, practice_end_time: r.practice_end_time, place: r.place });
          map.set(r.practice_date, list);
        });
        setSchedulesByDate(map);
      });
  }, [showCalendar, schedulesByDate]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newVenue, setNewVenue] = useState("");
  // 添付画像（複数枚）。既存＋新規を1つの配列にして表示順を保つ
  const [images, setImages] = useState<PostImage[]>([]);
  const [imageError, setImageError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBoards = async () => {
    const { data } = await supabase
      .from("community_boards")
      .select("id, title, subtitle, venue, genre, event_date, event_start_date, event_end_date, image_urls, created_at, creator_id, instructors:community_board_instructors(id, name, instagram, sort_order)")
      .order("created_at", { ascending: false })
      .order("sort_order", { referencedTable: "community_board_instructors", ascending: true });
    setBoards((data as any[])?.map(b => ({ ...b, instructors: b.instructors ?? [], image_urls: b.image_urls ?? [] })) ?? []);
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
    images.forEach(img => { if (img.kind === "new") URL.revokeObjectURL(img.preview); });
    setImages([]); setImageError("");
  };

  // カードの編集ボタン：フォームに既存の内容を詰めて、作成と同じモーダルを編集モードで開く
  const startEdit = (b: Board) => {
    setEditingId(b.id);
    setNewTitle(b.title);
    setNewSubtitle(b.subtitle ?? "");
    setNewStartDate(b.event_start_date ?? "");
    setNewEndDate(b.event_end_date ?? "");
    setNewVenue(b.venue ?? "");
    setImages(b.image_urls.map(url => ({ kind: "existing", url })));
    setShowCreate(true);
  };

  const closeModal = () => { setShowCreate(false); setEditingId(null); resetForm(); };

  // 画像の選択・削除（複数枚まとめて追加できる。上限を超えた分は無視する）
  const handleImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const room = MAX_POST_IMAGES - images.length;
    if (room <= 0) { setImageError(`画像は${MAX_POST_IMAGES}枚まで添付できます`); return; }
    const picked = files.slice(0, room);
    for (const file of picked) {
      if (file.size > 10 * 1024 * 1024) { setImageError("画像ファイルサイズは10MB以下にしてください"); return; }
      const looksLikeImage = file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i.test(file.name);
      if (!looksLikeImage) { setImageError("画像ファイルを選択してください"); return; }
    }
    setImageError(files.length > picked.length ? `画像は${MAX_POST_IMAGES}枚までのため、一部のみ追加しました` : "");
    setImages(arr => [...arr, ...picked.map(file => ({ kind: "new" as const, file, preview: URL.createObjectURL(file) }))]);
  };
  const removeImageAt = (index: number) => {
    setImages(arr => {
      const target = arr[index];
      if (target?.kind === "new") URL.revokeObjectURL(target.preview);
      return arr.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    const title = newTitle.trim();
    if (!title || creating) return;
    setCreating(true);
    // 表示順のまま、既存画像はそのURLを、新しい画像はアップロードしてから得たURLを並べる
    const image_urls: string[] = [];
    for (const img of images) {
      if (img.kind === "existing") { image_urls.push(img.url); continue; }
      try {
        image_urls.push(await uploadPostImage(user.id, img.file));
      } catch (err) {
        showToast((err as any)?.message ?? "画像のアップロードに失敗しました"); setCreating(false); return;
      }
    }
    const fields = {
      title,
      subtitle: newSubtitle.trim() || null,
      event_start_date: newStartDate || null,
      // 2日目は1日目より後の日を選んだ時だけ意味がある値として保存する
      event_end_date: newEndDate && newEndDate > newStartDate ? newEndDate : null,
      venue: newVenue.trim() || null,
      image_urls,
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

  // カレンダーボタンで開く月間カレンダー用のマス目。月初の曜日ぶんだけ空マスを前に詰める
  const today = new Date();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const calendarViewDate = new Date(today.getFullYear(), today.getMonth() + calendarMonthOffset, 1);
  const firstWeekday = calendarViewDate.getDay();
  const daysInMonth = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0).getDate();
  const calendarCells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* ホーム画面と同じ、縦横無尽に動く後光っぽい光。マイコミュニティは紫
          （このアプリで既にInstagramリンクなどに使っている「つながり」の色） */}
      <div ref={scrollShadow.ref} className="bd-scroll bd-glow-bg" style={{ flex: 1, overflowY: "auto", padding: "16px", backgroundColor: "#0A0A0A", backgroundImage: "radial-gradient(circle at center, rgba(168,85,247,0.9) 0%, rgba(168,85,247,0.08) 16%, transparent 32%)" }}>
        {/* アカウント・投稿・アカウント・投稿の順に並べる：各メンバーのすぐ下に、
            そのメンバーが作った掲示板を続けて表示する（自分自身の投稿は先頭にまとめる） */}
        {boards === null || communityMembers === null ? (
          <CardSkeleton />
        ) : (() => {
          const myBoards = boards.filter(b => b.creator_id === user.id);
          const boardsByCreator = new Map<string, Board[]>();
          boards.forEach(b => {
            if (b.creator_id === user.id) return;
            const arr = boardsByCreator.get(b.creator_id) ?? [];
            arr.push(b);
            boardsByCreator.set(b.creator_id, arr);
          });
          if (myBoards.length === 0 && communityMembers.length === 0) {
            return <EmptyState icon={LayoutGrid} padding="60px 16px">まだ掲示板がありません。右下の＋から作ってみましょう</EmptyState>;
          }
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {myBoards.map(b => (
                <CommunityBoardCard key={b.id} board={b} isOwn
                  onClick={() => onOpenBoard(b)} onEdit={() => startEdit(b)} onDelete={() => setDeleteTarget(b.id)} />
              ))}
              {communityMembers.map(m => (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button onClick={() => onViewProfile?.(m.id)}
                    style={{ background: "linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.1) 46%, rgba(255,255,255,0.02) 58%, transparent 72%), linear-gradient(150deg, #2c2c2c 0%, #1a1a1a 25%, #242424 48%, #161616 70%, #282828 100%)", border: "1px solid rgba(168,85,247,0.4)", borderRadius: "12px", cursor: onViewProfile ? "pointer" : "default", padding: "18px 18px", display: "flex", alignItems: "center", gap: "12px", textAlign: "left", boxShadow: "0 6px 22px rgba(168,85,247,0.4), 0 2px 8px rgba(168,85,247,0.3), inset 0 1px 0 rgba(255,255,255,0.08)" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", flexShrink: 0 }}>
                      {m.avatar_url ? <img src={m.avatar_url} alt={m.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : m.dancer_name[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>{m.dancer_name}</span>
                      {m.instagram && <span style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "#38BDF8" }}>@{m.instagram}</span>}
                      {m.bio && <span style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.bio}</span>}
                    </div>
                  </button>
                  {(boardsByCreator.get(m.id) ?? []).map(b => (
                    <CommunityBoardCard key={b.id} board={b} isOwn={false}
                      onClick={() => onOpenBoard(b)} onEdit={() => startEdit(b)} onDelete={() => setDeleteTarget(b.id)} />
                  ))}
                </div>
              ))}
            </div>
          );
        })()}
        <div style={{ height: "80px" }} />
      </div>

      {/* 掲示板を作る・編集する */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={closeModal}>
          <div onClick={e => e.stopPropagation()} style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderRadius: "16px", padding: "24px 20px", width: "100%", maxWidth: "340px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em" }}>{editingId ? "EDIT BOARD" : "NEW BOARD"}</div>
              <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={18} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div><label style={lbl}>イベント名</label>
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
              <div>
                <label style={lbl}>画像（任意・最大{MAX_POST_IMAGES}枚）</label>
                <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
                  {images.map((img, i) => (
                    <div key={i} style={{ position: "relative", flexShrink: 0, width: "84px", borderRadius: "8px", overflow: "hidden" }}>
                      <img src={img.kind === "existing" ? img.url : img.preview} alt="" style={{ width: "84px", aspectRatio: "3 / 4", objectFit: "cover", display: "block" }} />
                      <button onClick={() => removeImageAt(i)} style={{ position: "absolute", top: "4px", right: "4px", width: "22px", height: "22px", borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_POST_IMAGES && (
                    <label style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", width: "84px", aspectRatio: "3 / 4", border: "1px dashed rgba(255,255,255,0.24)", borderRadius: "8px", color: "rgba(255,255,255,0.5)", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>
                      <Camera size={16} /> 追加
                      <input type="file" accept="image/*" multiple onChange={handleImagesSelect} style={{ display: "none" }} />
                    </label>
                  )}
                </div>
                {imageError && <div style={{ marginTop: "6px", fontSize: "10px", color: "#DC2626", fontFamily: "'Noto Sans JP',sans-serif" }}>{imageError}</div>}
              </div>
            </div>

            <button onClick={handleSubmit} disabled={!newTitle.trim() || creating}
              style={{ marginTop: "18px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", border: "none", borderRadius: "8px", background: newTitle.trim() ? "#DC2626" : "rgba(255,255,255,0.08)", color: newTitle.trim() ? "#fff" : "rgba(255,255,255,0.3)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "bold", cursor: newTitle.trim() ? "pointer" : "default" }}>
              <Check size={14} /> {creating ? (editingId ? "保存中..." : "作成中...") : (editingId ? "保存する" : "作成する")}
            </button>
          </div>
        </div>
      )}

      {/* 掲示板を作るボタン。ヘッダーを無くした代わりに、右下に浮かぶ丸ボタンとして残す
          （下部ナビと同じく外側は全幅の透明レイヤーにして中央寄せだけ担わせる）。
          以前は団体用アカウントだけだったが、個人用アカウントでも作れるようにした */}
      <div style={{ position: "fixed", bottom: "88px", left: 0, right: 0, zIndex: 40, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ width: "100%", maxWidth: "480px", display: "flex", justifyContent: "space-between", padding: "0 16px" }}>
          {/* 左下：今日が何日かを確認する月間カレンダー（ホーム画面のロゴから開くものと同じ） */}
          <button onClick={() => { setCalendarMonthOffset(0); setShowCalendar(true); }} aria-label="カレンダーを表示"
            style={{ pointerEvents: "auto", background: "linear-gradient(180deg, #303030, #1c1c1c)", border: "none", borderRadius: "50%", cursor: "pointer", width: "52px", height: "52px", display: "flex", alignItems: "center", justifyContent: "center", color: "#F0F0F0", boxShadow: "0 4px 14px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)" }}>
            <Calendar size={22} />
          </button>
          <button onClick={openCreate} aria-label="掲示板を作る"
            style={{ pointerEvents: "auto", background: "linear-gradient(135deg, #DC2626, #A61B1B)", border: "none", borderRadius: "50%", cursor: "pointer", width: "52px", height: "52px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(220,38,38,0.4), 0 2px 6px rgba(0,0,0,0.3)" }}>
            <Plus size={24} color="#fff" />
          </button>
        </div>
      </div>

      {/* 左下のカレンダーボタンで開く月間カレンダー。今日が何日かを一目で確認するだけのもの */}
      {showCalendar && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }} onClick={() => setShowCalendar(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", margin: "0 auto", background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderRadius: "16px 16px 0 0", padding: "24px 20px 40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button onClick={() => setCalendarMonthOffset(o => o - 1)} aria-label="前の月" style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><ChevronLeft size={20} /></button>
                <span style={{ fontSize: "18px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", letterSpacing: "0.05em" }}>{calendarViewDate.getFullYear()}年{calendarViewDate.getMonth() + 1}月</span>
                <button onClick={() => setCalendarMonthOffset(o => o + 1)} aria-label="次の月" style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><ChevronRight size={20} /></button>
              </div>
              <button onClick={() => setShowCalendar(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "10px" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22D3EE" }} />
              <span style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.45)" }}>練習日程あり</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: "4px" }}>
              {weekdays.map((w, wi) => (
                <div key={w} style={{ textAlign: "center", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: wi === 0 ? "#F87171" : wi === 6 ? "#60A5FA" : "rgba(255,255,255,0.45)", padding: "6px 0" }}>{w}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "4px" }}>
              {calendarCells.map((d, i) => {
                const isToday = calendarMonthOffset === 0 && d === today.getDate();
                const dateStr = d !== null ? `${calendarViewDate.getFullYear()}-${String(calendarViewDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null;
                const daySchedules = dateStr ? schedulesByDate?.get(dateStr) : undefined;
                const hasSchedule = !!daySchedules && daySchedules.length > 0;
                // 列（曜日）で色分け：日曜=赤、土曜=青。今日はこれまで通り紫の丸を優先する
                const weekdayIndex = i % 7;
                const weekdayColor = weekdayIndex === 0 ? "#F87171" : weekdayIndex === 6 ? "#60A5FA" : "#F0F0F0";
                return (
                  <button key={i} onClick={() => hasSchedule && setViewingDate(dateStr)} disabled={!hasSchedule}
                    style={{ background: "none", border: "none", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", cursor: hasSchedule ? "pointer" : "default" }}>
                    <div style={{ aspectRatio: "1", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: isToday ? "#A855F7" : "transparent", color: d === null ? "transparent" : isToday ? "#fff" : weekdayColor, fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: isToday ? 700 : 400 }}>
                      {d ?? "-"}
                    </div>
                    {/* 練習日程が設定されている日はドットを付ける */}
                    <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: hasSchedule ? "#22D3EE" : "transparent" }} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* カレンダーで日付を押すと出る、その日の練習日程一覧。タップした掲示板を開く */}
      {viewingDate && (
        <div style={{ position: "fixed", inset: 0, zIndex: 210, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setViewingDate(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.1) 46%, rgba(255,255,255,0.02) 58%, transparent 72%), linear-gradient(150deg, #2c2c2c 0%, #1a1a1a 25%, #242424 48%, #161616 70%, #282828 100%)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "16px", padding: "24px 20px", width: "100%", maxWidth: "340px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontSize: "16px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>{viewingDate.replace(/-/g, "/")}の練習日程</span>
              <button onClick={() => setViewingDate(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(schedulesByDate?.get(viewingDate) ?? []).map(s => (
                <button key={s.id} onClick={() => { setViewingDate(null); setShowCalendar(false); onOpenBoard({ id: s.board_id, title: s.board_title }); }}
                  style={{ width: "100%", boxSizing: "border-box", textAlign: "left", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "12px 14px", cursor: "pointer" }}>
                  <div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>{s.board_title}</div>
                  <div style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.55)", marginTop: "4px" }}>
                    {s.practice_time ? `${s.practice_time}${s.practice_end_time ? `〜${s.practice_end_time}` : ""}` : "時間未設定"}
                    {s.place ? `・${s.place}` : ""}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 260, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setDeleteTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderRadius: "12px", padding: "28px 24px", width: "100%", maxWidth: "320px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>🗑️</div>
            <div style={{ fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "20px", color: "#F0F0F0", marginBottom: "8px" }}>掲示板を削除</div>
            <div style={{ fontSize: "13px", color: "#F0F0F0", marginBottom: "24px", lineHeight: "1.6" }}>削除すると投稿・練習内容もすべて消えます。元に戻せません。本当に削除しますか？</div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: "12px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "8px", background: "none", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#F0F0F0" }}>キャンセル</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", background: "linear-gradient(135deg, #DC2626, #A61B1B)", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#FFFFFF", fontWeight: "bold" }}>{deleting ? "削除中..." : "削除する"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
