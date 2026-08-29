"use client";
import { useState, useEffect, useRef } from "react";
import { Check, ChevronLeft, X, Camera } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { GenreKey } from "../lib/types";
import { EXTENDED_GENRES, GENRE_COLORS, genreLabel, START_TIME_OPTIONS, isNextDayEnd, endTimeLabel, endTimeOptions, getNextDate, todayStr, toggleGenre as toggleGenreList } from "../lib/constants";
import { StationSearch } from "./StationSearch";
import { Loading } from "./Loading";
import { useSwipeBack } from "../lib/useSwipeBack";

// 添付画像まわり（CYPHERは対象外）。アバターと違い正方形には切り抜かず、長辺だけ縮小する
const POST_IMAGE_MAX = 1600;

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
  const longSide = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longSide > POST_IMAGE_MAX ? POST_IMAGE_MAX / longSide : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  URL.revokeObjectURL(img.src);
  if (!ctx) throw new Error("画像の処理に失敗しました");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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
  // 添付画像。imageUrlは保存済みの画像、imageFile/imagePreviewは選び直した新しい画像
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEvent = kind === "event";
  const accent = isEvent ? "#EAB308" : "#2563EB";
  // EVENTの黄色は白文字だと読みにくいので、accentを背景に敷く箇所だけ文字色を切り替える
  const onAccent = isEvent ? "#171717" : "#fff";
  const noun = isEvent ? "イベント" : "レッスン";

  const toggleGenre = (g: GenreKey) => setForm(f => ({ ...f, genres: toggleGenreList(f.genres, g) }));

  useEffect(() => {
    async function fetchLesson() {
      const { data } = await supabase.from("private_lessons")
        .select("id, title, starts_at, ends_at, location, description, max_members, price, target_level, visibility, requires_approval, kind, image_url, pl_genres(genres:genre_id(name))")
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
        setImageUrl(d.image_url ?? null);
      }
      setLoading(false);
    }
    fetchLesson();
  }, [lessonId]);

  // 画像の選択・解除
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("画像ファイルサイズは10MB以下にしてください"); return; }
    const looksLikeImage = file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i.test(file.name);
    if (!looksLikeImage) { setError("画像ファイルを選択してください"); return; }
    setError("");
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };
  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setImageUrl(null);
  };

  const handleSave = async () => {
    if (!form.date || !form.station) return;
    // 過去日に付け替えられないようにする（投稿時と同じ制限）
    if (form.date < todayStr()) { setError("過去の日付には変更できません"); return; }
    setSaving(true); setError("");
    // 画像を選び直していればアップロードし直す。何もしていなければ今の値（削除していればnull）のまま
    let image_url = imageUrl;
    if (imageFile) {
      try {
        image_url = await uploadPostImage(user.id, imageFile);
      } catch (err) {
        setError((err as any)?.message ?? "画像のアップロードに失敗しました"); setSaving(false); return;
      }
    }
    // +09:00を付けてJSTとして保存（省略するとUTC扱いになり9時間ずれる）
    const starts_at = form.start_time ? `${form.date}T${form.start_time}:00+09:00` : `${form.date}T00:00:00+09:00`;
    const endDate = form.end_time && isNextDayEnd(form.end_time, form.start_time) ? getNextDate(form.date) : form.date;
    const ends_at = form.end_time ? `${endDate}T${form.end_time}:00+09:00` : null;
    const location = form.studio ? `${form.station} ${form.studio}` : form.station;
    // イベント名が空欄なら会場名だけをタイトルにする（会場も未入力なら駅名にフォールバック）
    const title = form.title.trim() || form.studio || location;
    const { error: uErr } = await supabase.from("private_lessons").update({ title, location, description: form.description, starts_at, ends_at, max_members: form.max_members ? Number(form.max_members) : null, price: form.price ? Number(form.price) : null, target_level: form.target_level, visibility: isPrivate ? "private" : "public", requires_approval: requiresApproval, image_url }).eq("id", lessonId).eq("organizer_id", user.id);
    if (uErr) { setError(`保存に失敗しました: ${uErr.message}`); setSaving(false); return; }
    await supabase.from("pl_genres").delete().eq("lesson_id", lessonId);
    if (form.genres.length > 0) {
      const { data: genreRows } = await supabase.from("genres").select("id,name").in("name", form.genres);
      if (genreRows && genreRows.length > 0) {
        await supabase.from("pl_genres").insert(genreRows.map((g: any) => ({ lesson_id: lessonId, genre_id: g.id })));
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
          <label style={lbl}>画像 <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "8px" }}>任意</span></label>
          {(imagePreview || imageUrl) ? (
            <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden" }}>
              <img src={imagePreview ?? imageUrl ?? ""} alt="" style={{ width: "100%", maxHeight: "160px", objectFit: "cover", display: "block" }} />
              <button onClick={clearImage} style={{ position: "absolute", top: "6px", right: "6px", width: "28px", height: "28px", borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "14px", border: "1px dashed rgba(255,255,255,0.24)", borderRadius: "8px", color: "rgba(255,255,255,0.5)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>
              <Camera size={14} /> 画像を選ぶ
              <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: "none" }} />
            </label>
          )}
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
