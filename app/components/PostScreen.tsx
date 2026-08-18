"use client";
import { useState, useEffect } from "react";
import { Check, Zap, BookOpen, RotateCcw } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { FormState } from "../lib/types";
import { GENRES, GENRE_COLORS, START_TIME_OPTIONS, DEFAULT_START_TIME, isNextDayEnd, endTimeLabel, endTimeOptions, getNextDate, todayStr, toggleGenre as toggleGenreList } from "../lib/constants";
import { StationSearch } from "./StationSearch";

const DRAFT_KEY = "bakuodori:post-draft:v1";
const EMPTY_FORM: FormState = { title: "", date: "", start_time: DEFAULT_START_TIME, end_time: "", station: "", studio: "", genres: [], description: "", max_members: "", payment: [], studio_fee: "" };
const EMPTY_PL = { title: "", date: "", start_time: DEFAULT_START_TIME, end_time: "", station: "", studio: "", genres: [] as string[], description: "", max_members: "", price: "", target_level: "all" };

export function PostScreen({ onNav, user, initialTab = "cypher" }: { onNav: (s: string) => void; user: SupabaseUser; initialTab?: "cypher" | "pl" | "event" }) {
  // トップでLESSON/EVENTを見ていたならその作成フォームから始める
  const [tab, setTab] = useState<"cypher" | "pl" | "event">(initialTab);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isPrivate, setIsPrivate] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  // PLフォーム用
  const [plForm, setPlForm] = useState(EMPTY_PL);
  const [plIsPrivate, setPlIsPrivate] = useState(false);
  const [plRequiresApproval, setPlRequiresApproval] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  // 復元が終わるまで保存しない。refではなくstateにしているのは、refだと
  // 復元処理と同じ回で保存処理が走ってしまい、まだ空のフォームを見て
  // 「中身なし」と判定して復元したての下書きを消してしまうため
  const [draftLoaded, setDraftLoaded] = useState(false);

  // 入力が何かあるか。何も書いていない状態を下書きとして残さないための判定
  const hasContent = (f: typeof EMPTY_FORM, p: typeof EMPTY_PL) =>
    !!(f.title || f.date || f.station || f.studio || f.description || f.max_members || f.studio_fee || f.genres.length || f.payment.length ||
       p.title || p.date || p.station || p.studio || p.description || p.max_members || p.price);

  // 下書きの復元。タブだけは復元しない（トップで見ていたセクションを優先したいため）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.form) setForm({ ...EMPTY_FORM, ...d.form });
        if (d.plForm) setPlForm({ ...EMPTY_PL, ...d.plForm });
        setIsPrivate(!!d.isPrivate);
        setRequiresApproval(!!d.requiresApproval);
        setPlIsPrivate(!!d.plIsPrivate);
        setPlRequiresApproval(!!d.plRequiresApproval);
        if (hasContent(d.form ?? EMPTY_FORM, d.plForm ?? EMPTY_PL)) setDraftRestored(true);
      }
    } catch { /* 壊れた下書きは無視して空フォームで始める */ }
    setDraftLoaded(true);
  }, []);

  // 入力のたびに自動保存
  useEffect(() => {
    if (!draftLoaded) return;
    try {
      if (!hasContent(form, plForm)) { localStorage.removeItem(DRAFT_KEY); return; }
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, plForm, isPrivate, requiresApproval, plIsPrivate, plRequiresApproval }));
    } catch { /* 保存できなくても入力は続けられるようにする */ }
  }, [draftLoaded, form, plForm, isPrivate, requiresApproval, plIsPrivate, plRequiresApproval]);

  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

  const discardDraft = () => {
    setForm(EMPTY_FORM); setPlForm(EMPTY_PL);
    setIsPrivate(false); setRequiresApproval(false);
    setPlIsPrivate(false); setPlRequiresApproval(false);
    setDraftRestored(false);
    clearDraft();
  };

  // All Styleと他ジャンルの同時選択はできない（constants.tsのtoggleGenreが担当）
  const toggleGenre = (g: (typeof GENRES)[number]) => setForm(f => ({ ...f, genres: toggleGenreList(f.genres, g) }));
  const togglePayment = (p: string) => setForm(f => ({ ...f, payment: f.payment.includes(p) ? f.payment.filter(x => x !== p) : [...f.payment, p] }));
  const togglePlGenre = (g: string) => setPlForm(f => ({ ...f, genres: toggleGenreList(f.genres, g) }));

  // 必須項目（最寄り駅・日付）が埋まっているか
  const canPost = !!(form.date && form.station);
  const canPostPL = !!(plForm.date && plForm.station);
  // イベントはレッスンと同じフォーム・同じテーブルを使い、kindと文言・色だけ変える
  const isEvent = tab === "event";
  const plAccent = isEvent ? "#7C3AED" : "#2563EB";
  const plNoun = isEvent ? "イベント" : "レッスン";

  const handleSubmit = async () => {
    if (!canPost) return;
    // minは手打ちを防げないのでここでも弾く
    if (form.date < todayStr()) { setError("過去の日付は投稿できません"); return; }
    if (form.station.length > 50 || form.title.length > 100 || form.description.length > 1000) {
      setError("入力が長すぎます"); return;
    }
    setLoading(true); setError("");
    // +09:00を付けてJSTとして保存（省略するとUTC扱いになり9時間ずれる）
    const starts_at = form.start_time ? `${form.date}T${form.start_time}:00+09:00` : `${form.date}T00:00:00+09:00`;
    const endDate = form.end_time && isNextDayEnd(form.end_time, form.start_time) ? getNextDate(form.date) : form.date;
    const ends_at = form.end_time ? `${endDate}T${form.end_time}:00+09:00` : null;
    const location = form.studio ? `${form.station} ${form.studio}` : form.station;
    const title = form.title.trim() || location;
    const { data: cypher, error: cErr } = await supabase
      .from("cyphers")
      .insert({ title, location, description: form.description, starts_at, ends_at, max_members: form.max_members ? Number(form.max_members) : null, organizer_id: user.id, visibility: isPrivate ? "private" : "public", requires_approval: requiresApproval, studio_fee: form.studio_fee ? Number(form.studio_fee) : null })
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
    clearDraft(); // 投稿できたので下書きは残さない
    setLoading(false); setSubmitted(true);
    setTimeout(() => onNav("top"), 1800);
  };

  const handleSubmitPL = async () => {
    if (!canPostPL) return;
    if (plForm.date < todayStr()) { setError("過去の日付は投稿できません"); return; }
    if (plForm.station.length > 50 || plForm.title.length > 100 || plForm.description.length > 1000) {
      setError("入力が長すぎます"); return;
    }
    setLoading(true); setError("");
    const starts_at = plForm.start_time ? `${plForm.date}T${plForm.start_time}:00+09:00` : `${plForm.date}T00:00:00+09:00`;
    const endDate = plForm.end_time && isNextDayEnd(plForm.end_time, plForm.start_time) ? getNextDate(plForm.date) : plForm.date;
    const ends_at = plForm.end_time ? `${endDate}T${plForm.end_time}:00+09:00` : null;
    const location = plForm.studio ? `${plForm.station} ${plForm.studio}` : plForm.station;
    const title = plForm.title.trim() || location;
    const { data: lesson, error: lErr } = await supabase
      .from("private_lessons")
      .insert({ title, location, description: plForm.description, starts_at, ends_at, max_members: plForm.max_members ? Number(plForm.max_members) : null, price: plForm.price ? Number(plForm.price) : null, target_level: plForm.target_level, organizer_id: user.id, visibility: plIsPrivate ? "private" : "public", requires_approval: plRequiresApproval, kind: isEvent ? "event" : "lesson" })
      .select().single();
    if (lErr || !lesson) { setError(`投稿に失敗しました: ${lErr?.message ?? "不明"}`); setLoading(false); return; }
    if (plForm.genres.length > 0) {
      const { data: genreRows } = await supabase.from("genres").select("id,name").in("name", plForm.genres);
      if (genreRows && genreRows.length > 0) {
        await supabase.from("pl_genres").insert(genreRows.map((g: any) => ({ lesson_id: lesson.id, genre_id: g.id })));
      }
    }
    clearDraft(); // 投稿できたので下書きは残さない
    setLoading(false); setSubmitted(true);
    setTimeout(() => onNav("top"), 1800);
  };

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "#F5F7FA", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "6px", color: "#111111", fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.15em", color: "#111111", marginBottom: "6px", textTransform: "uppercase" };
  if (submitted) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", gap: "16px", background: "#FFFFFF" }}>
      <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(22,163,74,0.1)", border: "2px solid #16A34A", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={32} color="#16A34A" /></div>
      <p style={{ fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "28px", color: "#16A34A", margin: 0 }}>POSTED!</p>
    </div>
  );

  return (
    <div style={{ paddingBottom: "80px", background: "#FAFAFA" }}>
      <div style={{ padding: "24px 16px 12px", borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#FFFFFF" }}>
        <div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111111", letterSpacing: "0.2em", marginBottom: "4px" }}>▶ NEW SESSION</div>
        <h2 style={{ margin: "0 0 16px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "32px", color: "#111111" }}>投稿する</h2>
        {/* タブはホーム画面と同じ、丸い枠の中で選択中だけ浮くセグメント風 */}
        <div style={{ display: "flex", gap: "4px", background: "#F5F7FA", borderRadius: "14px", padding: "4px" }}>
          {([["cypher", "CYPHER", "#FF3D00"], ["pl", "LESSON", "#2563EB"], ["event", "EVENT", "#7C3AED"]] as const).map(([key, label, color]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ flex: 1, padding: "9px 4px", border: "none", borderRadius: "10px", background: tab === key ? "#FFFFFF" : "transparent", boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.12)" : "none", color: tab === key ? color : "rgba(0,0,0,0.5)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", fontWeight: tab === key ? "bold" : "normal", letterSpacing: "0.06em", transition: "all 0.15s" }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && <div style={{ padding: "10px 12px", background: "rgba(255,61,0,0.06)", border: "1px solid rgba(255,61,0,0.25)", borderRadius: "6px", color: "#FF3D00", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif" }}>{error}</div>}

        {/* 勝手に前回の入力が入っていると驚くので、復元したことを明示して捨てられるようにする */}
        {draftRestored && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: "8px" }}>
            <div style={{ flex: 1, fontSize: "12px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif", lineHeight: 1.5 }}>
              書きかけの内容を復元しました
            </div>
            <button onClick={discardDraft}
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 12px", minHeight: "40px", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.15)", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111111", flexShrink: 0 }}>
              <RotateCcw size={12} /> 破棄
            </button>
          </div>
        )}

        {tab === "cypher" ? (<>
          <div><label style={lbl}>最寄り駅 <span style={{ color: "#FF3D00" }}>*</span></label><StationSearch value={form.station} onChange={v => setForm(f => ({ ...f, station: v }))} inputStyle={inp} /></div>
          <div><label style={lbl}>会場・スタジオ名・部屋番号</label><input style={inp} placeholder="例: Buzz渋谷 3号室、代々木worcle Aスタジオ" value={form.studio} onChange={e => setForm(f => ({ ...f, studio: e.target.value }))} /></div>
          {/* 過去のサイファーは掲載できないので今日より前は選べない */}
          <div><label style={lbl}>日付 <span style={{ color: "#FF3D00" }}>*</span></label><input type="date" style={inp} min={todayStr()} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><label style={lbl}>開始時間</label>
              <select style={inp} value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}>
                {START_TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={lbl}>終了時間</label>
              <select style={inp} value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}>
                <option value="">未設定</option>
                {endTimeOptions(form.start_time).map(t => <option key={t} value={t}>{endTimeLabel(t, form.start_time)}</option>)}
              </select>
            </div>
          </div>
          <div><label style={lbl}>イベント名 <span style={{ color: "#111111", fontSize: "8px" }}>任意</span></label><input style={inp} placeholder="空欄の場合は開催場所がタイトルになります" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><label style={lbl}>ジャンル</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
              {GENRES.map(g => { const sel = form.genres.includes(g); const col = GENRE_COLORS[g]; return (<button key={g} onClick={() => toggleGenre(g)} style={{ padding: "6px 12px", border: sel ? `1px solid ${col}` : "1px solid rgba(0,0,0,0.1)", borderRadius: "20px", background: sel ? `${col}15` : "transparent", color: sel ? col : "rgba(0,0,0,0.45)", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>{g}</button>); })}
            </div>
          </div>
          <div><label style={lbl}>詳細説明</label><textarea style={{ ...inp, minHeight: "80px", resize: "vertical" } as React.CSSProperties} placeholder="参加者へのメッセージ..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><label style={lbl}>参加定員</label><input style={inp} type="number" min="1" placeholder="空欄 = 無制限" value={form.max_members} onChange={e => setForm(f => ({ ...f, max_members: e.target.value }))} /></div>
            <div><label style={lbl}>スタジオ代（円・合計）</label><input style={inp} type="number" min="0" placeholder="例: 6000" value={form.studio_fee} onChange={e => setForm(f => ({ ...f, studio_fee: e.target.value }))} /></div>
          </div>
          <div><label style={lbl}>支払い方法（複数選択可）</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["現金", "PayPay", "無料"].map(p => { const sel = form.payment.includes(p); return (<button key={p} onClick={() => togglePayment(p)} style={{ padding: "8px 16px", border: sel ? "1px solid #FF3D00" : "1px solid rgba(0,0,0,0.1)", borderRadius: "6px", background: sel ? "rgba(255,61,0,0.08)" : "transparent", color: sel ? "#FF3D00" : "rgba(0,0,0,0.45)", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>{p}</button>); })}
            </div>
          </div>
          <button onClick={() => setIsPrivate(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px", cursor: "pointer", textAlign: "left" }}>
            <div><div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111", fontWeight: "bold" }}>🔒 フォロワー限定</div><div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111111", marginTop: "3px" }}>ONにするとフォロワーにのみ表示されます</div></div>
            <div style={{ width: "44px", height: "26px", borderRadius: "13px", background: isPrivate ? "#FF3D00" : "rgba(0,0,0,0.15)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}><div style={{ position: "absolute", top: "3px", left: isPrivate ? "21px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s" }} /></div>
          </button>
          <button onClick={() => setRequiresApproval(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px", cursor: "pointer", textAlign: "left" }}>
            <div><div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111", fontWeight: "bold" }}>📋 参加承認制</div><div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111111", marginTop: "3px" }}>ONにすると参加に主催者の承認が必要になります</div></div>
            <div style={{ width: "44px", height: "26px", borderRadius: "13px", background: requiresApproval ? "#FF3D00" : "rgba(0,0,0,0.15)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}><div style={{ position: "absolute", top: "3px", left: requiresApproval ? "21px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s" }} /></div>
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "14px", border: "none", borderRadius: "6px", background: canPost ? "#FF3D00" : "rgba(0,0,0,0.06)", color: canPost ? "#fff" : "rgba(0,0,0,0.25)", fontSize: "15px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.15em", cursor: canPost ? "pointer" : "not-allowed", opacity: loading ? 0.6 : 1 }}>
            <Zap size={15} style={{ display: "inline", marginRight: "8px", verticalAlign: "middle" }} />
            {loading ? "投稿中..." : "サイファーを投稿する"}
          </button>
        </>) : (<>
          <div><label style={lbl}>最寄り駅 <span style={{ color: plAccent }}>*</span></label><StationSearch value={plForm.station} onChange={v => setPlForm(f => ({ ...f, station: v }))} inputStyle={inp} /></div>
          <div><label style={lbl}>会場・スタジオ名・部屋番号</label><input style={inp} placeholder="例: Buzz渋谷 3号室、代々木worcle Aスタジオ" value={plForm.studio} onChange={e => setPlForm(f => ({ ...f, studio: e.target.value }))} /></div>
          <div><label style={lbl}>日付 <span style={{ color: plAccent }}>*</span></label><input type="date" style={inp} min={todayStr()} value={plForm.date} onChange={e => setPlForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><label style={lbl}>開始時間</label>
              <select style={inp} value={plForm.start_time} onChange={e => setPlForm(f => ({ ...f, start_time: e.target.value }))}>
                {START_TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={lbl}>終了時間</label>
              <select style={inp} value={plForm.end_time} onChange={e => setPlForm(f => ({ ...f, end_time: e.target.value }))}>
                <option value="">未設定</option>
                {endTimeOptions(plForm.start_time).map(t => <option key={t} value={t}>{endTimeLabel(t, plForm.start_time)}</option>)}
              </select>
            </div>
          </div>
          <div><label style={lbl}>{plNoun}名 <span style={{ color: "#111111", fontSize: "8px" }}>任意</span></label><input style={inp} placeholder="空欄の場合は開催場所がタイトルになります" value={plForm.title} onChange={e => setPlForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><label style={lbl}>{isEvent ? "参加費（円）" : "料金（円）"}</label><input style={inp} type="number" min="0" placeholder="例: 3000" value={plForm.price} onChange={e => setPlForm(f => ({ ...f, price: e.target.value }))} /></div>
            <div><label style={lbl}>対象レベル</label>
              <select style={inp} value={plForm.target_level} onChange={e => setPlForm(f => ({ ...f, target_level: e.target.value }))}>
                <option value="all">全レベル</option>
                <option value="beginner">初心者</option>
                <option value="intermediate">中級者</option>
                <option value="advanced">上級者</option>
              </select>
            </div>
          </div>
          <div><label style={lbl}>ジャンル</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
              {GENRES.map(g => { const sel = plForm.genres.includes(g); const col = GENRE_COLORS[g]; return (<button key={g} onClick={() => togglePlGenre(g)} style={{ padding: "6px 12px", border: sel ? `1px solid ${col}` : "1px solid rgba(0,0,0,0.1)", borderRadius: "20px", background: sel ? `${col}15` : "transparent", color: sel ? col : "rgba(0,0,0,0.45)", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>{g}</button>); })}
            </div>
          </div>
          <div><label style={lbl}>詳細説明</label><textarea style={{ ...inp, minHeight: "80px", resize: "vertical" } as React.CSSProperties} placeholder={isEvent ? "イベント内容、持ち物など..." : "レッスン内容、持ち物など..."} value={plForm.description} onChange={e => setPlForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div><label style={lbl}>定員</label><input style={inp} type="number" min="1" placeholder="空欄 = 無制限" value={plForm.max_members} onChange={e => setPlForm(f => ({ ...f, max_members: e.target.value }))} /></div>
          <button onClick={() => setPlIsPrivate(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px", cursor: "pointer", textAlign: "left" }}>
            <div><div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111", fontWeight: "bold" }}>🔒 フォロワー限定</div><div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111111", marginTop: "3px" }}>ONにするとフォロワーにのみ表示されます</div></div>
            <div style={{ width: "44px", height: "26px", borderRadius: "13px", background: plIsPrivate ? plAccent : "rgba(0,0,0,0.15)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}><div style={{ position: "absolute", top: "3px", left: plIsPrivate ? "21px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s" }} /></div>
          </button>
          <button onClick={() => setPlRequiresApproval(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px", cursor: "pointer", textAlign: "left" }}>
            <div><div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111", fontWeight: "bold" }}>📋 申込承認制</div><div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111111", marginTop: "3px" }}>ONにすると申込に{isEvent ? "主催者" : "講師"}の承認が必要になります</div></div>
            <div style={{ width: "44px", height: "26px", borderRadius: "13px", background: plRequiresApproval ? plAccent : "rgba(0,0,0,0.15)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}><div style={{ position: "absolute", top: "3px", left: plRequiresApproval ? "21px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s" }} /></div>
          </button>
          <button onClick={handleSubmitPL} disabled={loading} style={{ width: "100%", padding: "14px", border: "none", borderRadius: "6px", background: canPostPL ? plAccent : "rgba(0,0,0,0.06)", color: canPostPL ? "#fff" : "rgba(0,0,0,0.25)", fontSize: "15px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.15em", cursor: canPostPL ? "pointer" : "not-allowed", opacity: loading ? 0.6 : 1 }}>
            <BookOpen size={15} style={{ display: "inline", marginRight: "8px", verticalAlign: "middle" }} />
            {loading ? "投稿中..." : `${plNoun}を投稿する`}
          </button>
        </>)}
      </div>
    </div>
  );
}
