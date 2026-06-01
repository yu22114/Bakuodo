"use client";
import { useState } from "react";
import { Check, Zap } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { FormState } from "../lib/types";
import { GENRES, GENRE_COLORS, TIME_OPTIONS, START_TIME_OPTIONS, isNextDayTime, endTimeLabel, getNextDate } from "../lib/constants";
import { StationSearch } from "./StationSearch";

export function PostScreen({ onNav, user }: { onNav: (s: string) => void; user: SupabaseUser }) {
  const [form, setForm] = useState<FormState>({ title: "", date: "", start_time: "", end_time: "", station: "", studio: "", genres: [], description: "", max_members: "", payment: [] });
  const [isPrivate, setIsPrivate] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleGenre = (g: (typeof GENRES)[number]) => setForm(f => ({ ...f, genres: f.genres.includes(g) ? f.genres.filter(x => x !== g) : [...f.genres, g] }));
  const togglePayment = (p: string) => setForm(f => ({ ...f, payment: f.payment.includes(p) ? f.payment.filter(x => x !== p) : [...f.payment, p] }));

  const handleSubmit = async () => {
    if (!form.date || !form.station) return;
    setLoading(true); setError("");
    // +09:00を付けてJSTとして保存（省略するとUTC扱いになり9時間ずれる）
    const starts_at = form.start_time ? `${form.date}T${form.start_time}:00+09:00` : `${form.date}T00:00:00+09:00`;
    const endDate = form.end_time && isNextDayTime(form.end_time) ? getNextDate(form.date) : form.date;
    const ends_at = form.end_time ? `${endDate}T${form.end_time}:00+09:00` : null;
    const location = form.studio ? `${form.station} ${form.studio}` : form.station;
    const title = form.title.trim() || location;
    const { data: cypher, error: cErr } = await supabase
      .from("cyphers")
      .insert({ title, location, description: form.description, starts_at, ends_at, max_members: form.max_members ? Number(form.max_members) : null, organizer_id: user.id, visibility: isPrivate ? "private" : "public", requires_approval: requiresApproval })
      .select().single();
    if (cErr || !cypher) { console.error("cypher insert error:", cErr); setError(`投稿に失敗しました。エラー: ${cErr?.message ?? "不明"}`); setLoading(false); return; }
    if (form.genres.length > 0) {
      const { data: genreRows } = await supabase.from("genres").select("id,name").in("name", form.genres);
      if (genreRows && genreRows.length > 0) {
        await supabase.from("cypher_genres").insert(genreRows.map((g: any) => ({ cypher_id: cypher.id, genre_id: g.id })));
      }
    }
    // 主催者を自動で参加者に追加
    await supabase.from("participations").insert({ cypher_id: cypher.id, profile_id: user.id });
    setLoading(false); setSubmitted(true);
    setTimeout(() => onNav("top"), 1800);
  };

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "#F5F7FA", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "6px", color: "#111111", fontSize: "14px", fontFamily: "'Space Mono',monospace", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: "9px", fontFamily: "'Space Mono',monospace", letterSpacing: "0.15em", color: "rgba(0,0,0,0.45)", marginBottom: "6px", textTransform: "uppercase" };

  if (submitted) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", gap: "16px", background: "#FFFFFF" }}>
      <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(22,163,74,0.1)", border: "2px solid #16A34A", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={32} color="#16A34A" /></div>
      <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "28px", color: "#16A34A", margin: 0 }}>POSTED!</p>
    </div>
  );

  return (
    <div style={{ paddingBottom: "80px", background: "#FAFAFA" }}>
      <div style={{ padding: "24px 16px 16px", borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#FFFFFF" }}>
        <div style={{ fontSize: "10px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.35)", letterSpacing: "0.2em", marginBottom: "4px" }}>▶ NEW SESSION</div>
        <h2 style={{ margin: 0, fontFamily: "'Bebas Neue',sans-serif", fontSize: "32px", color: "#111111" }}>サイファーを作成</h2>
      </div>
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && <div style={{ padding: "10px 12px", background: "rgba(255,61,0,0.06)", border: "1px solid rgba(255,61,0,0.25)", borderRadius: "6px", color: "#FF3D00", fontSize: "12px", fontFamily: "'Space Mono',monospace" }}>{error}</div>}

        <div><label style={lbl}>最寄り駅 <span style={{ color: "#FF3D00" }}>*</span></label><StationSearch value={form.station} onChange={v => setForm(f => ({ ...f, station: v }))} inputStyle={inp} /></div>
        <div><label style={lbl}>会場・スタジオ名</label><input style={inp} placeholder="例: 代々木worcle、Buzz渋谷" value={form.studio} onChange={e => setForm(f => ({ ...f, studio: e.target.value }))} /></div>
        <div><label style={lbl}>日付 <span style={{ color: "#FF3D00" }}>*</span></label><input type="date" style={inp} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={lbl}>開始時間</label>
            <select style={inp} value={form.start_time} onChange={e => { const v = e.target.value; setForm(f => ({ ...f, start_time: v, end_time: f.end_time && v && !isNextDayTime(f.end_time) && f.end_time <= v ? "" : f.end_time })); }}>
              <option value="">未設定</option>
              {START_TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>終了時間</label>
            <select style={inp} value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}>
              <option value="">未設定</option>
              {TIME_OPTIONS
                .filter(t => !form.start_time || isNextDayTime(t) || t > form.start_time)
                .map(t => <option key={t} value={t}>{endTimeLabel(t)}</option>)}
            </select>
          </div>
        </div>

        <div><label style={lbl}>イベント名 <span style={{ color: "rgba(0,0,0,0.3)", fontSize: "8px" }}>任意</span></label><input style={inp} placeholder="空欄の場合は開催場所がタイトルになります" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>

        <div>
          <label style={lbl}>ジャンル</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
            {GENRES.map(g => { const sel = form.genres.includes(g); const col = GENRE_COLORS[g]; return (
              <button key={g} onClick={() => toggleGenre(g)} style={{ padding: "6px 12px", border: sel ? `1px solid ${col}` : "1px solid rgba(0,0,0,0.1)", borderRadius: "20px", background: sel ? `${col}15` : "transparent", color: sel ? col : "rgba(0,0,0,0.45)", fontSize: "10px", fontFamily: "'Space Mono',monospace", cursor: "pointer" }}>{g}</button>
            ); })}
          </div>
        </div>

        <div><label style={lbl}>詳細説明</label><textarea style={{ ...inp, minHeight: "80px", resize: "vertical" } as React.CSSProperties} placeholder="参加者へのメッセージ..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
        <div><label style={lbl}>参加定員</label><input style={inp} type="number" min="1" placeholder="空欄 = 無制限" value={form.max_members} onChange={e => setForm(f => ({ ...f, max_members: e.target.value }))} /></div>

        <div>
          <label style={lbl}>支払い方法（複数選択可）</label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {["現金", "PayPay", "無料"].map(p => {
              const sel = form.payment.includes(p);
              return (
                <button key={p} onClick={() => togglePayment(p)}
                  style={{ padding: "8px 16px", border: sel ? "1px solid #FF3D00" : "1px solid rgba(0,0,0,0.1)", borderRadius: "6px", background: sel ? "rgba(255,61,0,0.08)" : "transparent", color: sel ? "#FF3D00" : "rgba(0,0,0,0.45)", fontSize: "12px", fontFamily: "'Space Mono',monospace", cursor: "pointer" }}>
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={() => setIsPrivate(v => !v)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px", cursor: "pointer", textAlign: "left" }}>
          <div>
            <div style={{ fontSize: "13px", fontFamily: "'Space Mono',monospace", color: "#111", fontWeight: "bold" }}>
              🔒 フォロワー限定
            </div>
            <div style={{ fontSize: "10px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.4)", marginTop: "3px" }}>
              ONにするとフォロワーにのみ表示されます
            </div>
          </div>
          <div style={{ width: "44px", height: "26px", borderRadius: "13px", background: isPrivate ? "#FF3D00" : "rgba(0,0,0,0.15)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
            <div style={{ position: "absolute", top: "3px", left: isPrivate ? "21px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
          </div>
        </button>

        <button onClick={() => setRequiresApproval(v => !v)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px", cursor: "pointer", textAlign: "left" }}>
          <div>
            <div style={{ fontSize: "13px", fontFamily: "'Space Mono',monospace", color: "#111", fontWeight: "bold" }}>
              📋 参加承認制
            </div>
            <div style={{ fontSize: "10px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.4)", marginTop: "3px" }}>
              ONにすると参加に主催者の承認が必要になります
            </div>
          </div>
          <div style={{ width: "44px", height: "26px", borderRadius: "13px", background: requiresApproval ? "#FF3D00" : "rgba(0,0,0,0.15)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
            <div style={{ position: "absolute", top: "3px", left: requiresApproval ? "21px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
          </div>
        </button>

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", padding: "14px", border: "none", borderRadius: "6px", background: form.date && form.station ? "#FF3D00" : "rgba(0,0,0,0.06)", color: form.date && form.station ? "#fff" : "rgba(0,0,0,0.25)", fontSize: "15px", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "0.15em", cursor: form.date && form.station ? "pointer" : "not-allowed", opacity: loading ? 0.6 : 1 }}>
          <Zap size={15} style={{ display: "inline", marginRight: "8px", verticalAlign: "middle" }} />
          {loading ? "投稿中..." : "サイファーを投稿する"}
        </button>
      </div>
    </div>
  );
}
