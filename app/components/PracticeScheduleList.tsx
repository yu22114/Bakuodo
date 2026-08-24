"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Check, X, Clock, MapPin, Calendar, MessageSquare } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { todayStr, TIME_OPTIONS, endTimeOptions, endTimeLabel, isNextDayEnd, DEFAULT_START_TIME } from "../lib/constants";
import { Loading } from "./Loading";

const ACCENT = "#DC2626";

export type Member = { id: string; dancer_name: string; avatar_url: string | null; instagram: string | null; isCreator: boolean };
type PracticeSchedule = { id: string; practice_date: string; practice_time: string | null; practice_end_time: string | null; place: string | null };
type AttendanceStatus = "yes" | "maybe" | "no";
type Attendance = { status: AttendanceStatus | null; comment: string | null };

// 参加可否の表示（○=参加できる/△=未定/×=参加できない）
const STATUS_META: Record<AttendanceStatus, { label: string; color: string }> = {
  yes: { label: "○", color: "#16A34A" },
  maybe: { label: "△", color: "#EAB308" },
  no: { label: "×", color: "#DC2626" },
};

// 練習日程を「9/20(日)」のように短く表示する
function formatJaDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`;
}

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

// 1つの練習カード（またはカード未設定欄）の中身：練習日程の追加・一覧・参加可否・コメント。
// CommunityGenreCardScreen（カード詳細）とCommunityBoardScreen（カード未設定の欄）の両方から使う
export function PracticeScheduleList({ boardId, cardId, isOwn, user, members, allowAdd, heading, onCountChange }: {
  boardId: string;
  cardId: string | null; // nullは「カードを作る前に登録された既存の日程」欄
  isOwn: boolean;
  user: SupabaseUser;
  members: Member[] | null;
  allowAdd: boolean;
  heading?: string;
  onCountChange?: (n: number) => void;
}) {
  const [schedules, setSchedules] = useState<PracticeSchedule[] | null>(null);
  const [attendances, setAttendances] = useState<Record<string, Record<string, Attendance>>>({});
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
  const [viewingScheduleId, setViewingScheduleId] = useState<string | null>(null);
  const [commentTarget, setCommentTarget] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  const fetchAttendances = async (scheduleIds: string[]) => {
    if (scheduleIds.length === 0) { setAttendances({}); return; }
    const { data } = await supabase.from("community_board_attendances").select("schedule_id, user_id, status, comment").in("schedule_id", scheduleIds);
    const map: Record<string, Record<string, Attendance>> = {};
    (data as any[] ?? []).forEach(r => {
      if (!map[r.schedule_id]) map[r.schedule_id] = {};
      map[r.schedule_id][r.user_id] = { status: r.status, comment: r.comment };
    });
    setAttendances(map);
  };

  const fetchSchedules = async () => {
    let query = supabase.from("community_board_practice_schedules").select("id, practice_date, practice_time, practice_end_time, place").eq("board_id", boardId);
    query = cardId ? query.eq("card_id", cardId) : query.is("card_id", null);
    const { data } = await query.order("practice_date", { ascending: true }).order("practice_time", { ascending: true }).order("created_at", { ascending: true });
    const list = (data as any[]) ?? [];
    setSchedules(list);
    onCountChange?.(list.length);
    fetchAttendances(list.map(s => s.id));
  };

  useEffect(() => { fetchSchedules(); }, [boardId, cardId]);

  // 自分の○/△/×を記録する（同じ日程に既に回答済みなら上書き。コメントは触らないので消えない）
  const setMyAttendance = async (scheduleId: string, status: AttendanceStatus) => {
    const { error } = await supabase.from("community_board_attendances")
      .upsert({ schedule_id: scheduleId, user_id: user.id, status }, { onConflict: "schedule_id,user_id" });
    if (!error) {
      setAttendances(prev => ({ ...prev, [scheduleId]: { ...(prev[scheduleId] ?? {}), [user.id]: { status, comment: prev[scheduleId]?.[user.id]?.comment ?? null } } }));
    }
  };

  // コメントボタン：自分の今のコメントを詰めてモーダルを開く
  const openComment = (scheduleId: string) => {
    setCommentTarget(scheduleId);
    setCommentDraft(attendances[scheduleId]?.[user.id]?.comment ?? "");
  };
  const saveComment = async () => {
    if (!commentTarget || savingComment) return;
    setSavingComment(true);
    const comment = commentDraft.trim();
    const { error } = await supabase.from("community_board_attendances")
      .upsert({ schedule_id: commentTarget, user_id: user.id, comment: comment || null }, { onConflict: "schedule_id,user_id" });
    setSavingComment(false);
    if (!error) {
      setAttendances(prev => ({ ...prev, [commentTarget]: { ...(prev[commentTarget] ?? {}), [user.id]: { status: prev[commentTarget]?.[user.id]?.status ?? null, comment: comment || null } } }));
      setCommentTarget(null);
    }
  };

  const addSchedule = async () => {
    if (!newDate || addingSchedule || !cardId) return;
    setAddingSchedule(true);
    const { error } = await supabase.from("community_board_practice_schedules").insert({
      board_id: boardId, card_id: cardId, practice_date: newDate, practice_time: newStartTime || null, practice_end_time: newEndTime || null, place: newPlace.trim() || null,
    });
    setAddingSchedule(false);
    if (!error) {
      setNewDate(""); setNewStartTime(DEFAULT_START_TIME); setNewEndTime(""); setNewPlace(""); setShowAddSchedule(false);
      fetchSchedules();
    }
  };
  const deleteSchedule = async (id: string) => {
    const { error } = await supabase.from("community_board_practice_schedules").delete().eq("id", id);
    if (!error) { setSchedules(list => (list ?? []).filter(s => s.id !== id)); onCountChange?.((schedules ?? []).length - 1); }
  };

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

  // 読み込み中、またはカード未設定欄で1件もなければ何も表示しない
  if (schedules === null) return allowAdd ? <Loading /> : null;
  if (!allowAdd && schedules.length === 0) return null;

  return (
    <div>
      {heading && <div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>{heading}</div>}

      {/* 練習日程を追加するボタン（作成者だけ、カードに紐づく時だけ） */}
      {isOwn && allowAdd && (
        <div style={{ marginBottom: "12px" }}>
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

      {schedules.length === 0 ? (
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", fontFamily: "'Noto Sans JP',sans-serif", padding: "2px 2px 4px" }}>まだ練習日程がありません</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {schedules.map((s, i) => {
            // 日にちが過ぎたものは灰色にして終わったことがわかるようにする。
            // まだ来ていないものは「今後の予定」バッジを出す
            const isPast = s.practice_date < todayStr();
            return (
              <div key={s.id} onClick={() => setViewingScheduleId(s.id)} style={{ width: "100%", boxSizing: "border-box", background: "linear-gradient(150deg, #2c2c2c 0%, #1a1a1a 25%, #242424 48%, #161616 70%, #282828 100%)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "10px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", position: "relative", overflow: "hidden", opacity: isPast ? 0.5 : 1, cursor: "pointer", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}>
                {!isPast && (
                  <div style={{ position: "absolute", top: 0, right: 0, background: "rgba(255,255,255,0.12)", padding: "3px 10px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", fontWeight: "bold", borderBottomLeftRadius: "4px" }}>今後の予定</div>
                )}
                {/* 番号は一番左に専用の列として配置する */}
                <div style={{ alignSelf: "stretch", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingRight: "12px", borderRight: "1px solid rgba(255,255,255,0.1)", fontSize: "16px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>
                  {circledNumber(i + 1)}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: 1, minWidth: 0, fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
                    <Calendar size={12} color="rgba(255,255,255,0.4)" />{formatJaDate(s.practice_date)}
                    {s.practice_time && (
                      <>
                        <Clock size={12} color="rgba(255,255,255,0.4)" style={{ marginLeft: "6px" }} />{formatTimeRange(s.practice_time, s.practice_end_time)}
                      </>
                    )}
                  </div>
                  {s.place && (
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <MapPin size={12} color="rgba(255,255,255,0.4)" />{s.place}
                    </div>
                  )}
                  {/* 参加可否（○/△/×）。タップで自分の回答を記録する。横幅いっぱいに均一の四角で並べる */}
                  <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: "6px", marginTop: "4px", width: "100%" }}>
                    {(["yes", "maybe", "no"] as AttendanceStatus[]).map(st => {
                      const meta = STATUS_META[st];
                      const mine = attendances[s.id]?.[user.id]?.status === st;
                      return (
                        <button key={st} onClick={() => setMyAttendance(s.id, st)}
                          style={{ flex: 1, height: "30px", borderRadius: "6px", border: mine ? `1px solid ${meta.color}` : "1px solid rgba(255,255,255,0.14)", background: mine ? `${meta.color}22` : "transparent", color: mine ? meta.color : "rgba(255,255,255,0.5)", fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                  {/* コメント：一言を残す。参加状況の一覧で名前の下に出る */}
                  <button onClick={e => { e.stopPropagation(); openComment(s.id); }}
                    style={{ display: "flex", alignItems: "center", gap: "4px", maxWidth: "100%", marginTop: "2px", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", padding: "2px 0" }}>
                    <MessageSquare size={11} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attendances[s.id]?.[user.id]?.comment || "コメント"}</span>
                  </button>
                </div>
                {isOwn && (
                  <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
                    <button onClick={() => startEditSchedule(s)} title="編集" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: "4px" }}><Pencil size={14} /></button>
                    <button onClick={() => deleteSchedule(s.id)} title="削除" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: "4px" }}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 練習日程を開くと出る、誰が○/△/×を押したかの一覧 */}
      {viewingScheduleId && (() => {
        const sched = schedules.find(s => s.id === viewingScheduleId);
        if (!sched) return null;
        const schedAttendance = attendances[viewingScheduleId] ?? {};
        // ○/△/×それぞれの人数を数える
        const counts: Record<AttendanceStatus, number> = { yes: 0, maybe: 0, no: 0 };
        Object.values(schedAttendance).forEach(a => { if (a.status) counts[a.status]++; });
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 245, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setViewingScheduleId(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "linear-gradient(150deg, #2c2c2c 0%, #1a1a1a 25%, #242424 48%, #161616 70%, #282828 100%)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "16px", padding: "24px 20px", width: "100%", maxWidth: "340px", maxHeight: "80vh", overflowY: "auto", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em" }}>参加状況</div>
                <button onClick={() => setViewingScheduleId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={18} /></button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", marginBottom: "12px" }}>
                <Calendar size={13} color="rgba(255,255,255,0.4)" />{formatJaDate(sched.practice_date)}
                {sched.practice_time && <>・{formatTimeRange(sched.practice_time, sched.practice_end_time)}</>}
              </div>
              {/* ○/△/×それぞれの人数 */}
              <div style={{ display: "flex", gap: "14px", marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {(["yes", "maybe", "no"] as AttendanceStatus[]).map(st => (
                  <div key={st} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif" }}>
                    <span style={{ color: STATUS_META[st].color, fontWeight: 700, fontSize: "15px" }}>{STATUS_META[st].label}</span>
                    <span style={{ color: "#F0F0F0" }}>{counts[st]}人</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {(members ?? []).map(m => {
                  const a = schedAttendance[m.id];
                  const meta = a?.status ? STATUS_META[a.status] : null;
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "26px", height: "26px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", flexShrink: 0 }}>
                        {m.avatar_url ? <img src={m.avatar_url} alt={m.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : m.dancer_name[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0" }}>{m.dancer_name}</span>
                          {m.instagram && (
                            <a href={`https://instagram.com/${m.instagram}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: "10px", color: "#A855F7", textDecoration: "none" }}>@{m.instagram}</a>
                          )}
                        </div>
                        {a?.comment && (
                          <div style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>{a.comment}</div>
                        )}
                      </div>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: meta ? meta.color : "rgba(255,255,255,0.3)", flexShrink: 0 }}>{meta ? meta.label : "未回答"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* コメントを書くモーダル */}
      {commentTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setCommentTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#141414", borderRadius: "16px", padding: "24px 20px", width: "100%", maxWidth: "340px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em" }}>COMMENT</div>
              <button onClick={() => setCommentTarget(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={18} /></button>
            </div>
            <input value={commentDraft} onChange={e => setCommentDraft(e.target.value)} placeholder="一言コメント" maxLength={60} autoFocus
              style={{ width: "100%", padding: "10px 12px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
              <button onClick={() => setCommentTarget(null)} disabled={savingComment} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", padding: "8px 14px", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif" }}>キャンセル</button>
              <button onClick={saveComment} disabled={savingComment} style={{ background: ACCENT, border: "none", borderRadius: "8px", cursor: "pointer", color: "#fff", padding: "8px 14px", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700 }}>
                <Check size={13} /> {savingComment ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}

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
