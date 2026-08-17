"use client";
import { useState, useEffect } from "react";
import { Clock, MapPin, User, X, Check, BookOpen } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { PrivateLesson, ParticipantProfile } from "../lib/types";
import { formatDate, timeUntil, formatEndTime } from "../lib/constants";
import { GenreBadge } from "./GenreBadge";
import { ParticipantBar } from "./ParticipantBar";

const LEVEL_LABELS: Record<string, string> = {
  all: "全レベル対象",
  beginner: "初心者向け",
  intermediate: "中級者向け",
  advanced: "上級者向け",
};

export function PLDetailModal({ lesson, onClose, joined, pending, onJoin, onViewProfile, user }: {
  lesson: PrivateLesson | null;
  onClose: () => void;
  joined: boolean;
  pending?: boolean;
  onJoin: (id: string) => void;
  onViewProfile: (id: string) => void;
  user: SupabaseUser;
}) {
  const [participants, setParticipants] = useState<ParticipantProfile[]>([]);
  const [participantsFetched, setParticipantsFetched] = useState(false);
  const lessonId = lesson?.id;

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
  const isEnded = timeUntil(lesson.starts_at) === "終了";
  const isOwn = lesson.organizer.id === user.id;

  const isFull = !joined && !pending && lesson.max_members !== null && participantsFetched && participants.length >= lesson.max_members;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", margin: "0 auto", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderBottom: "none", borderRadius: "12px 12px 0 0", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 -4px 24px rgba(0,0,0,0.1)" }}>
        <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#2563EB", borderRadius: "4px", padding: "2px 8px", marginBottom: "6px" }}>
              <span style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#fff", fontWeight: "bold" }}>PRIVATE LESSON</span>
            </div>
            <h2 style={{ margin: 0, fontSize: "24px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#111111", lineHeight: 1.1 }}>{lesson.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#111111", cursor: "pointer", marginLeft: "12px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><X size={22} /></button>
        </div>

        <div style={{ overflowY: "auto", padding: "8px 20px 0", flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
            {lesson.genres.map(g => <GenreBadge key={g} genre={g} size="md" />)}
            <span style={{ fontSize: "10px", padding: "3px 9px", background: "rgba(37,99,235,0.08)", borderRadius: "4px", color: "#2563EB", fontFamily: "'Noto Sans JP',sans-serif", display: "flex", alignItems: "center", gap: "4px" }}>
              <BookOpen size={10} /> {LEVEL_LABELS[lesson.target_level] ?? "全レベル対象"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif", alignItems: "center" }}>
              <Clock size={14} color="rgba(0,0,0,0.4)" /> {date} {time}{lesson.ends_at ? `〜${formatEndTime(lesson.starts_at, lesson.ends_at)}` : ""}
            </div>
            {/* 地図へ飛べるのはここだけ。押せる場所だと分かるよう枠で囲う（DetailModalと同じ） */}
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lesson.location)}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif", alignItems: "center", textDecoration: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "8px", padding: "10px 12px", minHeight: "44px", background: "#FAFAFA" }}>
              <MapPin size={14} color="rgba(0,0,0,0.4)" />
              <span style={{ flex: 1 }}>{lesson.location}</span>
              <span style={{ fontSize: "11px", color: "#2563EB", fontWeight: 700, flexShrink: 0 }}>地図を開く →</span>
            </a>
            <button onClick={() => onViewProfile(lesson.organizer.id)} style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", textDecoration: "underline dotted", textUnderlineOffset: "3px" }}>
              <User size={14} color="rgba(0,0,0,0.4)" /> 講師: {lesson.organizer.dancer_name}
            </button>
            {lesson.price != null && (
              <div style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif", alignItems: "center" }}>
                <span style={{ fontSize: "14px" }}>💴</span> ¥{lesson.price.toLocaleString()}
              </div>
            )}
          </div>

          {lesson.description && <p style={{ fontSize: "13px", color: "#111111", lineHeight: 1.7, marginBottom: "20px", fontFamily: "'Noto Sans JP',sans-serif" }}>{lesson.description}</p>}

          <ParticipantBar count={participantsFetched ? participants.length : lesson.participant_count} max={lesson.max_members} />

          {participants.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111111", letterSpacing: "0.15em", marginBottom: "8px" }}>PARTICIPANTS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {participants.map(p => (
                  <button key={p.profile_id} onClick={() => onViewProfile(p.profile_id)}
                    style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", background: "rgba(0,0,0,0.08)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#111111", flexShrink: 0 }}
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
              <div style={{ marginTop: "20px", padding: "14px", background: "rgba(0,0,0,0.04)", borderRadius: "6px", textAlign: "center", fontSize: "13px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif" }}>
                このレッスンは終了しました
              </div>
            ) : isFull ? (
              <div style={{ marginTop: "20px", padding: "14px", background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: "6px", textAlign: "center", fontSize: "13px", color: "#2563EB", fontFamily: "'Noto Sans JP',sans-serif" }}>
                定員に達しています（{participants.length}/{lesson.max_members}人）
              </div>
            ) : (
              <button onClick={() => { onJoin(lesson.id); if (!joined && !pending) onClose(); }}
                style={{ marginTop: "20px", width: "100%", padding: "14px", border: "none", borderRadius: "6px", background: joined ? "rgba(22,163,74,0.1)" : pending ? "rgba(0,0,0,0.06)" : "#2563EB", color: joined ? "#16A34A" : pending ? "rgba(0,0,0,0.45)" : "#fff", fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.15em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {joined ? <><Check size={16} /> 申込済み — キャンセルする</> : pending ? <>申請中... — キャンセルする</> : lesson.requires_approval ? <>📋 受講を申請する</> : <><BookOpen size={16} /> このレッスンを申し込む</>}
              </button>
            )
          )}
          <div style={{ height: "32px" }} />
        </div>
      </div>
    </div>
  );
}
