"use client";
import { useState, useEffect } from "react";
import { Check, ChevronLeft } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { FormState, GenreKey } from "../lib/types";
import { GENRES, GENRE_COLORS, genreLabel, todayStr, toggleGenre as toggleGenreList } from "../lib/constants";
import { Loading } from "./Loading";
import { useSwipeBack } from "../lib/useSwipeBack";

// PostScreenのNUMBER投稿フォームと同じ形（イベント名＋想定練習期間の1日目・2日目、
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleGenre = (g: GenreKey) => setForm(f => ({ ...f, genres: toggleGenreList(f.genres, g) }));

  useEffect(() => {
    async function fetchNumber() {
      const { data } = await supabase.from("numbers")
        .select("id, title, starts_at, ends_at, location, description, max_members, number_genres(genres:genre_id(name))")
        .eq("id", numberId).single();
      if (data) {
        const starts = new Date((data as any).starts_at);
        const ends = (data as any).ends_at ? new Date((data as any).ends_at) : null;
        const dateStr = `${starts.getFullYear()}-${String(starts.getMonth() + 1).padStart(2, "0")}-${String(starts.getDate()).padStart(2, "0")}`;
        const endDateStr = ends ? `${ends.getFullYear()}-${String(ends.getMonth() + 1).padStart(2, "0")}-${String(ends.getDate()).padStart(2, "0")}` : "";
        const genres = ((data as any).number_genres ?? []).map((cg: any) => cg.genres?.name as GenreKey).filter(Boolean);
        setForm({ title: (data as any).title ?? "", date: dateStr, start_time: "", end_time: "", station: "", studio: (data as any).location ?? "", genres, description: (data as any).description ?? "", max_members: (data as any).max_members ? String((data as any).max_members) : "", payment: [], studio_fee: "" });
        setEndDate(endDateStr);
      }
      setLoading(false);
    }
    fetchNumber();
  }, [numberId]);

  const canSave = !!(form.title.trim() && form.date);

  const handleSave = async () => {
    if (!canSave) return;
    if (form.date < todayStr()) { setError("過去の日付には変更できません"); return; }
    setSaving(true); setError("");
    const title = form.title.trim();
    const starts_at = `${form.date}T00:00:00+09:00`;
    const ends_at = endDate && endDate > form.date ? `${endDate}T23:59:59+09:00` : null;
    const location = form.studio.trim() || title;
    const { error: uErr } = await supabase.from("numbers").update({ title, location, description: form.description, starts_at, ends_at, max_members: form.max_members ? Number(form.max_members) : null }).eq("id", numberId).eq("organizer_id", user.id);
    if (uErr) { setError(`保存に失敗しました: ${uErr.message}`); setSaving(false); return; }
    await supabase.from("number_genres").delete().eq("number_id", numberId);
    if (form.genres.length > 0) {
      const { data: genreRows } = await supabase.from("genres").select("id,name").in("name", form.genres);
      if (genreRows && genreRows.length > 0) {
        await supabase.from("number_genres").insert(genreRows.map((g: any) => ({ number_id: numberId, genre_id: g.id })));
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
        <h2 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "32px", color: "#F0F0F0" }}>NUMBERを編集</h2>
      </div>
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && <div style={{ padding: "10px 12px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "6px", color: "#DC2626", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif" }}>{error}</div>}
        <div><label style={lbl}>イベント名 <span style={{ color: "#EC4899" }}>*</span></label><input style={inp} placeholder="例: 〇〇ダンスショーケース" maxLength={100} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div><label style={lbl}>想定練習期間 1日目 <span style={{ color: "#EC4899" }}>*</span></label>
            <div style={{ display: "flex" }}><input type="date" style={{ ...inp, flex: 1 }} min={todayStr()} value={form.date} onChange={e => { const v = e.target.value; setForm(f => ({ ...f, date: v })); if (endDate && endDate < v) setEndDate(""); }} /></div>
          </div>
          <div><label style={lbl}>2日目 <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "8px" }}>任意</span></label>
            <div style={{ display: "flex" }}><input type="date" style={{ ...inp, flex: 1 }} min={form.date || todayStr()} value={endDate} onChange={e => setEndDate(e.target.value)} disabled={!form.date} /></div>
          </div>
        </div>
        <div><label style={lbl}>会場 <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "8px" }}>任意</span></label><input style={inp} placeholder="例: Buzz渋谷 3号室、代々木worcle Aスタジオ" value={form.studio} onChange={e => setForm(f => ({ ...f, studio: e.target.value }))} /></div>
        <div>
          <label style={lbl}>ジャンル</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
            {GENRES.map(g => { const sel = form.genres.includes(g); const col = GENRE_COLORS[g]; return (
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
