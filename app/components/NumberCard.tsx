"use client";
import { useState } from "react";
import { Calendar, MapPin, Star } from "lucide-react";
import type { DanceNumber } from "../lib/types";
import { GENRE_COLORS, genreLabel, dateBadgeParts, timeUntil } from "../lib/constants";

// 本番当日（"YYYY-MM-DD"）を「9/10(木)」のように短く表示する
function formatJaDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`;
}

// CypherCardとほぼ同じ作り。時刻ではなく想定練習期間（日付の範囲）を持つ点が異なる
export function NumberCard({ number, onClick, index = 0 }: { number: DanceNumber; onClick: () => void; index?: number }) {
  const { month, day, weekday } = dateBadgeParts(number.starts_at);
  const endParts = number.ends_at ? dateBadgeParts(number.ends_at) : null;
  // 複数日にまたがる練習期間なので、「終了」判定は2日目（あれば）を基準にする
  const isEnded = timeUntil(number.ends_at ?? number.starts_at) === "終了";
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const color = GENRE_COLORS[number.genres[0]] ?? "#EC4899";
  const cardTransform = pressed
    ? "perspective(600px) rotateX(3deg) rotateY(-2deg) scale(0.98)"
    : hover ? "translateY(-3px)" : "none";
  return (
    <div style={{ animation: `bdCardFloatIn 0.45s ease-out ${Math.min(index * 60, 400)}ms both` }}>
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onPointerLeave={() => setPressed(false)} onPointerCancel={() => setPressed(false)}
      className="bd-glow-card"
      style={{ background: "linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.1) 46%, rgba(255,255,255,0.02) 58%, transparent 72%), linear-gradient(150deg, #2c2c2c 0%, #1a1a1a 25%, #242424 48%, #161616 70%, #282828 100%)", border: `1px solid ${number.hot && !isEnded ? "rgba(236,72,153,0.25)" : "rgba(255,255,255,0.14)"}`, borderRadius: "10px", padding: "14px 16px", cursor: "pointer", transition: `transform ${pressed ? "0.12s" : "0.25s"} ease, box-shadow 0.25s ease`, transform: cardTransform, position: "relative", overflow: "hidden", boxShadow: (hover ? `0 6px 12px rgba(0,0,0,0.3), 0 18px 36px ${color}26, ` : "0 2px 4px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.2), ") + "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.5)", opacity: isEnded ? 0.55 : 1, ["--bd-glow" as any]: `${color}26` } as React.CSSProperties}>
      {number.hot && !isEnded && <div style={{ position: "absolute", top: 0, right: 0, background: "#EC4899", padding: "3px 10px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#fff", fontWeight: "bold", borderBottomLeftRadius: "4px" }}>🔥 HOT</div>}
      {isEnded && <div style={{ position: "absolute", top: 0, right: 0, background: "rgba(255,255,255,0.12)", padding: "3px 10px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", fontWeight: "bold", borderBottomLeftRadius: "4px" }}>終了</div>}
      {number.genres[0] && (() => {
        const label = genreLabel(number.genres[0]).toUpperCase();
        return (
          <div aria-hidden="true" style={{ position: "absolute", right: "14px", bottom: "-8px", fontSize: `${Math.round(Math.min(68, Math.round(360 / label.length)) * 1.1)}px`, fontStyle: "italic", fontWeight: 900, fontFamily: "'Playfair Display','Noto Sans JP',sans-serif", letterSpacing: "-0.02em", lineHeight: 1, whiteSpace: "nowrap", color: color + "73", pointerEvents: "none", userSelect: "none" }}>
            {label}
          </div>
        );
      })()}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "44px", display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 900, color: isEnded ? "rgba(255,255,255,0.4)" : "#F0F0F0" }}>{month}</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: 900, fontFamily: "'Noto Sans JP',sans-serif", color: isEnded ? "rgba(255,255,255,0.4)" : "#F0F0F0", lineHeight: 1 }}>{day}</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: 900, fontFamily: "'Noto Sans JP',sans-serif", color: isEnded ? "rgba(255,255,255,0.4)" : "#F0F0F0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>{weekday}</div>
      </div>
      <div style={{ position: "relative", marginLeft: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0px" }}>
        <div style={{ flex: 1, paddingRight: "52px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 700, color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.05em", lineHeight: 1.2 }}>{number.title}</h3>
          </div>
          <div style={{ fontSize: "12px", color: "#F0F0F0", marginTop: "2px", fontFamily: "'Noto Sans JP',sans-serif", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            {number.organizer.instagram
              ? <span>by <span style={{ color: "#38BDF8" }}>@{number.organizer.instagram}</span></span>
              : <span>by {number.organizer.dancer_name}</span>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", flexShrink: 0 }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: `linear-gradient(135deg,${color}22,${color}44)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: "bold", color, fontFamily: "'Noto Sans JP',sans-serif", overflow: "hidden" }}>
            {number.organizer.avatar_url
              ? <img src={number.organizer.avatar_url} alt={number.organizer.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : number.organizer.avatar}
          </div>
          <span style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", color: isEnded ? "rgba(255,255,255,0.4)" : "#F0F0F0", whiteSpace: "nowrap" }}>
            {number.participant_count}{number.max_members ? `/${number.max_members}` : ""}人
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {endParts && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={11} color="rgba(255,255,255,0.4)" />
            <span style={{ fontSize: "11px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>〜{endParts.month}/{endParts.day}({endParts.weekday})</span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <MapPin size={11} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: "11px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>{number.location}</span>
        </div>
        {number.performance_dates.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Star size={11} color={color} />
            <span style={{ fontSize: "11px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>
              本番: {formatJaDate(number.performance_dates[0])}{number.performance_dates.length > 1 ? ` 他${number.performance_dates.length - 1}日` : ""}
            </span>
          </div>
        )}
      </div>
      </div>
    </div>
    </div>
  );
}
