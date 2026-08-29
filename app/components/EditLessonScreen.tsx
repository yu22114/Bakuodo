"use client";
import { useState, useEffect, useRef } from "react";
import { Check, ChevronLeft, X, Camera } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { GenreKey, StaffRole } from "../lib/types";
import { EXTENDED_GENRES, GENRE_COLORS, genreLabel, START_TIME_OPTIONS, isNextDayEnd, endTimeLabel, endTimeOptions, getNextDate, todayStr, toggleGenre as toggleGenreList, normalizeInstagramUrl, STAFF_ROLES, STAFF_ROLE_LABELS } from "../lib/constants";
import { StationSearch } from "./StationSearch";
import { Loading } from "./Loading";
import { useSwipeBack } from "../lib/useSwipeBack";

// 添付画像まわり（CYPHERは対象外）。縦4:横3の縦長に中央で切り抜いてから縮小する
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

// ジャンルは横スクロールのドラム式で選ぶ（投稿画面と同じ見た目）。
// LESSON・EVENTなのでGIRLS/JAZZ/FREESTYLEも含む拡張ジャンル一覧を使う
function GenreStrip({ value, onChange }: { value: string; onChange: (g: (typeof EXTENDED_GENRES)[number]) => void }) {
  const selectedRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [value]);
  return (
    <div className="bd-scroll" style={{ display: "flex", gap: "7px", overflowX: "auto", padding: "2px 1px 6px" }}>
      {EXTENDED_GENRES.map(g => {
        const sel = value === g;
        const col = GENRE_COLORS[g];
        return (
          <button key={g} ref={sel ? selectedRef : undefined} type="button" onClick={() => onChange(g)}
            style={{ flexShrink: 0, padding: "6px 12px", border: sel ? "none" : "1px solid rgba(255,255,255,0.14)", borderRadius: "20px", background: sel ? `linear-gradient(180deg, color-mix(in srgb, ${col} 55%, white 45%), color-mix(in srgb, ${col} 55%, white 15%))` : "transparent", boxShadow: sel ? `0 3px 7px ${col}33, inset 0 1px 0 rgba(255,255,255,0.5)` : "inset 0 1px 3px rgba(0,0,0,0.3)", color: sel ? `color-mix(in srgb, ${col} 100%, black 35%)` : "rgba(255,255,255,0.5)", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", whiteSpace: "nowrap", fontWeight: sel ? "bold" : "normal" }}>
            {genreLabel(g)}
          </button>
        );
      })}
    </div>
  );
}

// EVENTだけが持つJUDGE・DJ・MC。1人ずつ、フォロー中のアカウントから選ぶか、
// アプリ未登録の人向けにInstagramを手入力するかのどちらかで追加する
type StaffDraft = { profileId: string | null; dancerName: string | null; avatarUrl: string | null; instagram: string | null };

function StaffRoleEditor({ role, entries, onChange, following }: {
  role: StaffRole;
  entries: StaffDraft[];
  onChange: (next: StaffDraft[]) => void;
  following: { id: string; dancer_name: string; avatar_url: string | null }[];
}) {
  const [instagramInput, setInstagramInput] = useState("");
  const availableFollowing = following.filter(f => !entries.some(e => e.profileId === f.id));

  const addFromFollowing = (id: string) => {
    const person = following.find(f => f.id === id);
    if (!person) return;
    onChange([...entries, { profileId: person.id, dancerName: person.dancer_name, avatarUrl: person.avatar_url, instagram: null }]);
  };
  const addFromInstagram = () => {
    const handle = normalizeInstagramUrl(instagramInput);
    if (!handle) return;
    onChange([...entries, { profileId: null, dancerName: null, avatarUrl: null, instagram: handle }]);
    setInstagramInput("");
  };
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));

  const inp: React.CSSProperties = { flex: 1, padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" };

  return (
    <div>
      <label style={{ display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.15em", color: "#F0F0F0", marginBottom: "6px", textTransform: "uppercase" }}>
        {STAFF_ROLE_LABELS[role]} <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "8px" }}>任意</span>
      </label>
      {entries.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
          {entries.map((e, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 8px 4px 4px", background: "rgba(255,255,255,0.08)", borderRadius: "20px", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0" }}>
              {e.profileId ? (
                <>
                  <span style={{ width: "18px", height: "18px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, flexShrink: 0 }}>
                    {e.avatarUrl ? <img src={e.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : e.dancerName?.[0]?.toUpperCase()}
                  </span>
                  {e.dancerName}
                </>
              ) : (
                <span style={{ color: "#38BDF8" }}>@{e.instagram?.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/+$/, "")}</span>
              )}
              <button onClick={() => remove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", padding: 0, display: "flex" }}><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      <select value="" onChange={e => e.target.value && addFromFollowing(e.target.value)} disabled={availableFollowing.length === 0}
        style={{ ...inp, width: "100%", color: availableFollowing.length ? "#F0F0F0" : "rgba(255,255,255,0.3)" }}>
        <option value="">フォロー中から選ぶ</option>
        {availableFollowing.map(f => <option key={f.id} value={f.id}>{f.dancer_name}</option>)}
      </select>
      <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
        <input value={instagramInput} onChange={e => setInstagramInput(e.target.value)} placeholder="Instagram（URLか@ユーザー名）" maxLength={200} autoCapitalize="none" autoCorrect="off" style={inp} />
        <button onClick={addFromInstagram} disabled={!instagramInput.trim()} type="button"
          style={{ flexShrink: 0, padding: "0 12px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "6px", background: "transparent", color: instagramInput.trim() ? "#F0F0F0" : "rgba(255,255,255,0.3)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: instagramInput.trim() ? "pointer" : "default" }}>
          追加
        </button>
      </div>
    </div>
  );
}

const EMPTY_FORM = { title: "", date: "", start_time: "", end_time: "", station: "", studio: "", genres: [] as GenreKey[], description: "", max_members: "", price: "", target_level: "all" };

export function EditLessonScreen({ lessonId, user, onBack, onSaved }: {
  lessonId: string;
  user: SupabaseUser;
  onBack: () => void;
  onSaved: () => void;
}) {
  const swipeBack = useSwipeBack(onBack);
  const [form, setForm] = useState(EMPTY_FORM);
  // kindは既存データから読み取るだけで、編集画面側で変更はさせない（レッスン⇄イベントの種別変更は想定外）
  const [kind, setKind] = useState<"lesson" | "event">("lesson");
  const [isPrivate, setIsPrivate] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  // 添付画像（複数枚）。既存＋新規を1つの配列にして表示順を保つ
  const [images, setImages] = useState<PostImage[]>([]);
  // JUDGE・DJ・MC（EVENTだけで使う）。ロールごとに配列を持つ
  const [staffByRole, setStaffByRole] = useState<Record<StaffRole, StaffDraft[]>>({ judge: [], dj: [], mc: [] });
  // フォロー中のアカウント一覧（JUDGE・DJ・MCの選択肢に使う）
  const [following, setFollowing] = useState<{ id: string; dancer_name: string; avatar_url: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEvent = kind === "event";
  const accent = isEvent ? "#EAB308" : "#2563EB";
  // EVENTの黄色は白文字だと読みにくいので、accentを背景に敷く箇所だけ文字色を切り替える
  const onAccent = isEvent ? "#171717" : "#fff";
  const noun = isEvent ? "イベント" : "レッスン";

  const toggleGenre = (g: GenreKey) => setForm(f => ({ ...f, genres: toggleGenreList(f.genres, g) }));

  // JUDGE・DJ・MCの「フォロー中から選ぶ」に出す一覧。承認済みのフォローだけを対象にする
  useEffect(() => {
    supabase.from("follows").select("following_id, profiles:following_id ( dancer_name, avatar_url )")
      .eq("follower_id", user.id).eq("status", "accepted")
      .then(({ data }) => {
        setFollowing((data ?? []).map((row: any) => ({ id: row.following_id, dancer_name: row.profiles?.dancer_name ?? "UNKNOWN", avatar_url: row.profiles?.avatar_url ?? null })));
      });
  }, [user.id]);

  useEffect(() => {
    async function fetchLesson() {
      const { data } = await supabase.from("private_lessons")
        .select("id, title, starts_at, ends_at, location, description, max_members, price, target_level, visibility, requires_approval, kind, image_url, image_urls, pl_genres(genres:genre_id(name)), pl_staff(role, profile_id, instagram, sort_order, profiles:profile_id(dancer_name, avatar_url))")
        .eq("id", lessonId).single();
      if (data) {
        const d = data as any;
        const starts = new Date(d.starts_at);
        const ends = d.ends_at ? new Date(d.ends_at) : null;
        const dateStr = `${starts.getFullYear()}-${String(starts.getMonth() + 1).padStart(2, "0")}-${String(starts.getDate()).padStart(2, "0")}`;
        const startTime = `${String(starts.getHours()).padStart(2, "0")}:${String(starts.getMinutes()).padStart(2, "0")}`;
        const endTime = ends ? `${String(ends.getHours()).padStart(2, "0")}:${String(ends.getMinutes()).padStart(2, "0")}` : "";
        const locParts = (d.location ?? "").split(" ");
        const station = locParts[0] ?? "";
        const studio = locParts.slice(1).join(" ");
        const genres = (d.pl_genres ?? []).map((pg: any) => pg.genres?.name as GenreKey).filter(Boolean);
        setForm({ title: d.title ?? "", date: dateStr, start_time: startTime, end_time: endTime, station, studio, genres, description: d.description ?? "", max_members: d.max_members ? String(d.max_members) : "", price: d.price != null ? String(d.price) : "", target_level: d.target_level ?? "all" });
        setKind(d.kind === "event" ? "event" : "lesson");
        setIsPrivate(d.visibility === "private");
        setRequiresApproval(d.requires_approval ?? false);
        // image_urlsを足す前の投稿はimage_urlしか持たないので、無ければそれを1枚目として扱う
        const existingUrls: string[] = d.image_urls?.length ? d.image_urls : (d.image_url ? [d.image_url] : []);
        setImages(existingUrls.map((url: string) => ({ kind: "existing", url })));
        const nextStaff: Record<StaffRole, StaffDraft[]> = { judge: [], dj: [], mc: [] };
        (d.pl_staff ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order).forEach((s: any) => {
          if (!nextStaff[s.role as StaffRole]) return;
          nextStaff[s.role as StaffRole].push({ profileId: s.profile_id, dancerName: s.profiles?.dancer_name ?? null, avatarUrl: s.profiles?.avatar_url ?? null, instagram: s.instagram ?? null });
        });
        setStaffByRole(nextStaff);
      }
      setLoading(false);
    }
    fetchLesson();
  }, [lessonId]);

  // 画像の選択・削除（複数枚まとめて追加できる。上限を超えた分は無視する）
  const handleImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const room = MAX_POST_IMAGES - images.length;
    if (room <= 0) { setError(`画像は${MAX_POST_IMAGES}枚まで添付できます`); return; }
    const picked = files.slice(0, room);
    for (const file of picked) {
      if (file.size > 10 * 1024 * 1024) { setError("画像ファイルサイズは10MB以下にしてください"); return; }
      const looksLikeImage = file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i.test(file.name);
      if (!looksLikeImage) { setError("画像ファイルを選択してください"); return; }
    }
    setError(files.length > picked.length ? `画像は${MAX_POST_IMAGES}枚までのため、一部のみ追加しました` : "");
    setImages(arr => [...arr, ...picked.map(file => ({ kind: "new" as const, file, preview: URL.createObjectURL(file) }))]);
  };
  const removeImageAt = (index: number) => {
    setImages(arr => {
      const target = arr[index];
      if (target?.kind === "new") URL.revokeObjectURL(target.preview);
      return arr.filter((_, i) => i !== index);
    });
  };

  const handleSave = async () => {
    if (!form.date || !form.station) return;
    // 過去日に付け替えられないようにする（投稿時と同じ制限）
    if (form.date < todayStr()) { setError("過去の日付には変更できません"); return; }
    setSaving(true); setError("");
    // 表示順のまま、既存画像はそのURLを、新しい画像はアップロードしてから得たURLを並べる
    const image_urls: string[] = [];
    for (const img of images) {
      if (img.kind === "existing") { image_urls.push(img.url); continue; }
      try {
        image_urls.push(await uploadPostImage(user.id, img.file));
      } catch (err) {
        setError((err as any)?.message ?? "画像のアップロードに失敗しました"); setSaving(false); return;
      }
    }
    const image_url = image_urls[0] ?? null;
    // +09:00を付けてJSTとして保存（省略するとUTC扱いになり9時間ずれる）
    const starts_at = form.start_time ? `${form.date}T${form.start_time}:00+09:00` : `${form.date}T00:00:00+09:00`;
    const endDate = form.end_time && isNextDayEnd(form.end_time, form.start_time) ? getNextDate(form.date) : form.date;
    const ends_at = form.end_time ? `${endDate}T${form.end_time}:00+09:00` : null;
    const location = form.studio ? `${form.station} ${form.studio}` : form.station;
    // イベント名が空欄なら会場名だけをタイトルにする（会場も未入力なら駅名にフォールバック）
    const title = form.title.trim() || form.studio || location;
    const { error: uErr } = await supabase.from("private_lessons").update({ title, location, description: form.description, starts_at, ends_at, max_members: form.max_members ? Number(form.max_members) : null, price: form.price ? Number(form.price) : null, target_level: form.target_level, visibility: isPrivate ? "private" : "public", requires_approval: requiresApproval, image_url, image_urls }).eq("id", lessonId).eq("organizer_id", user.id);
    if (uErr) { setError(`保存に失敗しました: ${uErr.message}`); setSaving(false); return; }
    await supabase.from("pl_genres").delete().eq("lesson_id", lessonId);
    if (form.genres.length > 0) {
      const { data: genreRows } = await supabase.from("genres").select("id,name").in("name", form.genres);
      if (genreRows && genreRows.length > 0) {
        await supabase.from("pl_genres").insert(genreRows.map((g: any) => ({ lesson_id: lessonId, genre_id: g.id })));
      }
    }
    // JUDGE・DJ・MC（EVENTだけ。一旦全部消してから作り直す。genresと同じやり方）
    if (isEvent) {
      await supabase.from("pl_staff").delete().eq("lesson_id", lessonId);
      const staffRows = STAFF_ROLES.flatMap(role => staffByRole[role].map((e, i) => ({ lesson_id: lessonId, role, profile_id: e.profileId, instagram: e.profileId ? null : e.instagram, sort_order: i })));
      if (staffRows.length > 0) {
        await supabase.from("pl_staff").insert(staffRows);
      }
    }
    setSaving(false);
    onSaved();
  };

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.15em", color: "#F0F0F0", marginBottom: "6px", textTransform: "uppercase" as const };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <Loading />
    </div>
  );

  return (
    <div {...swipeBack} style={{ paddingBottom: "80px", background: "#000000" }}>
      <div style={{ padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D", display: "flex", alignItems: "center", gap: "16px" }}>
        <button onClick={onBack} style={{ background: "linear-gradient(180deg, #303030, #1c1c1c)", boxShadow: "0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "600", padding: "10px 16px", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px", flexShrink: 0 }}>
          <ChevronLeft size={18} strokeWidth={2.5} /> 戻る
        </button>
        <h2 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "32px", color: "#F0F0F0" }}>{noun}を編集</h2>
      </div>
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && <div style={{ padding: "10px 12px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "6px", color: "#DC2626", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif" }}>{error}</div>}
        <div><label style={lbl}>最寄り駅 <span style={{ color: accent }}>*</span></label><StationSearch value={form.station} onChange={v => setForm(f => ({ ...f, station: v }))} inputStyle={inp} /></div>
        <div><label style={lbl}>会場・スタジオ名・部屋番号</label><input style={inp} placeholder="例: Buzz渋谷 3号室、代々木worcle Aスタジオ" value={form.studio} onChange={e => setForm(f => ({ ...f, studio: e.target.value }))} /></div>
        {/* Safariはinput[type=date]にwidth:100%を反映しないことがあるため、
            flexコンテナ+flex:1で他の入力欄と横幅を揃える */}
        <div><label style={lbl}>日付 <span style={{ color: accent }}>*</span></label>
          <div style={{ display: "flex" }}><input type="date" style={{ ...inp, flex: 1 }} min={todayStr()} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={lbl}>開始時間</label>
            <select style={inp} value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}>
              {START_TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>終了時間</label>
            <select style={inp} value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}>
              <option value="">未設定</option>
              {endTimeOptions(form.start_time).map(t => <option key={t} value={t}>{endTimeLabel(t, form.start_time)}</option>)}
            </select>
          </div>
        </div>
        <div><label style={lbl}>{noun}名 <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "8px" }}>任意</span></label><input style={inp} placeholder="空欄の場合は開催場所がタイトルになります" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
        <div>
          <label style={lbl}>画像 <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "8px" }}>任意・最大{MAX_POST_IMAGES}枚</span></label>
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
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isEvent ? "1fr" : "1fr 1fr", gap: "10px" }}>
          <div><label style={lbl}>{isEvent ? "参加費（円）" : "料金（円）"}</label><input style={inp} type="number" min="0" placeholder="例: 3000" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
          {!isEvent && <div><label style={lbl}>対象レベル</label>
            <select style={inp} value={form.target_level} onChange={e => setForm(f => ({ ...f, target_level: e.target.value }))}>
              <option value="all">全レベル</option>
              <option value="beginner">初心者</option>
              <option value="intermediate">中級者</option>
              <option value="advanced">上級者</option>
            </select>
          </div>}
        </div>
        <div><label style={lbl}>ジャンル</label>
          <GenreStrip value={form.genres[0] ?? ""} onChange={toggleGenre} />
        </div>
        <div><label style={lbl}>詳細説明</label><textarea style={{ ...inp, minHeight: "80px", resize: "vertical" } as React.CSSProperties} placeholder={isEvent ? "イベント内容、持ち物など..." : "レッスン内容、持ち物など..."} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
        <div><label style={lbl}>定員</label><input style={inp} type="number" min="1" placeholder="空欄 = 無制限" value={form.max_members} onChange={e => setForm(f => ({ ...f, max_members: e.target.value }))} /></div>
        {isEvent && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {STAFF_ROLES.map(role => (
              <StaffRoleEditor key={role} role={role} entries={staffByRole[role]}
                onChange={next => setStaffByRole(s => ({ ...s, [role]: next }))} following={following} />
            ))}
          </div>
        )}
        <button onClick={() => setIsPrivate(v => !v)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", cursor: "pointer", textAlign: "left" }}>
          <div>
            <div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", fontWeight: "bold" }}>
              🔒 フォロワー限定
            </div>
            <div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginTop: "3px" }}>
              ONにするとフォロワーにのみ表示されます
            </div>
          </div>
          <div style={{ width: "44px", height: "26px", borderRadius: "13px", background: isPrivate ? accent : "rgba(255,255,255,0.16)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
            <div style={{ position: "absolute", top: "3px", left: isPrivate ? "21px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)", transition: "left 0.2s" }} />
          </div>
        </button>
        <button onClick={() => setRequiresApproval(v => !v)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", cursor: "pointer", textAlign: "left" }}>
          <div>
            <div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", fontWeight: "bold" }}>
              📋 申込承認制
            </div>
            <div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginTop: "3px" }}>
              ONにすると申込に{isEvent ? "主催者" : "講師"}の承認が必要になります
            </div>
          </div>
          <div style={{ width: "44px", height: "26px", borderRadius: "13px", background: requiresApproval ? accent : "rgba(255,255,255,0.16)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
            <div style={{ position: "absolute", top: "3px", left: requiresApproval ? "21px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)", transition: "left 0.2s" }} />
          </div>
        </button>
        <button onClick={handleSave} disabled={saving}
          style={{ width: "100%", padding: "14px", border: "none", borderRadius: "6px", background: form.date && form.station ? accent : "rgba(255,255,255,0.08)", color: form.date && form.station ? onAccent : "rgba(255,255,255,0.3)", fontSize: "15px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.15em", cursor: form.date && form.station ? "pointer" : "not-allowed", opacity: saving ? 0.6 : 1 }}>
          <Check size={15} style={{ display: "inline", marginRight: "8px", verticalAlign: "middle" }} />
          {saving ? "保存中..." : "変更を保存する"}
        </button>
      </div>
    </div>
  );
}
