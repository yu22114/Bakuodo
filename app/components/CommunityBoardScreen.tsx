"use client";
import { useState, useEffect } from "react";
import { ChevronLeft, Plus, Trash2, Pencil, Check, X, Clock, MapPin, Calendar } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { todayStr, TIME_OPTIONS, endTimeOptions, endTimeLabel, isNextDayEnd, DEFAULT_START_TIME } from "../lib/constants";
import { useSwipeBack } from "../lib/useSwipeBack";
import { Loading } from "./Loading";

const ACCENT = "#DC2626";

// 練習日程を「9/20(日)」のように短く表示する
function formatJaDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`;
}

type BoardDetail = { creator_id: string; subtitle: string | null };
type PracticeSchedule = { id: string; practice_date: string; practice_time: string | null; practice_end_time: string | null; place: string | null };

// 開始・終了時間を「19:00〜21:00」のように表示する（CYPHERのformatEndTimeと同じ考え方で、
// 終了が開始以下＝翌日をまたぐ場合は「翌」を付ける）
function formatTimeRange(start: string | null, end: string | null) {
  if (!start) return null;
  if (!end) return start;
  return `${start}〜${isNextDayEnd(end, start) ? `翌${end}` : end}`;
}

// 日時が早い順の並び順を①②③...で表す（21件目以降は(21)のように数字にフォールバック）
function circledNumber(n: number) {
  return n >= 1 && n <= 20 ? String.fromCodePoint(0x2460 + n - 1) : `(${n})`;
}

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
  const [schedules, setSchedules] = useState<PracticeSchedule[]>([]);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState(DEFAULT_START_TIME);
  const [newEndTime, setNewEndTime] = useState("");
  const [newPlace, setNewPlace] = useState("");
  const [addingSchedule, setAddingSchedule] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editPlace, setEditPlace] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchSchedules = async () => {
    const { data } = await supabase.from("community_board_practice_schedules").select("id, practice_date, practice_time, practice_end_time, place")
      .eq("board_id", board.id).order("practice_date", { ascending: true }).order("practice_time", { ascending: true }).order("created_at", { ascending: true });
    setSchedules((data as any) ?? []);
  };

  useEffect(() => {
    async function fetchDetail() {
      const { data } = await supabase.from("community_boards").select("creator_id, subtitle").eq("id", board.id).single();
      if (data) setDetail(data as any);
    }
    fetchDetail();
    fetchSchedules();
  }, [board.id]);

  const isOwn = detail?.creator_id === user.id;

  const addSchedule = async () => {
    if (!newDate || addingSchedule) return;
    setAddingSchedule(true);
    const { error } = await supabase.from("community_board_practice_schedules").insert({
      board_id: board.id, practice_date: newDate, practice_time: newStartTime || null, practice_end_time: newEndTime || null, place: newPlace.trim() || null,
    });
    setAddingSchedule(false);
    if (!error) {
      setNewDate(""); setNewStartTime(DEFAULT_START_TIME); setNewEndTime(""); setNewPlace(""); setShowAddSchedule(false);
      fetchSchedules();
    }
  };
  const deleteSchedule = async (id: string) => {
    const { error } = await supabase.from("community_board_practice_schedules").delete().eq("id", id);
    if (!error) setSchedules(list => list.filter(s => s.id !== id));
  };

  // 練習日程の編集：カードの✎から開く。入力欄は追加フォームと同じ内容を別モーダルで出す
  const startEditSchedule = (s: PracticeSchedule) => {
    setEditingId(s.id);
    setEditDate(s.practice_date);
    setEditStartTime(s.practice_time ?? "");
    setEditEndTime(s.practice_end_time ?? "");
    setEditPlace(s.place ?? "");
  };
  const saveEditSchedule = async () => {
    if (!editingId || !editDate || savingEdit) return;
    setSavingEdit(true);
    const { error } = await supabase.from("community_board_practice_schedules").update({
      practice_date: editDate, practice_time: editStartTime || null, practice_end_time: editEndTime || null, place: editPlace.trim() || null,
    }).eq("id", editingId);
    setSavingEdit(false);
    if (!error) { setEditingId(null); fetchSchedules(); }
  };

  return (
    <div {...swipeBack} style={{ position: "fixed", inset: 0, zIndex: 150, background: "#000000", display: "flex", flexDirection: "column", animation: "slideInRight 0.22s ease-out" }}>
      <div style={{ flexShrink: 0, padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D", display: "flex", alignItems: "flex-start", gap: "16px" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "600", padding: "10px 16px", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px", flexShrink: 0 }}>
          <ChevronLeft size={18} strokeWidth={2.5} /> 戻る
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: ACCENT, letterSpacing: "0.15em", marginBottom: "2px" }}>BOARD</div>
          {/* タイトル・サブタイトルは省略せず全部見えるように折り返す */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "8px" }}>
            <h2 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "18px", color: "#F0F0F0", wordBreak: "break-word" }}>【{board.title}】</h2>
            {detail?.subtitle && (
              <span style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.55)", wordBreak: "break-word" }}>{detail.subtitle}</span>
            )}
          </div>
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
                  <input type="date" min={todayStr()} value={newDate} onChange={e => setNewDate(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
                  {/* 開始・終了時間はCYPHERと同じ仕様：30分刻みのプルダウンで、終了は開始を基準に並べ替え、
                      開始以下の時刻は「翌日」として翌HH:MMで表示する */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "6px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginBottom: "3px" }}>開始時間</label>
                      <select value={newStartTime} onChange={e => setNewStartTime(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }}>
                        <option value="">未設定</option>
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginBottom: "3px" }}>終了時間</label>
                      <select value={newEndTime} onChange={e => setNewEndTime(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }}>
                        <option value="">未設定</option>
                        {endTimeOptions(newStartTime).map(t => <option key={t} value={t}>{endTimeLabel(t, newStartTime)}</option>)}
                      </select>
                    </div>
                  </div>
                  <input value={newPlace} onChange={e => setNewPlace(e.target.value)} placeholder="場所（任意）" maxLength={100}
                    style={{ width: "100%", marginTop: "6px", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                    <button onClick={() => { setShowAddSchedule(false); setNewDate(""); setNewStartTime(DEFAULT_START_TIME); setNewEndTime(""); setNewPlace(""); }} disabled={addingSchedule} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", padding: "7px 12px", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif" }}>キャンセル</button>
                    <button onClick={addSchedule} disabled={!newDate || addingSchedule} style={{ background: newDate ? ACCENT : "rgba(255,255,255,0.12)", border: "none", borderRadius: "8px", cursor: newDate ? "pointer" : "default", color: newDate ? "#fff" : "rgba(255,255,255,0.3)", padding: "7px 12px", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700 }}>{addingSchedule ? "追加中..." : "追加する"}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 練習日程カード（1件ごとに独立したカードとして表示。追加ボタンは上に分離した） */}
          {schedules.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              {schedules.map((s, i) => (
                <div key={s.id} style={{ width: "100%", boxSizing: "border-box", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                  {/* 番号は一番左に専用の列として配置する */}
                  <div style={{ alignSelf: "stretch", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingRight: "12px", borderRight: "1px solid rgba(255,255,255,0.1)", fontSize: "16px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>
                    {circledNumber(i + 1)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: 1, minWidth: 0, fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <Calendar size={12} color="rgba(255,255,255,0.4)" />{formatJaDate(s.practice_date)}
                    </div>
                    {s.practice_time && (
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <Clock size={12} color="rgba(255,255,255,0.4)" />{formatTimeRange(s.practice_time, s.practice_end_time)}
                      </div>
                    )}
                    {s.place && (
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <MapPin size={12} color="rgba(255,255,255,0.4)" />{s.place}
                      </div>
                    )}
                  </div>
                  {isOwn && (
                    <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
                      <button onClick={() => startEditSchedule(s)} title="編集" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: "4px" }}><Pencil size={14} /></button>
                      <button onClick={() => deleteSchedule(s.id)} title="削除" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: "4px" }}><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </>
        )}
      </div>

      {/* 練習日程の編集モーダル */}
      {editingId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setEditingId(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#141414", borderRadius: "16px", padding: "24px 20px", width: "100%", maxWidth: "340px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em" }}>EDIT SCHEDULE</div>
              <button onClick={() => setEditingId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={18} /></button>
            </div>
            <input type="date" min={todayStr()} value={editDate} onChange={e => setEditDate(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "6px" }}>
              <div>
                <label style={{ display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginBottom: "3px" }}>開始時間</label>
                <select value={editStartTime} onChange={e => setEditStartTime(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }}>
                  <option value="">未設定</option>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginBottom: "3px" }}>終了時間</label>
                <select value={editEndTime} onChange={e => setEditEndTime(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }}>
                  <option value="">未設定</option>
                  {endTimeOptions(editStartTime).map(t => <option key={t} value={t}>{endTimeLabel(t, editStartTime)}</option>)}
                </select>
              </div>
            </div>
            <input value={editPlace} onChange={e => setEditPlace(e.target.value)} placeholder="場所（任意）" maxLength={100}
              style={{ width: "100%", marginTop: "6px", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
              <button onClick={() => setEditingId(null)} disabled={savingEdit} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", padding: "8px 14px", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif" }}>キャンセル</button>
              <button onClick={saveEditSchedule} disabled={!editDate || savingEdit} style={{ background: editDate ? ACCENT : "rgba(255,255,255,0.12)", border: "none", borderRadius: "8px", cursor: editDate ? "pointer" : "default", color: editDate ? "#fff" : "rgba(255,255,255,0.3)", padding: "8px 14px", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700 }}>
                <Check size={13} /> {savingEdit ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
