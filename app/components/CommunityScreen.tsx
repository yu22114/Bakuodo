"use client";
import { useState, useEffect } from "react";
import { Plus, X, Check, UserPlus, Calendar, MapPin } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { GENRES, GENRE_COLORS, genreLabel, toggleGenre, todayStr } from "../lib/constants";
import type { GenreKey } from "../lib/types";
import { Loading } from "./Loading";

type Board = {
  id: string; title: string; subtitle: string | null; venue: string | null; genre: GenreKey | null;
  event_date: string | null; event_start_date: string | null; event_end_date: string | null;
  created_at: string;
  instructors: { id: string; name: string; instagram: string | null }[];
};
type InstructorInput = { name: string; instagram: string };
const EMPTY_INSTRUCTOR: InstructorInput = { name: "", instagram: "" };

// 公演日程を「9/20(日)」のように短く表示する（保存はYYYY-MM-DDのカレンダー値のまま）
function formatJaDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`;
}

// 「コミュニティ」タブ：みんなが自由に作れる掲示板の一覧。
// 右上の「＋」でタイトル等を入力して新しい掲示板を作り、タップすると中身（CommunityBoardScreen）が開く
export function CommunityScreen({ user, onOpenBoard }: {
  user: SupabaseUser;
  onOpenBoard: (board: { id: string; title: string }) => void;
}) {
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newVenue, setNewVenue] = useState("");
  const [newGenres, setNewGenres] = useState<GenreKey[]>([]);
  const [instructors, setInstructors] = useState<InstructorInput[]>([{ ...EMPTY_INSTRUCTOR }]);
  const [creating, setCreating] = useState(false);

  const fetchBoards = async () => {
    const { data } = await supabase
      .from("community_boards")
      .select("id, title, subtitle, venue, genre, event_date, event_start_date, event_end_date, created_at, instructors:community_board_instructors(id, name, instagram, sort_order)")
      .order("created_at", { ascending: false })
      .order("sort_order", { referencedTable: "community_board_instructors", ascending: true });
    setBoards((data as any[])?.map(b => ({ ...b, instructors: b.instructors ?? [] })) ?? []);
  };

  useEffect(() => { fetchBoards(); }, []);

  const resetForm = () => {
    setNewTitle(""); setNewSubtitle(""); setNewStartDate(""); setNewEndDate(""); setNewVenue(""); setNewGenres([]);
    setInstructors([{ ...EMPTY_INSTRUCTOR }]);
  };

  const updateInstructor = (i: number, field: keyof InstructorInput, value: string) => {
    setInstructors(list => list.map((ins, idx) => idx === i ? { ...ins, [field]: value } : ins));
  };
  const addInstructor = () => setInstructors(list => [...list, { ...EMPTY_INSTRUCTOR }]);
  const removeInstructor = (i: number) => setInstructors(list => list.filter((_, idx) => idx !== i));

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title || creating) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("community_boards")
      .insert({
        title,
        creator_id: user.id,
        subtitle: newSubtitle.trim() || null,
        event_start_date: newStartDate || null,
        // 2日目は1日目より後の日を選んだ時だけ意味がある値として保存する
        event_end_date: newEndDate && newEndDate > newStartDate ? newEndDate : null,
        venue: newVenue.trim() || null,
        genre: newGenres[0] ?? null,
      })
      .select("id, title").single();
    if (error || !data) { setCreating(false); return; }
    // 名前を入れた講師だけ登録する（空欄の行は無視）
    const validInstructors = instructors.map(ins => ({ name: ins.name.trim(), instagram: ins.instagram.trim() })).filter(ins => ins.name);
    if (validInstructors.length > 0) {
      await supabase.from("community_board_instructors").insert(
        validInstructors.map((ins, i) => ({ board_id: (data as any).id, name: ins.name, instagram: ins.instagram || null, sort_order: i }))
      );
    }
    setCreating(false);
    setShowCreate(false);
    resetForm();
    fetchBoards();
    onOpenBoard(data as any);
  };

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.12em", color: "rgba(255,255,255,0.5)", marginBottom: "5px" };

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flexShrink: 0, padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "32px", color: "#F0F0F0" }}>マイコミュニティ</h2>
        </div>
        <button onClick={() => setShowCreate(true)} aria-label="掲示板を作る"
          style={{ background: "#DC2626", border: "none", borderRadius: "10px", cursor: "pointer", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "4px" }}>
          <Plus size={20} color="#fff" />
        </button>
      </div>

      <div className="bd-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {boards === null ? (
          <Loading />
        ) : boards.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 16px", color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>
            まだ掲示板がありません。右上の＋から作ってみましょう
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {boards.map(b => {
              const color = b.genre ? GENRE_COLORS[b.genre] : null;
              const genreText = b.genre ? genreLabel(b.genre).toUpperCase() : "";
              return (
                <div key={b.id} onClick={() => onOpenBoard(b)}
                  style={{ padding: "12px 14px", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderLeft: "3px solid #DC2626", borderRadius: "8px", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                  {/* ジャンルはホーム画面のカードと同じく、右下に色付きの背景文字で出す */}
                  {color && (
                    <div aria-hidden="true" style={{ position: "absolute", right: "10px", bottom: "-6px", fontSize: `${Math.round(Math.min(46, Math.round(240 / genreText.length)) * 1.1)}px`, fontStyle: "italic", fontWeight: 900, fontFamily: "'Playfair Display','Noto Sans JP',sans-serif", letterSpacing: "-0.02em", lineHeight: 1, whiteSpace: "nowrap", color: color + "40", pointerEvents: "none", userSelect: "none" }}>
                      {genreText}
                    </div>
                  )}
                  <div style={{ position: "relative" }}>
                    <div style={{ fontSize: "20px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>【{b.title}】</div>
                    {b.subtitle && <div style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", marginTop: "4px" }}>{b.subtitle}</div>}
                    {(b.event_start_date || b.event_date) && (
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "rgba(255,255,255,0.65)", fontFamily: "'Noto Sans JP',sans-serif", marginTop: "5px" }}>
                        <Calendar size={10} color="rgba(255,255,255,0.4)" />
                        {b.event_start_date
                          ? formatJaDate(b.event_start_date) + (b.event_end_date ? `〜${formatJaDate(b.event_end_date)}` : "")
                          : b.event_date}
                      </div>
                    )}
                    {b.venue && (
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "rgba(255,255,255,0.65)", fontFamily: "'Noto Sans JP',sans-serif", marginTop: "3px" }}>
                        <MapPin size={10} color="rgba(255,255,255,0.4)" />{b.venue}
                      </div>
                    )}
                    {b.instructors.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "6px" }}>
                        {b.instructors.map(ins => (
                          <span key={ins.id} style={{ fontSize: "10px", padding: "2px 8px", background: "rgba(255,255,255,0.08)", borderRadius: "20px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>
                            {ins.name}{ins.instagram && <span style={{ color: "#A855F7" }}> @{ins.instagram}</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ height: "80px" }} />
      </div>

      {/* 掲示板を作る */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setShowCreate(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#141414", borderRadius: "16px", padding: "24px 20px", width: "100%", maxWidth: "340px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em" }}>NEW BOARD</div>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={18} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div><label style={lbl}>タイトル</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="例: 〇〇ダンスショーケース" maxLength={50} autoFocus style={inp} />
              </div>
              <div><label style={lbl}>サブタイトル（任意）</label>
                <input value={newSubtitle} onChange={e => setNewSubtitle(e.target.value)} placeholder="例: 〜集大成〜" maxLength={80} style={inp} />
              </div>
              <div>
                <label style={lbl}>ジャンル（任意）</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                  {GENRES.map(g => { const sel = newGenres.includes(g); const col = GENRE_COLORS[g]; return (
                    <button key={g} onClick={() => setNewGenres(list => toggleGenre(list, g))}
                      style={{ padding: "6px 12px", border: sel ? `1px solid ${col}` : "1px solid rgba(255,255,255,0.14)", borderRadius: "20px", background: sel ? `${col}15` : "transparent", color: sel ? col : "rgba(255,255,255,0.5)", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>
                      {genreLabel(g)}
                    </button>
                  ); })}
                </div>
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
                <label style={lbl}>講師（任意・複数登録できます）</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {instructors.map((ins, i) => (
                    <div key={i} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                        <input value={ins.name} onChange={e => updateInstructor(i, "name", e.target.value)} placeholder="講師名" maxLength={30} style={inp} />
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>@</span>
                          <input value={ins.instagram} onChange={e => updateInstructor(i, "instagram", e.target.value)} placeholder="Instagram（任意）" maxLength={60} style={{ ...inp, paddingLeft: "26px" }} />
                        </div>
                      </div>
                      {instructors.length > 1 && (
                        <button onClick={() => removeInstructor(i)} title="この講師を削除" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: "4px", flexShrink: 0 }}><X size={15} /></button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addInstructor} style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "5px", background: "none", border: "1px dashed rgba(255,255,255,0.25)", borderRadius: "6px", padding: "7px 10px", color: "rgba(255,255,255,0.6)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>
                  <UserPlus size={13} /> 講師を追加
                </button>
              </div>
            </div>

            <button onClick={handleCreate} disabled={!newTitle.trim() || creating}
              style={{ marginTop: "18px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", border: "none", borderRadius: "8px", background: newTitle.trim() ? "#DC2626" : "rgba(255,255,255,0.08)", color: newTitle.trim() ? "#fff" : "rgba(255,255,255,0.3)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "bold", cursor: newTitle.trim() ? "pointer" : "default" }}>
              <Check size={14} /> {creating ? "作成中..." : "作成する"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
