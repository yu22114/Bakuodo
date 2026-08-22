"use client";
import { useState, useEffect } from "react";
import { ChevronLeft, Pencil, Check, X, Plus, Trash2, Clock, MapPin, Calendar } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { todayStr } from "../lib/constants";
import { useSwipeBack } from "../lib/useSwipeBack";
import { Loading } from "./Loading";

const ACCENT = "#DC2626";

// 練習日程を「9/20(日)」のように短く表示する
function formatJaDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`;
}

type BoardDetail = { creator_id: string; practice_notes: string | null };
type PracticeSchedule = { id: string; practice_date: string; practice_time: string | null; place: string | null };

// マイコミュニティのカードを押すと開く画面。中身は「練習内容」カードのみ。
// 閲覧は誰でもできるが、書き換えられるのは作成者だけ
export function CommunityBoardScreen({ board, user, onBack }: {
  board: { id: string; title: string };
  user: SupabaseUser;
  onBack: () => void;
  onViewProfile?: (id: string) => void;
}) {
  const swipeBack = useSwipeBack(onBack);
  const [detail, setDetail] = useState<BoardDetail | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [schedules, setSchedules] = useState<PracticeSchedule[]>([]);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newPlace, setNewPlace] = useState("");
  const [addingSchedule, setAddingSchedule] = useState(false);

  const fetchSchedules = async () => {
    const { data } = await supabase.from("community_board_practice_schedules").select("id, practice_date, practice_time, place")
      .eq("board_id", board.id).order("practice_date", { ascending: true }).order("created_at", { ascending: true });
    setSchedules((data as any) ?? []);
  };

  useEffect(() => {
    async function fetchDetail() {
      const { data } = await supabase.from("community_boards").select("creator_id, practice_notes").eq("id", board.id).single();
      if (data) setDetail(data as any);
    }
    fetchDetail();
    fetchSchedules();
  }, [board.id]);

  const isOwn = detail?.creator_id === user.id;

  const startEditNotes = () => { setNotesDraft(detail?.practice_notes ?? ""); setEditingNotes(true); };
  const saveNotes = async () => {
    if (!detail || savingNotes) return;
    setSavingNotes(true);
    const text = notesDraft.trim();
    const { error } = await supabase.from("community_boards").update({ practice_notes: text || null }).eq("id", board.id);
    setSavingNotes(false);
    if (!error) { setDetail({ ...detail, practice_notes: text || null }); setEditingNotes(false); }
  };

  const addSchedule = async () => {
    if (!newDate || addingSchedule) return;
    setAddingSchedule(true);
    const { error } = await supabase.from("community_board_practice_schedules").insert({
      board_id: board.id, practice_date: newDate, practice_time: newTime || null, place: newPlace.trim() || null,
    });
    setAddingSchedule(false);
    if (!error) {
      setNewDate(""); setNewTime(""); setNewPlace(""); setShowAddSchedule(false);
      fetchSchedules();
    }
  };
  const deleteSchedule = async (id: string) => {
    const { error } = await supabase.from("community_board_practice_schedules").delete().eq("id", id);
    if (!error) setSchedules(list => list.filter(s => s.id !== id));
  };

  return (
    <div {...swipeBack} style={{ position: "fixed", inset: 0, zIndex: 150, background: "#000000", display: "flex", flexDirection: "column", animation: "slideInRight 0.22s ease-out" }}>
      <div style={{ flexShrink: 0, padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D", display: "flex", alignItems: "center", gap: "16px" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "600", padding: "10px 16px", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px", flexShrink: 0 }}>
          <ChevronLeft size={18} strokeWidth={2.5} /> 戻る
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: ACCENT, letterSpacing: "0.15em", marginBottom: "2px" }}>BOARD</div>
          <h2 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "18px", color: "#F0F0F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>【{board.title}】</h2>
        </div>
      </div>

      <div className="bd-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        {detail === null ? (
          <Loading />
        ) : (
          <>
          {/* 練習日程を追加するボタン（作成者だけ）。一番上に置く */}
          {isOwn && (
            <div style={{ marginBottom: "16px" }}>
              {!showAddSchedule ? (
                <button onClick={() => setShowAddSchedule(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", background: "none", border: "1px dashed rgba(255,255,255,0.25)", borderRadius: "8px", padding: "10px", color: "rgba(255,255,255,0.6)", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", boxSizing: "border-box" }}>
                  <Plus size={14} /> 練習日程を追加
                </button>
              ) : (
                <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "8px", padding: "10px" }}>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <input type="date" min={todayStr()} value={newDate} onChange={e => setNewDate(e.target.value)}
                      style={{ flex: "1 1 120px", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none" }} />
                    <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                      style={{ flex: "1 1 90px", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none" }} />
                  </div>
                  <input value={newPlace} onChange={e => setNewPlace(e.target.value)} placeholder="場所（任意）" maxLength={100}
                    style={{ width: "100%", marginTop: "6px", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                    <button onClick={() => { setShowAddSchedule(false); setNewDate(""); setNewTime(""); setNewPlace(""); }} disabled={addingSchedule} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", padding: "7px 12px", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif" }}>キャンセル</button>
                    <button onClick={addSchedule} disabled={!newDate || addingSchedule} style={{ background: newDate ? ACCENT : "rgba(255,255,255,0.12)", border: "none", borderRadius: "8px", cursor: newDate ? "pointer" : "default", color: newDate ? "#fff" : "rgba(255,255,255,0.3)", padding: "7px 12px", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700 }}>{addingSchedule ? "追加中..." : "追加する"}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 練習日程カード（1件ごとに独立したカードとして表示。追加ボタンは上に分離した） */}
          {schedules.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              {schedules.map(s => (
                <div key={s.id} style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: 1, minWidth: 0, fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <Calendar size={12} color="rgba(255,255,255,0.4)" />{formatJaDate(s.practice_date)}
                    </div>
                    {s.practice_time && (
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <Clock size={12} color="rgba(255,255,255,0.4)" />{s.practice_time}
                      </div>
                    )}
                    {s.place && (
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <MapPin size={12} color="rgba(255,255,255,0.4)" />{s.place}
                      </div>
                    )}
                  </div>
                  {isOwn && (
                    <button onClick={() => deleteSchedule(s.id)} title="削除" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: "4px", flexShrink: 0 }}><Trash2 size={14} /></button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* メモカード（自由記述） */}
          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>メモ</span>
              {isOwn && !editingNotes && (
                <button onClick={startEditNotes} title="編集" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", padding: "4px" }}><Pencil size={14} /></button>
              )}
            </div>
            {editingNotes ? (
              <div>
                <textarea
                  value={notesDraft}
                  onChange={e => setNotesDraft(e.target.value)}
                  placeholder="公演に向けた練習内容を記入..."
                  rows={8}
                  style={{ width: "100%", resize: "vertical", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "8px", padding: "10px 12px", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", background: "#1A1A1A", outline: "none", lineHeight: 1.5, boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                  <button onClick={() => setEditingNotes(false)} disabled={savingNotes} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", padding: "8px 14px", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif" }}>
                    <X size={13} /> キャンセル
                  </button>
                  <button onClick={saveNotes} disabled={savingNotes} style={{ background: ACCENT, border: "none", borderRadius: "8px", cursor: "pointer", color: "#fff", padding: "8px 14px", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700 }}>
                    <Check size={13} /> 保存
                  </button>
                </div>
              </div>
            ) : detail.practice_notes ? (
              <p style={{ margin: 0, fontSize: "13px", color: "#F0F0F0", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{detail.practice_notes}</p>
            ) : (
              <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.4)", fontFamily: "'Noto Sans JP',sans-serif" }}>まだ記載がありません</p>
            )}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
