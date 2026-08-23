"use client";
import { useState, useEffect } from "react";
import { Clock, MapPin, User, X, Check, BookOpen, Share2 } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { PrivateLesson, ParticipantProfile } from "../lib/types";
import { formatDate, timeUntil, formatEndTime, timeAgo, splitLocation } from "../lib/constants";
import { useComments } from "../lib/useComments";
import { GenreBadge } from "./GenreBadge";
import { ParticipantBar } from "./ParticipantBar";
import { showToast } from "./Toast";

const LEVEL_LABELS: Record<string, string> = {
  all: "全レベル対象",
  beginner: "初心者向け",
  intermediate: "中級者向け",
  advanced: "上級者向け",
};

export function PLDetailModal({ lesson, onClose, joined, pending, onJoin, onViewProfile, user, keepOpenOnJoin }: {
  lesson: PrivateLesson | null;
  onClose: () => void;
  joined: boolean;
  pending?: boolean;
  onJoin: (id: string) => void;
  onViewProfile: (id: string) => void;
  user: SupabaseUser | null; // 未ログイン閲覧（/l/[id] 共有ページ）でも表示できる
  keepOpenOnJoin?: boolean; // /l/[id] では参加後も閉じない（onCloseがページ遷移のため）
}) {
  const [participants, setParticipants] = useState<ParticipantProfile[]>([]);
  const [participantsFetched, setParticipantsFetched] = useState(false);
  const lessonId = lesson?.id;
  // コメントの取得・投稿はサイファー側と同じ処理を使う（commentsテーブル共通）
  const { comments, commentText, setCommentText, posting, postComment } = useComments({ lessonId: lessonId ?? "" }, user);

  useEffect(() => {
    if (!lessonId) return;
    async function fetchParticipants() {
      const { data } = await supabase
        .from("pl_participations")
        .select("profile_id, profiles:profile_id ( dancer_name, avatar_url )")
        .eq("lesson_id", lessonId)
        .eq("status", "approved");
      if (data) {
        setParticipants(data.map((row: any) => ({
          profile_id: row.profile_id,
          dancer_name: row.profiles?.dancer_name ?? "UNKNOWN",
          avatar_url: row.profiles?.avatar_url ?? null,
          genres: [], instagram: null, dance_years: null, age_group: null, gender: null,
        })));
        setParticipantsFetched(true);
      }
    }
    fetchParticipants();
  }, [lessonId, joined]);

  if (!lesson) return null;

  const { date, time } = formatDate(lesson.starts_at);
  const { station, venue } = splitLocation(lesson.location);
  const isEnded = timeUntil(lesson.starts_at) === "終了";
  const isOwn = lesson.organizer.id === user?.id;
  // イベントもこのモーダルを使い回す。色と呼び方だけ切り替える
  const isEvent = lesson.kind === "event";
  const accent = isEvent ? "#EAB308" : "#2563EB";
  // EVENTの黄色は白文字だと読みにくいので、accentを背景に敷く箇所だけ文字色を切り替える
  const onAccent = isEvent ? "#171717" : "#fff";
  const noun = isEvent ? "イベント" : "レッスン";

  const isFull = !joined && !pending && lesson.max_members !== null && participantsFetched && participants.length >= lesson.max_members;

  // /l/[id] の共有リンクを配る（対応端末はOSの共有シート、なければコピー）
  const handleShare = async () => {
    const url = `${window.location.origin}/l/${lesson.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${lesson.title} | 爆踊`, url }); } catch { /* ユーザーが共有をやめた */ }
    } else {
      await navigator.clipboard.writeText(url);
      showToast("リンクをコピーしました");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      {/* ホーム画面のカードと同じメタリックな質感にそろえる */}
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", margin: "0 auto", background: "linear-gradient(150deg, #2c2c2c 0%, #1a1a1a 25%, #242424 48%, #161616 70%, #282828 100%)", border: "1px solid rgba(255,255,255,0.14)", borderBottom: "none", borderRadius: "12px 12px 0 0", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 -4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)" }}>
        <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: accent, borderRadius: "4px", padding: "2px 8px", marginBottom: "6px" }}>
              <span style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: onAccent, fontWeight: "bold" }}>{isEvent ? "EVENT" : "PRIVATE LESSON"}</span>
            </div>
            <h2 style={{ margin: 0, fontSize: "24px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", lineHeight: 1.1 }}>{lesson.title}</h2>
          </div>
          <div style={{ display: "flex", flexShrink: 0, marginLeft: "12px" }}>
            <button onClick={handleShare} title="共有" style={{ background: "none", border: "none", color: "#F0F0F0", cursor: "pointer", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Share2 size={19} /></button>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#F0F0F0", cursor: "pointer", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><X size={22} /></button>
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: "8px 20px 0", flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
            {lesson.genres.map(g => <GenreBadge key={g} genre={g} size="md" />)}
            {!isEvent && (
              <span style={{ fontSize: "10px", padding: "3px 9px", background: accent + "14", borderRadius: "4px", color: accent, fontFamily: "'Noto Sans JP',sans-serif", display: "flex", alignItems: "center", gap: "4px" }}>
                <BookOpen size={10} /> {LEVEL_LABELS[lesson.target_level] ?? "全レベル対象"}
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", alignItems: "center" }}>
              <Clock size={14} color="rgba(255,255,255,0.45)" /> {date} {time}{lesson.ends_at ? `〜${formatEndTime(lesson.starts_at, lesson.ends_at)}` : ""}
            </div>
            {/* 地図へ飛べるのはここだけ。押せる場所だと分かるよう枠で囲う（DetailModalと同じ） */}
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lesson.location)}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", alignItems: "center", textDecoration: "none", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "8px", padding: "10px 12px", minHeight: "44px", background: "#1A1A1A" }}>
              <MapPin size={14} color="rgba(255,255,255,0.45)" />
              <span style={{ flex: 1 }}>
                {venue || (station && `${station}駅`)}
                {venue && station && ` ${station}駅`}
              </span>
              <span style={{ fontSize: "11px", color: accent, fontWeight: 700, flexShrink: 0 }}>地図を開く →</span>
            </a>
            <button onClick={() => onViewProfile(lesson.organizer.id)} style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", textDecoration: "underline dotted", textUnderlineOffset: "3px" }}>
              <User size={14} color="rgba(255,255,255,0.45)" /> {isEvent ? "主催" : "講師"}: {lesson.organizer.dancer_name}
            </button>
            {lesson.price != null && (
              <div style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", alignItems: "center" }}>
                ¥{lesson.price.toLocaleString()}
              </div>
            )}
          </div>

          {lesson.description && <p style={{ fontSize: "13px", color: "#F0F0F0", lineHeight: 1.7, marginBottom: "20px", fontFamily: "'Noto Sans JP',sans-serif" }}>{lesson.description}</p>}

          <ParticipantBar count={participantsFetched ? participants.length : lesson.participant_count} max={lesson.max_members} />

          {participants.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em", marginBottom: "8px" }}>参加者</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {participants.map(p => (
                  <button key={p.profile_id} onClick={() => onViewProfile(p.profile_id)}
                    style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", flexShrink: 0 }}
                    title={p.dancer_name}>
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt={p.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : p.dancer_name[0]?.toUpperCase() ?? "?"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isOwn && (
            isEnded ? (
              <div style={{ marginTop: "20px", padding: "14px", background: "rgba(255,255,255,0.06)", borderRadius: "6px", textAlign: "center", fontSize: "13px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>
                この{noun}は終了しました
              </div>
            ) : isFull ? (
              <div style={{ marginTop: "20px", padding: "14px", background: accent + "18", border: "1px solid " + accent + "40", borderRadius: "6px", textAlign: "center", fontSize: "13px", color: accent, fontFamily: "'Noto Sans JP',sans-serif" }}>
                定員に達しています（{participants.length}/{lesson.max_members}人）
              </div>
            ) : (
              <button onClick={() => { onJoin(lesson.id); if (!joined && !pending && !keepOpenOnJoin) onClose(); }}
                style={{ marginTop: "20px", width: "100%", padding: "14px", border: "none", borderRadius: "6px", background: joined ? "rgba(22,163,74,0.12)" : pending ? "rgba(255,255,255,0.08)" : accent, color: joined ? "#16A34A" : pending ? "rgba(255,255,255,0.5)" : onAccent, fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.15em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {joined ? <><Check size={16} /> 申込済み — キャンセルする</> : pending ? <>申請中... — キャンセルする</> : lesson.requires_approval ? <>📋 {isEvent ? "参加" : "受講"}を申請する</> : <><BookOpen size={16} /> この{noun}に申し込む</>}
              </button>
            )
          )}
          <div style={{ marginTop: "28px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>
            <div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em", marginBottom: "14px" }}>コメント{comments.length > 0 ? ` (${comments.length})` : ""}</div>
            {comments.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", marginBottom: "16px" }}>まだコメントはありません</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "16px" }}>
                {comments.map(c => (
                  <div key={c.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <button onClick={() => c.profile.id && onViewProfile(c.profile.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
                      <div style={{ width: "30px", height: "30px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>
                        {c.profile.avatar_url
                          ? <img src={c.profile.avatar_url} alt={c.profile.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : c.profile.dancer_name[0]?.toUpperCase() ?? "?"}
                      </div>
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "3px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "bold", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>{c.profile.dancer_name}</span>
                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans JP',sans-serif" }}>{timeAgo(c.created_at)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "13px", color: "#F0F0F0", lineHeight: 1.5 }}>{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ height: "32px" }} />
        </div>

        {/* 入力欄はDetailModalと同じく下に固定 */}
        <div style={{ padding: "12px 16px 24px", borderTop: "1px solid rgba(255,255,255,0.1)", background: "#141414", display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <textarea
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }}
            placeholder="コメントを入力..."
            rows={1}
            maxLength={200}
            style={{ flex: 1, resize: "none", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "20px", padding: "10px 14px", fontSize: "13px", fontFamily: "inherit", color: "#F0F0F0", background: "#1A1A1A", outline: "none", lineHeight: 1.5 }}
          />
          <button
            onClick={postComment}
            disabled={!commentText.trim() || posting}
            style={{ width: "38px", height: "38px", borderRadius: "50%", background: commentText.trim() ? accent : "rgba(255,255,255,0.12)", border: "none", cursor: commentText.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={commentText.trim() ? onAccent : "#fff"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
