"use client";
import { useState, useEffect } from "react";
import { Check, ChevronLeft, X, Plus, Camera } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { FormState, GenreKey } from "../lib/types";
import { EXTENDED_GENRES, GENRE_COLORS, genreLabel, todayStr, toggleGenre as toggleGenreList } from "../lib/constants";
import { Loading } from "./Loading";
import { useSwipeBack } from "../lib/useSwipeBack";

// 添付画像まわり（CYPHERは対象外）。縦4:横3の縦長に中央で切り抜いてから縮小する
const POST_IMAGE_WIDTH = 900;
const POST_IMAGE_HEIGHT = 1200; // 900 * 4/3

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

// PostScreenのNUMBER投稿フォームと同じ形（イベント名＋想定練習期間の開始・終了、
// 最寄り駅・スタジオ代・時刻は持たない）
export function EditNumberScreen({ numberId, user, onBack, onSaved }: {
  numberId: string;
  user: SupabaseUser;
  onBack: () => void;
  onSaved: () => void;
}) {
  const swipeBack = useSwipeBack(onBack);
  const [form, setForm] = useState<FormState>({ title: "", date: "", start_time: "", end_time: "", station: "", studio: "", genres: [], description: "", max_members: "", payment: [], studio_fee: "" });
  const [endDate, setEndDate] = useState("");
  // 本番当日。連続していなくてもよい複数の日付を追加・削除できるようにする
  const [performanceDates, setPerformanceDates] = useState<string[]>([]);
  // 添付画像。imageUrlは保存済みの画像、imageFile/imagePreviewは選び直した新しい画像
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleGenre = (g: GenreKey) => setForm(f => ({ ...f, genres: toggleGenreList(f.genres, g) }));

  useEffect(() => {
    async function fetchNumber() {
      const { data } = await supabase.from("numbers")
        .select("id, title, starts_at, ends_at, location, description, max_members, image_url, number_genres(genres:genre_id(name)), number_performance_dates(event_date)")
        .eq("id", numberId).single();
      if (data) {
        const starts = new Date((data as any).starts_at);
        const ends = (data as any).ends_at ? new Date((data as any).ends_at) : null;
        const dateStr = `${starts.getFullYear()}-${String(starts.getMonth() + 1).padStart(2, "0")}-${String(starts.getDate()).padStart(2, "0")}`;
        const endDateStr = ends ? `${ends.getFullYear()}-${String(ends.getMonth() + 1).padStart(2, "0")}-${String(ends.getDate()).padStart(2, "0")}` : "";
        const genres = ((data as any).number_genres ?? []).map((cg: any) => cg.genres?.name as GenreKey).filter(Boolean);
        const perfDates = ((data as any).number_performance_dates ?? []).map((d: any) => d.event_date as string).sort();
        setForm({ title: (data as any).title ?? "", date: dateStr, start_time: "", end_time: "", station: "", studio: (data as any).location ?? "", genres, description: (data as any).description ?? "", max_members: (data as any).max_members ? String((data as any).max_members) : "", payment: [], studio_fee: "" });
        setEndDate(endDateStr);
        setPerformanceDates(perfDates);
        setImageUrl((data as any).image_url ?? null);
      }
      setLoading(false);
    }
    fetchNumber();
  }, [numberId]);

  const canSave = !!(form.title.trim() && form.date);

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
    if (!canSave) return;
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
    const title = form.title.trim();
    const starts_at = `${form.date}T00:00:00+09:00`;
    const ends_at = endDate && endDate > form.date ? `${endDate}T23:59:59+09:00` : null;
    const location = form.studio.trim() || title;
    const { error: uErr } = await supabase.from("numbers").update({ title, location, description: form.description, starts_at, ends_at, max_members: form.max_members ? Number(form.max_members) : null, image_url }).eq("id", numberId).eq("organizer_id", user.id);
    if (uErr) { setError(`保存に失敗しました: ${uErr.message}`); setSaving(false); return; }
    await supabase.from("number_genres").delete().eq("number_id", numberId);
    if (form.genres.length > 0) {
      const { data: genreRows } = await supabase.from("genres").select("id,name").in("name", form.genres);
      if (genreRows && genreRows.length > 0) {
        await supabase.from("number_genres").insert(genreRows.map((g: any) => ({ number_id: numberId, genre_id: g.id })));
      }
    }
    // 本番当日は一旦全部消してから作り直す（ジャンルと同じやり方。空欄の行は無視する）
    await supabase.from("number_performance_dates").delete().eq("number_id", numberId);
    const validPerformanceDates = performanceDates.filter(Boolean);
    if (validPerformanceDates.length > 0) {
      await supabase.from("number_performance_dates").insert(validPerformanceDates.map(event_date => ({ number_id: numberId, event_date })));
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
        <h2 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "32px", color: "#F0F0F0" }}>NUMBERを編集</h2>
      </div>
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && <div style={{ padding: "10px 12px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "6px", color: "#DC2626", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif" }}>{error}</div>}
        <div><label style={lbl}>イベント名 <span style={{ color: "#EC4899" }}>*</span></label><input style={inp} placeholder="例: 〇〇ダンスショーケース" maxLength={100} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div><label style={lbl}>想定練習期間 開始 <span style={{ color: "#EC4899" }}>*</span></label>
            <div style={{ display: "flex" }}><input type="date" style={{ ...inp, flex: 1 }} min={todayStr()} value={form.date} onChange={e => { const v = e.target.value; setForm(f => ({ ...f, date: v })); if (endDate && endDate < v) setEndDate(""); }} /></div>
          </div>
          <div><label style={lbl}>終了 <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "8px" }}>任意</span></label>
            <div style={{ display: "flex" }}><input type="date" style={{ ...inp, flex: 1 }} min={form.date || todayStr()} value={endDate} onChange={e => setEndDate(e.target.value)} disabled={!form.date} /></div>
          </div>
        </div>
        <div>
          <label style={lbl}>本番当日 <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "8px" }}>任意</span></label>
          {performanceDates.map((d, i) => (
            <div key={i} style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
              <input type="date" style={{ ...inp, flex: 1 }} min={todayStr()} value={d} onChange={e => { const v = e.target.value; setPerformanceDates(arr => arr.map((x, idx) => idx === i ? v : x)); }} />
              <button onClick={() => setPerformanceDates(arr => arr.filter((_, idx) => idx !== i))}
                style={{ flexShrink: 0, width: "40px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "6px", color: "#F0F0F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14} />
              </button>
            </div>
          ))}
          <button onClick={() => setPerformanceDates(arr => [...arr, ""])}
            style={{ width: "100%", padding: "10px", border: "1px dashed rgba(236,72,153,0.5)", borderRadius: "6px", background: "transparent", color: "#EC4899", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <Plus size={12} /> 日程を追加
          </button>
        </div>
        <div><label style={lbl}>会場 <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "8px" }}>任意</span></label><input style={inp} placeholder="例: Buzz渋谷 3号室、代々木worcle Aスタジオ" value={form.studio} onChange={e => setForm(f => ({ ...f, studio: e.target.value }))} /></div>
        <div>
          <label style={lbl}>ジャンル</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
            {EXTENDED_GENRES.map(g => { const sel = form.genres.includes(g); const col = GENRE_COLORS[g]; return (
              <button key={g} onClick={() => toggleGenre(g)} style={{ padding: "6px 12px", border: sel ? "none" : "1px solid rgba(255,255,255,0.14)", borderRadius: "20px", background: sel ? `linear-gradient(180deg, color-mix(in srgb, ${col} 55%, white 45%), color-mix(in srgb, ${col} 55%, white 15%))` : "transparent", boxShadow: sel ? `0 3px 7px ${col}33, inset 0 1px 0 rgba(255,255,255,0.5)` : "inset 0 1px 3px rgba(0,0,0,0.3)", color: sel ? `color-mix(in srgb, ${col} 100%, black 35%)` : "rgba(255,255,255,0.5)", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", fontWeight: sel ? "bold" : "normal" }}>{genreLabel(g)}</button>
            ); })}
          </div>
        </div>
        <div><label style={lbl}>詳細説明</label><textarea style={{ ...inp, minHeight: "80px", resize: "vertical" } as React.CSSProperties} placeholder="参加者へのメッセージ..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
        <div><label style={lbl}>想定人数</label><input style={inp} type="number" min="1" placeholder="空欄 = 未定" value={form.max_members} onChange={e => setForm(f => ({ ...f, max_members: e.target.value }))} /></div>
        <button onClick={handleSave} disabled={saving || !canSave}
          style={{ width: "100%", padding: "14px", border: "none", borderRadius: "6px", background: canSave ? "#EC4899" : "rgba(255,255,255,0.08)", color: canSave ? "#fff" : "rgba(255,255,255,0.3)", fontSize: "15px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.15em", cursor: canSave ? "pointer" : "not-allowed", opacity: saving ? 0.6 : 1 }}>
          <Check size={15} style={{ display: "inline", marginRight: "8px", verticalAlign: "middle" }} />
          {saving ? "保存中..." : "変更を保存する"}
        </button>
      </div>
    </div>
  );
}
