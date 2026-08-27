"use client";
import { useState, useEffect } from "react";
import { Check, ChevronLeft } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { FormState, GenreKey } from "../lib/types";
import { GENRES, GENRE_COLORS, genreLabel, START_TIME_OPTIONS, isNextDayEnd, endTimeLabel, endTimeOptions, getNextDate, todayStr, toggleGenre as toggleGenreList } from "../lib/constants";
import { StationSearch } from "./StationSearch";
import { Loading } from "./Loading";
import { useSwipeBack } from "../lib/useSwipeBack";

export function EditCypherScreen({ cypherId, user, onBack, onSaved }: {
  cypherId: string;
  user: SupabaseUser;
  onBack: () => void;
  onSaved: () => void;
}) {
  const swipeBack = useSwipeBack(onBack);
  const [form, setForm] = useState<FormState>({ title: "", date: "", start_time: "", end_time: "", station: "", studio: "", genres: [], description: "", max_members: "", payment: [], studio_fee: "" });
  const [isPrivate, setIsPrivate] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // All Styleと他ジャンルの同時選択はできない（投稿フォームと同じルール）
  const toggleGenre = (g: GenreKey) => setForm(f => ({ ...f, genres: toggleGenreList(f.genres, g) }));

  useEffect(() => {
    async function fetchCypher() {
      const { data } = await supabase.from("cyphers")
        .select("id, title, starts_at, ends_at, location, description, max_members, visibility, requires_approval, studio_fee, cypher_genres(genres:genre_id(name))")
        .eq("id", cypherId).single();
      if (data) {
        const starts = new Date((data as any).starts_at);
        const ends = (data as any).ends_at ? new Date((data as any).ends_at) : null;
        const dateStr = `${starts.getFullYear()}-${String(starts.getMonth() + 1).padStart(2, "0")}-${String(starts.getDate()).padStart(2, "0")}`;
        const startTime = `${String(starts.getHours()).padStart(2, "0")}:${String(starts.getMinutes()).padStart(2, "0")}`;
        const endTime = ends ? `${String(ends.getHours()).padStart(2, "0")}:${String(ends.getMinutes()).padStart(2, "0")}` : "";
        const locParts = ((data as any).location ?? "").split(" ");
        const station = locParts[0] ?? "";
        const studio = locParts.slice(1).join(" ");
        const genres = ((data as any).cypher_genres ?? []).map((cg: any) => cg.genres?.name as GenreKey).filter(Boolean);
        setForm({ title: (data as any).title ?? "", date: dateStr, start_time: startTime, end_time: endTime, station, studio, genres, description: (data as any).description ?? "", max_members: (data as any).max_members ? String((data as any).max_members) : "", payment: [], studio_fee: (data as any).studio_fee != null ? String((data as any).studio_fee) : "" });
        setIsPrivate((data as any).visibility === "private");
        setRequiresApproval((data as any).requires_approval ?? false);
      }
      setLoading(false);
    }
    fetchCypher();
  }, [cypherId]);

  const handleSave = async () => {
    if (!form.date || !form.station) return;
    // 過去日に付け替えられないようにする（投稿時と同じ制限）
    if (form.date < todayStr()) { setError("過去の日付には変更できません"); return; }
    setSaving(true); setError("");
    // +09:00を付けてJSTとして保存（省略するとUTC扱いになり9時間ずれる）
    const starts_at = form.start_time ? `${form.date}T${form.start_time}:00+09:00` : `${form.date}T00:00:00+09:00`;
    const endDate = form.end_time && isNextDayEnd(form.end_time, form.start_time) ? getNextDate(form.date) : form.date;
    const ends_at = form.end_time ? `${endDate}T${form.end_time}:00+09:00` : null;
    const location = form.studio ? `${form.station} ${form.studio}` : form.station;
    // イベント名が空欄なら会場名だけをタイトルにする（会場も未入力なら駅名にフォールバック）
    const title = form.title.trim() || form.studio || location;
    const { error: uErr } = await supabase.from("cyphers").update({ title, location, description: form.description, starts_at, ends_at, max_members: form.max_members ? Number(form.max_members) : null, visibility: isPrivate ? "private" : "public", requires_approval: requiresApproval, studio_fee: form.studio_fee ? Number(form.studio_fee) : null }).eq("id", cypherId).eq("organizer_id", user.id);
    if (uErr) { setError(`保存に失敗しました: ${uErr.message}`); setSaving(false); return; }
    await supabase.from("cypher_genres").delete().eq("cypher_id", cypherId);
    if (form.genres.length > 0) {
      const { data: genreRows } = await supabase.from("genres").select("id,name").in("name", form.genres);
      if (genreRows && genreRows.length > 0) {
        await supabase.from("cypher_genres").insert(genreRows.map((g: any) => ({ cypher_id: cypherId, genre_id: g.id })));
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
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "600", padding: "10px 16px", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px", flexShrink: 0 }}>
          <ChevronLeft size={18} strokeWidth={2.5} /> 戻る
        </button>
        <h2 style={{ margin: 0, fontFamily: "'RocknRoll One','Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "32px", color: "#F0F0F0" }}>サイファーを編集</h2>
      </div>
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && <div style={{ padding: "10px 12px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "6px", color: "#DC2626", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif" }}>{error}</div>}
        <div><label style={lbl}>最寄り駅 <span style={{ color: "#DC2626" }}>*</span></label><StationSearch value={form.station} onChange={v => setForm(f => ({ ...f, station: v }))} inputStyle={inp} /></div>
        <div><label style={lbl}>会場・スタジオ名・部屋番号</label><input style={inp} placeholder="例: Buzz渋谷 3号室、代々木worcle Aスタジオ" value={form.studio} onChange={e => setForm(f => ({ ...f, studio: e.target.value }))} /></div>
        {/* Safariはinput[type=date]にwidth:100%を反映しないことがあるため、
            flexコンテナ+flex:1で他の入力欄と横幅を揃える */}
        <div><label style={lbl}>日付 <span style={{ color: "#DC2626" }}>*</span></label>
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
        <div><label style={lbl}>イベント名 <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "8px" }}>任意</span></label><input style={inp} placeholder="空欄の場合は開催場所がタイトルになります" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
        <div>
          <label style={lbl}>ジャンル</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
            {GENRES.map(g => { const sel = form.genres.includes(g); const col = GENRE_COLORS[g]; return (
              <button key={g} onClick={() => toggleGenre(g)} style={{ padding: "6px 12px", border: sel ? `1px solid ${col}` : "1px solid rgba(255,255,255,0.14)", borderRadius: "20px", background: sel ? `${col}15` : "transparent", color: sel ? col : "rgba(255,255,255,0.5)", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>{genreLabel(g)}</button>
            ); })}
          </div>
        </div>
        <div><label style={lbl}>詳細説明</label><textarea style={{ ...inp, minHeight: "80px", resize: "vertical" } as React.CSSProperties} placeholder="参加者へのメッセージ..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div><label style={lbl}>参加定員</label><input style={inp} type="number" min="1" placeholder="空欄 = 無制限" value={form.max_members} onChange={e => setForm(f => ({ ...f, max_members: e.target.value }))} /></div>
          <div><label style={lbl}>スタジオ代（円・合計）</label><input style={inp} type="number" min="0" placeholder="例: 6000" value={form.studio_fee} onChange={e => setForm(f => ({ ...f, studio_fee: e.target.value }))} /></div>
        </div>
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
          <div style={{ width: "44px", height: "26px", borderRadius: "13px", background: isPrivate ? "#DC2626" : "rgba(255,255,255,0.16)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
            <div style={{ position: "absolute", top: "3px", left: isPrivate ? "21px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)", transition: "left 0.2s" }} />
          </div>
        </button>
        <button onClick={() => setRequiresApproval(v => !v)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", cursor: "pointer", textAlign: "left" }}>
          <div>
            <div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", fontWeight: "bold" }}>
              📋 参加承認制
            </div>
            <div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginTop: "3px" }}>
              ONにすると参加に主催者の承認が必要になります
            </div>
          </div>
          <div style={{ width: "44px", height: "26px", borderRadius: "13px", background: requiresApproval ? "#DC2626" : "rgba(255,255,255,0.16)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
            <div style={{ position: "absolute", top: "3px", left: requiresApproval ? "21px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)", transition: "left 0.2s" }} />
          </div>
        </button>
        <button onClick={handleSave} disabled={saving}
          style={{ width: "100%", padding: "14px", border: "none", borderRadius: "6px", background: form.date && form.station ? "#DC2626" : "rgba(255,255,255,0.08)", color: form.date && form.station ? "#fff" : "rgba(255,255,255,0.3)", fontSize: "15px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.15em", cursor: form.date && form.station ? "pointer" : "not-allowed", opacity: saving ? 0.6 : 1 }}>
          <Check size={15} style={{ display: "inline", marginRight: "8px", verticalAlign: "middle" }} />
          {saving ? "保存中..." : "変更を保存する"}
        </button>
      </div>
    </div>
  );
}
