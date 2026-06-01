"use client";
import { useState } from "react";
import { Clock, MapPin, BookOpen } from "lucide-react";
import type { PrivateLesson } from "../lib/types";
import { GENRE_COLORS, formatDate, timeUntil, formatEndTime } from "../lib/constants";
import { GenreBadge } from "./GenreBadge";
import { ParticipantBar } from "./ParticipantBar";

const LEVEL_LABELS: Record<string, string> = {
  all: "全レベル",
  beginner: "初心者",
  intermediate: "中級者",
  advanced: "上級者",
};

export function PLCard({ lesson, onClick }: { lesson: PrivateLesson; onClick: () => void }) {
  const { date, time } = formatDate(lesson.starts_at);
  const until = timeUntil(lesson.starts_at);
  const [hover, setHover] = useState(false);
  const color = GENRE_COLORS[lesson.genres[0]] ?? "#2563EB";
  const isEnded = until === "終了";

  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: "#FFFFFF", border: `1px solid ${hover ? "rgba(37,99,235,0.3)" : "rgba(0,0,0,0.08)"}`, borderLeft: `3px solid ${isEnded ? "rgba(0,0,0,0.1)" : "#2563EB"}`, borderRadius: "8px", padding: "16px", cursor: "pointer", transition: "all 0.2s ease", transform: hover ? "translateY(-1px)" : "none", position: "relative", overflow: "hidden", boxShadow: hover ? "0 4px 16px rgba(37,99,235,0.12)" : "0 1px 4px rgba(0,0,0,0.04)", opacity: isEnded ? 0.55 : 1 }}>
      {/* PLバッジ */}
      <div style={{ position: "absolute", top: 0, left: 0, background: "#2563EB", padding: "3px 10px", fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "#fff", fontWeight: "bold", borderBottomRightRadius: "4px" }}>📚 PL</div>
      {isEnded && <div style={{ position: "absolute", top: 0, right: 0, background: "rgba(0,0,0,0.1)", padding: "3px 10px", fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.45)", fontWeight: "bold", borderBottomLeftRadius: "4px" }}>終了</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", marginTop: "14px" }}>
        <div style={{ flex: 1, paddingRight: "44px" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111111", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "0.05em", lineHeight: 1.2 }}>{lesson.title}</h3>
          <div style={{ fontSize: "10px", color: "rgba(0,0,0,0.4)", marginTop: "2px", fontFamily: "'Space Mono',monospace" }}>by {lesson.organizer.dancer_name}</div>
        </div>
        <div style={{ width: "36px", height: "36px", borderRadius: "4px", background: `linear-gradient(135deg,${color}22,${color}44)`, border: `1px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "bold", color, fontFamily: "'Bebas Neue',sans-serif", flexShrink: 0, overflow: "hidden" }}>
          {lesson.organizer.avatar_url
            ? <img src={lesson.organizer.avatar_url} alt={lesson.organizer.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : lesson.organizer.avatar}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Clock size={11} color="rgba(0,0,0,0.35)" />
          <span style={{ fontSize: "11px", color: "rgba(0,0,0,0.6)", fontFamily: "'Space Mono',monospace" }}>{date} {time}{lesson.ends_at ? `〜${formatEndTime(lesson.starts_at, lesson.ends_at)}` : ""}</span>
          <span style={{ fontSize: "9px", padding: "1px 6px", background: isEnded ? "rgba(0,0,0,0.06)" : "rgba(37,99,235,0.08)", borderRadius: "3px", color: isEnded ? "rgba(0,0,0,0.4)" : "#2563EB", fontFamily: "'Space Mono',monospace", fontWeight: "bold" }}>{until}</span>
        </div>
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lesson.location)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: "6px", textDecoration: "none" }}>
          <MapPin size={11} color="rgba(0,0,0,0.35)" />
          <span style={{ fontSize: "11px", color: "rgba(0,0,0,0.6)", fontFamily: "'Space Mono',monospace", textDecoration: "underline dotted", textUnderlineOffset: "2px" }}>{lesson.location}</span>
        </a>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" }}>
        {lesson.genres.map(g => <GenreBadge key={g} genre={g} />)}
        <span style={{ fontSize: "9px", padding: "2px 7px", background: "rgba(37,99,235,0.08)", borderRadius: "4px", color: "#2563EB", fontFamily: "'Space Mono',monospace", display: "flex", alignItems: "center", gap: "3px" }}>
          <BookOpen size={9} /> {LEVEL_LABELS[lesson.target_level] ?? "全レベル"}
        </span>
        {lesson.price != null && (
          <span style={{ fontSize: "9px", padding: "2px 7px", background: "rgba(0,0,0,0.05)", borderRadius: "4px", color: "rgba(0,0,0,0.55)", fontFamily: "'Space Mono',monospace" }}>
            ¥{lesson.price.toLocaleString()}
          </span>
        )}
      </div>

      <ParticipantBar count={lesson.participant_count} max={lesson.max_members} />
    </div>
  );
}
