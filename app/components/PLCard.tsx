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

export function PLCard({ lesson, onClick, index = 0 }: { lesson: PrivateLesson; onClick: () => void; index?: number }) {
  const { date, time } = formatDate(lesson.starts_at);
  const until = timeUntil(lesson.starts_at);
  const [hover, setHover] = useState(false);
  const color = GENRE_COLORS[lesson.genres[0]] ?? "#2563EB";
  const isEnded = until === "終了";

  // 登場アニメは外側、ホバーの動きは内側（CypherCardと同じ理由）
  return (
    <div style={{ animation: `bdCardFloatIn 0.45s ease-out ${Math.min(index * 60, 400)}ms both` }}>
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      // タッチ端末はホバーできないので、PCのホバー時と同じ色付き影を@media(hover:none)で常時出す
      className="bd-glow-card-blue"
      style={{ background: "#FFFFFF", border: `1px solid ${hover ? "rgba(37,99,235,0.3)" : "rgba(0,0,0,0.08)"}`, borderLeft: `4px solid ${isEnded ? "rgba(0,0,0,0.1)" : "#2563EB"}`, borderRadius: "10px", padding: "14px 18px", cursor: "pointer", transition: "transform 0.25s ease, box-shadow 0.25s ease", transform: hover ? "translateY(-3px)" : "none", position: "relative", overflow: "hidden", boxShadow: hover ? "0 6px 12px rgba(0,0,0,0.05), 0 18px 36px rgba(37,99,235,0.18)" : "0 2px 4px rgba(0,0,0,0.04), 0 8px 20px rgba(0,0,0,0.06)", opacity: isEnded ? 0.55 : 1 }}>
      {isEnded && <div style={{ position: "absolute", top: 0, right: 0, background: "rgba(0,0,0,0.1)", padding: "3px 10px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111111", fontWeight: "bold", borderBottomLeftRadius: "4px" }}>終了</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div style={{ flex: 1, paddingRight: "52px" }}>
          <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 700, color: "#111111", fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.05em", lineHeight: 1.2 }}>{lesson.title}</h3>
          <div style={{ fontSize: "12px", color: "#111111", marginTop: "3px", fontFamily: "'Noto Sans JP',sans-serif", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span>by {lesson.organizer.dancer_name}</span>
            {lesson.organizer.instagram && (
              <span style={{ color: "#A855F7" }}>@{lesson.organizer.instagram}</span>
            )}
          </div>
        </div>
        <div style={{ width: "44px", height: "44px", borderRadius: "6px", background: `linear-gradient(135deg,${color}22,${color}44)`, border: `1px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: "bold", color, fontFamily: "'Noto Sans JP',sans-serif", flexShrink: 0, overflow: "hidden" }}>
          {lesson.organizer.avatar_url
            ? <img src={lesson.organizer.avatar_url} alt={lesson.organizer.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : lesson.organizer.avatar}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Clock size={11} color="rgba(0,0,0,0.35)" />
          <span style={{ fontSize: "11px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif" }}>{date} {time}{lesson.ends_at ? `〜${formatEndTime(lesson.starts_at, lesson.ends_at)}` : ""}</span>
          <span style={{ fontSize: "9px", padding: "1px 6px", background: isEnded ? "rgba(0,0,0,0.06)" : "rgba(37,99,235,0.08)", borderRadius: "3px", color: isEnded ? "rgba(0,0,0,0.4)" : "#2563EB", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold" }}>{until}</span>
        </div>
        {/* カード上では地図リンクにしない（CypherCardと同じ理由） */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <MapPin size={11} color="rgba(0,0,0,0.35)" />
          <span style={{ fontSize: "11px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif" }}>{lesson.location}</span>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "8px" }}>
        {lesson.genres.map(g => <GenreBadge key={g} genre={g} />)}
        <span style={{ fontSize: "9px", padding: "2px 7px", background: "rgba(37,99,235,0.08)", borderRadius: "4px", color: "#2563EB", fontFamily: "'Noto Sans JP',sans-serif", display: "flex", alignItems: "center", gap: "3px" }}>
          <BookOpen size={9} /> {LEVEL_LABELS[lesson.target_level] ?? "全レベル"}
        </span>
        {lesson.price != null && (
          <span style={{ fontSize: "9px", padding: "2px 7px", background: "rgba(0,0,0,0.05)", borderRadius: "4px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif" }}>
            ¥{lesson.price.toLocaleString()}
          </span>
        )}
      </div>

      <ParticipantBar count={lesson.participant_count} max={lesson.max_members} />
    </div>
    </div>
  );
}
