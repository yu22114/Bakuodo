"use client";
import { useState } from "react";
import { Zap, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { GENRES, GENRE_COLORS } from "../../lib/constants";
import type { GenreKey, FormState } from "../../lib/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function PostScreen({ onNav, user }: { onNav: (s: string) => void; user: SupabaseUser }) {
  const [form, setForm] = useState<FormState>({ title: "", date: "", time: "", location: "", genres: [], description: "", max_members: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toggleGenre = (g: GenreKey) => setForm(f => ({ ...f, genres: f.genres.includes(g) ? f.genres.filter(x => x !== g) : [...f.genres, g] }));

  const handleSubmit = async () => {
    if (!form.title || !form.date || !form.location) return;
    setLoading(true); setError("");
    const starts_at = form.time ? `${form.date}T${form.time}:00` : `${form.date}T00:00:00`;
    const { data: cypher, error: cErr } = await supabase
      .from("cyphers")
      .insert({ title: form.title, location: form.location, description: form.description, starts_at, max_members: form.max_members ? Number(form.max_members) : null, organizer_id: user.id })
      .select().single();
    if (cErr || !cypher) { setError("投稿に失敗しました。"); setLoading(false); return; }
    if (form.genres.length > 0) {
      const { data: genreRows } = await supabase.from("genres").select("id,name").in("name", form.genres);
      if (genreRows && genreRows.length > 0) {
        await supabase.from("cypher_genres").insert(genreRows.map((g: any) => ({ cypher_id: cypher.id, genre_id: g.id })));
      }
    }
    setLoading(false); setSubmitted(true);
    setTimeout(() => onNav("top"), 1800);
  };

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "2px", color: "#F5F5F5", fontSize: "14px", fontFamily: "'Space Mono',monospace", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: "9px", fontFamily: "'Space Mono',monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.4)", marginBottom: "6px", textTransform: "uppercase" };

  if (submitted) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", gap: "16px" }}>
      <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(105,255,71,0.1)", border: "2px solid #69FF47", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={32} color="#69FF47" /></div>
      <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "28px", color: "#69FF47", margin: 0 }}>POSTED!</p>
    </div>
  );

  return (
    <div style={{ paddingBottom: "80px" }}>
      <div style={{ padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: "10px", fontFamily: "'Space Mono',monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", marginBottom: "4px" }}>▶ NEW SESSION</div>
        <h2 style={{ margin: 0, fontFamily: "'Bebas Neue',sans-serif", fontSize: "32px", color: "#F5F5F5" }}>サイファーを作る</h2>
      </div>
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && <div style={{ padding: "10px 12px", background: "rgba(255,61,0,0.1)", border: "1px solid rgba(255,61,0,0.3)", borderRadius: "2px", color: "#FF3D00", fontSize: "12px", fontFamily: "'Space Mono',monospace" }}>{error}</div>}
        <div><label style={lbl}>イベント名 *</label><input style={inp} placeholder="例: 渋谷夜間サイファー" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div><label style={lbl}>日付 *</label><input type="date" style={inp} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div><label style={lbl}>時間</label><input type="time" style={inp} value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} /></div>
        </div>
        <div><label style={lbl}>場所 *</label><input style={inp} placeholder="例: 渋谷駅 ハチ公前" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
        <div>
          <label style={lbl}>ジャンル</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
            {GENRES.map(g => { const sel = form.genres.includes(g); const col = GENRE_COLORS[g]; return (
              <button key={g} onClick={() => toggleGenre(g)} style={{ padding: "6px 12px", border: sel ? `1px solid ${col}` : "1px solid rgba(255,255,255,0.12)", borderRadius: "2px", background: sel ? `${col}20` : "transparent", color: sel ? col : "rgba(255,255,255,0.45)", fontSize: "10px", fontFamily: "'Space Mono',monospace", cursor: "pointer" }}>{g}</button>
            );})}
          </div>
        </div>
        <div><label style={lbl}>詳細説明</label><textarea style={{ ...inp, minHeight: "80px", resize: "vertical" } as React.CSSProperties} placeholder="参加者へのメッセージ..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
        <div><label style={lbl}>参加定員</label><input style={inp} type="number" placeholder="空欄 = 無制限" value={form.max_members} onChange={e => setForm(f => ({ ...f, max_members: e.target.value }))} /></div>
        <button onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", padding: "14px", border: "none", borderRadius: "2px", background: form.title && form.date && form.location ? "linear-gradient(135deg,#FF3D00,#FF6D00)" : "rgba(255,255,255,0.06)", color: form.title && form.date && form.location ? "#fff" : "rgba(255,255,255,0.3)", fontSize: "15px", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "0.15em", cursor: form.title && form.date && form.location ? "pointer" : "not-allowed", opacity: loading ? 0.6 : 1 }}>
          <Zap size={15} style={{ display: "inline", marginRight: "8px", verticalAlign: "middle" }} />
          {loading ? "投稿中..." : "サイファーを投稿する"}
        </button>
      </div>
    </div>
  );
}
