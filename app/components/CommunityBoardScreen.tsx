"use client";
import { useState, useEffect } from "react";
import { ChevronLeft, Plus, Trash2, Pencil, Check, X, Clock, MapPin, Calendar, MessageSquare } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { todayStr, TIME_OPTIONS, endTimeOptions, endTimeLabel, isNextDayEnd, DEFAULT_START_TIME, GENRES, GENRE_COLORS, genreLabel, toggleGenre } from "../lib/constants";
import type { GenreKey } from "../lib/types";
import { useSwipeBack } from "../lib/useSwipeBack";
import { Loading } from "./Loading";
import { showToast } from "./Toast";

const ACCENT = "#DC2626";

// 練習日程を「9/20(日)」のように短く表示する
function formatJaDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`;
}

type BoardDetail = { creator_id: string; subtitle: string | null };
type GenreCard = { id: string; title: string; instructor_name: string | null; instructor_instagram: string | null; genre: string | null };
type PracticeSchedule = { id: string; card_id: string | null; practice_date: string; practice_time: string | null; practice_end_time: string | null; place: string | null };
type Member = { id: string; dancer_name: string; avatar_url: string | null; instagram: string | null; isCreator: boolean };
type AttendanceStatus = "yes" | "maybe" | "no";
type Attendance = { status: AttendanceStatus | null; comment: string | null };

// 参加可否の表示（○=参加できる/△=未定/×=参加できない）
const STATUS_META: Record<AttendanceStatus, { label: string; color: string }> = {
  yes: { label: "○", color: "#16A34A" },
  maybe: { label: "△", color: "#EAB308" },
  no: { label: "×", color: "#DC2626" },
};

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
  // 練習カード（作成者がタイトルを決めて自由に作る。練習日程はこのカードの中に追加する）
  const [genreCards, setGenreCards] = useState<GenreCard[] | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardInstructorName, setNewCardInstructorName] = useState("");
  const [newCardInstagram, setNewCardInstagram] = useState("");
  const [newCardGenre, setNewCardGenre] = useState<GenreKey[]>([]);
  const [addingCard, setAddingCard] = useState(false);
  const [deleteCardTarget, setDeleteCardTarget] = useState<string | null>(null);
  const [deletingCard, setDeletingCard] = useState(false);
  // どのカードで追加フォームを開いているか
  const [addingCardId, setAddingCardId] = useState<string | null>(null);
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
  const [members, setMembers] = useState<Member[] | null>(null);
  const [attendances, setAttendances] = useState<Record<string, Record<string, Attendance>>>({});
  const [viewingScheduleId, setViewingScheduleId] = useState<string | null>(null);
  const [commentTarget, setCommentTarget] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  // メンバー欄：作成者＋招待された人。両方を取ってきて1つのリストにする
  const fetchMembers = async (creatorId: string) => {
    const [{ data: creatorProfile }, { data: invites }] = await Promise.all([
      supabase.from("profiles").select("id, dancer_name, avatar_url, instagram").eq("id", creatorId).single(),
      supabase.from("community_board_invites").select("user_id, profiles:user_id(dancer_name, avatar_url, instagram)").eq("board_id", board.id),
    ]);
    const list: Member[] = [];
    if (creatorProfile) list.push({ id: (creatorProfile as any).id, dancer_name: (creatorProfile as any).dancer_name, avatar_url: (creatorProfile as any).avatar_url, instagram: (creatorProfile as any).instagram, isCreator: true });
    (invites as any[] ?? []).forEach(i => {
      list.push({ id: i.user_id, dancer_name: i.profiles?.dancer_name ?? "UNKNOWN", avatar_url: i.profiles?.avatar_url ?? null, instagram: i.profiles?.instagram ?? null, isCreator: false });
    });
    setMembers(list);
  };

  // 練習日程ごとの○/△/×の回答とコメントを、対象の日程IDまとめて取ってくる
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
    const { data } = await supabase.from("community_board_practice_schedules").select("id, card_id, practice_date, practice_time, practice_end_time, place")
      .eq("board_id", board.id).order("practice_date", { ascending: true }).order("practice_time", { ascending: true }).order("created_at", { ascending: true });
    const list = (data as any[]) ?? [];
    setSchedules(list);
    fetchAttendances(list.map(s => s.id));
  };

  // 練習カードの一覧（作成者がタイトルを入れて作ったもの）
  const fetchGenreCards = async () => {
    const { data } = await supabase.from("community_board_genre_cards").select("id, title, instructor_name, instructor_instagram, genre")
      .eq("board_id", board.id).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    setGenreCards((data as any[]) ?? []);
  };

  useEffect(() => {
    async function fetchDetail() {
      const { data } = await supabase.from("community_boards").select("creator_id, subtitle").eq("id", board.id).single();
      if (data) {
        setDetail(data as any);
        fetchMembers((data as any).creator_id);
      }
    }
    fetchDetail();
    fetchSchedules();
    fetchGenreCards();
  }, [board.id]);

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

  const isOwn = detail?.creator_id === user.id;

  const addSchedule = async () => {
    if (!newDate || addingSchedule || !addingCardId) return;
    setAddingSchedule(true);
    const { error } = await supabase.from("community_board_practice_schedules").insert({
      board_id: board.id, card_id: addingCardId, practice_date: newDate, practice_time: newStartTime || null, practice_end_time: newEndTime || null, place: newPlace.trim() || null,
    });
    setAddingSchedule(false);
    if (!error) {
      setNewDate(""); setNewStartTime(DEFAULT_START_TIME); setNewEndTime(""); setNewPlace(""); setAddingCardId(null);
      fetchSchedules();
    }
  };
  const deleteSchedule = async (id: string) => {
    const { error } = await supabase.from("community_board_practice_schedules").delete().eq("id", id);
    if (!error) setSchedules(list => list.filter(s => s.id !== id));
  };

  // 練習カードを作る。IDは先に用意して読み返しをしない＝RLSのRETURNING問題を避ける
  const addCard = async () => {
    const title = newCardTitle.trim();
    if (!title || addingCard) return;
    setAddingCard(true);
    const newId = crypto.randomUUID();
    const instructor_name = newCardInstructorName.trim() || null;
    const instructor_instagram = newCardInstagram.trim() || null;
    const genre = newCardGenre[0] ?? null;
    const { error } = await supabase.from("community_board_genre_cards").insert({ id: newId, board_id: board.id, title, instructor_name, instructor_instagram, genre });
    setAddingCard(false);
    if (error) { console.error("community_board_genre_cards insert error:", error); showToast(`カードの作成に失敗しました: ${error.message}`); return; }
    setGenreCards(list => [...(list ?? []), { id: newId, title, instructor_name, instructor_instagram, genre }]);
    setNewCardTitle(""); setNewCardInstructorName(""); setNewCardInstagram(""); setNewCardGenre([]); setShowAddCard(false);
  };

  const deleteCard = async () => {
    if (!deleteCardTarget || deletingCard) return;
    setDeletingCard(true);
    const { error } = await supabase.from("community_board_genre_cards").delete().eq("id", deleteCardTarget);
    setDeletingCard(false);
    if (!error) {
      // DB側はon delete cascadeで練習日程も一緒に消えるので、手元の一覧も合わせる
      setGenreCards(list => (list ?? []).filter(c => c.id !== deleteCardTarget));
      setSchedules(list => list.filter(s => s.card_id !== deleteCardTarget));
    }
    setDeleteCardTarget(null);
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

  // 練習日程カード1件分。ジャンルカードの中と「ジャンル未設定」の欄、両方から使う
  const renderScheduleCard = (s: PracticeSchedule, i: number) => {
    // 日にちが過ぎたものは灰色にして終わったことがわかるようにする。
    // まだ来ていないものは「今後の予定」バッジを出す
    const isPast = s.practice_date < todayStr();
    return (
      <div key={s.id} onClick={() => setViewingScheduleId(s.id)} style={{ width: "100%", boxSizing: "border-box", background: "linear-gradient(150deg, #2c2c2c 0%, #1a1a1a 25%, #242424 48%, #161616 70%, #282828 100%)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "10px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", position: "relative", overflow: "hidden", opacity: isPast ? 0.5 : 1, cursor: "pointer", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}>
        {!isPast && (
          <div style={{ position: "absolute", top: 0, right: 0, background: "rgba(255,255,255,0.12)", padding: "3px 10px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", fontWeight: "bold", borderBottomLeftRadius: "4px" }}>今後の予定</div>
        )}
        {/* 番号は一番左に専用の列として配置する（ジャンルカードごとに①から数え直す） */}
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
  };

  // 練習日程の追加フォーム。どの練習カードの中に追加するかはaddingCardIdが持っている
  const renderAddForm = () => (
    <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "8px", padding: "10px", marginBottom: "10px" }}>
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
        <button onClick={() => { setAddingCardId(null); setNewDate(""); setNewStartTime(DEFAULT_START_TIME); setNewEndTime(""); setNewPlace(""); }} disabled={addingSchedule} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", padding: "7px 12px", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif" }}>キャンセル</button>
        <button onClick={addSchedule} disabled={!newDate || addingSchedule} style={{ background: newDate ? ACCENT : "rgba(255,255,255,0.12)", border: "none", borderRadius: "8px", cursor: newDate ? "pointer" : "default", color: newDate ? "#fff" : "rgba(255,255,255,0.3)", padding: "7px 12px", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700 }}>{addingSchedule ? "追加中..." : "追加する"}</button>
      </div>
    </div>
  );

  return (
    <div {...swipeBack} style={{ position: "fixed", inset: 0, zIndex: 150, background: "#000000", display: "flex", flexDirection: "column", animation: "slideInRight 0.22s ease-out" }}>
      <div style={{ flexShrink: 0, padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D", display: "flex", alignItems: "flex-start", gap: "16px" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "600", padding: "10px 16px", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px", flexShrink: 0 }}>
          <ChevronLeft size={18} strokeWidth={2.5} /> 戻る
        </button>
        <div style={{ minWidth: 0 }}>
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
          {/* メンバー欄：一覧は出さず合計人数だけ表示する */}
          {members && members.length > 0 && (
            <div style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginBottom: "16px" }}>メンバー {members.length}人</div>
          )}

          {/* 練習カードを作る（作成者だけ）。タイトルを自由に決められる */}
          {isOwn && (
            <div style={{ marginBottom: "16px" }}>
              {!showAddCard ? (
                <button onClick={() => setShowAddCard(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", background: "none", border: "1px dashed rgba(255,255,255,0.25)", borderRadius: "8px", padding: "10px", color: "rgba(255,255,255,0.6)", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", boxSizing: "border-box" }}>
                  <Plus size={14} /> カードを作る
                </button>
              ) : (
                <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "8px", padding: "10px" }}>
                  <input value={newCardTitle} onChange={e => setNewCardTitle(e.target.value)} placeholder="タイトル（例: Hip-Hopクラス）" maxLength={40} autoFocus
                    style={{ width: "100%", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
                  <input value={newCardInstructorName} onChange={e => setNewCardInstructorName(e.target.value)} placeholder="講師の名前（任意）" maxLength={30}
                    style={{ width: "100%", marginTop: "6px", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
                  <input value={newCardInstagram} onChange={e => setNewCardInstagram(e.target.value)} placeholder="講師のInstagram URL（任意）" maxLength={200} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off"
                    style={{ width: "100%", marginTop: "6px", padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
                  <div style={{ marginTop: "8px" }}>
                    <label style={{ display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginBottom: "5px" }}>ジャンル（任意）</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {GENRES.map(g => { const sel = newCardGenre.includes(g); const col = GENRE_COLORS[g]; return (
                        <button key={g} onClick={() => setNewCardGenre(list => toggleGenre(list, g))}
                          style={{ padding: "6px 10px", border: sel ? `1px solid ${col}` : "1px solid rgba(255,255,255,0.14)", borderRadius: "20px", background: sel ? `${col}15` : "transparent", color: sel ? col : "rgba(255,255,255,0.5)", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>
                          {genreLabel(g)}
                        </button>
                      ); })}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
                    <button onClick={() => { setShowAddCard(false); setNewCardTitle(""); setNewCardInstructorName(""); setNewCardInstagram(""); setNewCardGenre([]); }} disabled={addingCard} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", padding: "7px 12px", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif" }}>キャンセル</button>
                    <button onClick={addCard} disabled={!newCardTitle.trim() || addingCard} style={{ background: newCardTitle.trim() ? ACCENT : "rgba(255,255,255,0.12)", border: "none", borderRadius: "8px", cursor: newCardTitle.trim() ? "pointer" : "default", color: newCardTitle.trim() ? "#fff" : "rgba(255,255,255,0.3)", padding: "7px 12px", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700 }}>{addingCard ? "作成中..." : "作成する"}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 練習日程は練習カードごとに分けて表示する。追加もそのカードの中で行う */}
          {genreCards === null ? (
            <Loading />
          ) : genreCards.length === 0 ? (
            !isOwn && <div style={{ textAlign: "center", padding: "40px 16px", color: "rgba(255,255,255,0.4)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>まだ練習カードがありません</div>
          ) : genreCards.map(card => {
            const cardSchedules = schedules.filter(s => s.card_id === card.id);
            const genreColor = card.genre && (GENRE_COLORS as Record<string, string>)[card.genre] ? (GENRE_COLORS as Record<string, string>)[card.genre] : ACCENT;
            return (
              <div key={card.id} style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: genreColor, flexShrink: 0 }} />
                    <span style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.title}</span>
                    {cardSchedules.length > 0 && <span style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>全{cardSchedules.length}件</span>}
                  </div>
                  {isOwn && (
                    <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                      <button onClick={() => { setAddingCardId(id => id === card.id ? null : card.id); setNewDate(""); setNewStartTime(DEFAULT_START_TIME); setNewEndTime(""); setNewPlace(""); }}
                        style={{ background: "none", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "6px", cursor: "pointer", color: "rgba(255,255,255,0.6)", padding: "5px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Plus size={13} />
                      </button>
                      <button onClick={() => setDeleteCardTarget(card.id)} title="カードを削除"
                        style={{ background: "none", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "6px", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: "5px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
                {/* 講師名・Instagram・ジャンルは、設定されているものだけタイトルの下に出す */}
                {(card.instructor_name || card.instructor_instagram || card.genre) && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px", paddingLeft: "14px" }}>
                    {card.instructor_name && <span style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.6)" }}>講師: {card.instructor_name}</span>}
                    {card.instructor_instagram && (
                      <a href={card.instructor_instagram} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "#A855F7", textDecoration: "none" }}>Instagram</a>
                    )}
                    {card.genre && <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: `${genreColor}15`, color: genreColor, fontFamily: "'Noto Sans JP',sans-serif" }}>{genreLabel(card.genre)}</span>}
                  </div>
                )}

                {isOwn && addingCardId === card.id && renderAddForm()}

                {cardSchedules.length === 0 ? (
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", fontFamily: "'Noto Sans JP',sans-serif", padding: "2px 2px 4px" }}>まだ練習日程がありません</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {cardSchedules.map((s, i) => renderScheduleCard(s, i))}
                  </div>
                )}
              </div>
            );
          })}

          {/* 練習カードを作る前に登録された既存の練習日程。カードが無いだけで消してはいない */}
          {(() => {
            const noCard = schedules.filter(s => !s.card_id);
            if (noCard.length === 0) return null;
            return (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>カード未設定</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {noCard.map((s, i) => renderScheduleCard(s, i))}
                </div>
              </div>
            );
          })()}
          </>
        )}
      </div>

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

      {/* 練習カードの削除確認モーダル */}
      {deleteCardTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 260, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setDeleteCardTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#141414", borderRadius: "12px", padding: "28px 24px", width: "100%", maxWidth: "320px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>🗑️</div>
            <div style={{ fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "20px", color: "#F0F0F0", marginBottom: "8px" }}>カードを削除</div>
            <div style={{ fontSize: "13px", color: "#F0F0F0", marginBottom: "24px", lineHeight: "1.6" }}>削除すると、このカードの中の練習日程もすべて消えます。元に戻せません。本当に削除しますか？</div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteCardTarget(null)} style={{ flex: 1, padding: "12px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "8px", background: "none", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#F0F0F0" }}>キャンセル</button>
              <button onClick={deleteCard} disabled={deletingCard} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", background: "#DC2626", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#FFFFFF", fontWeight: "bold" }}>{deletingCard ? "削除中..." : "削除する"}</button>
            </div>
          </div>
        </div>
      )}

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
