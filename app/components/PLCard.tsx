"use client";
import { useState } from "react";
import { Clock, MapPin, BookOpen } from "lucide-react";
import type { PrivateLesson } from "../lib/types";
import { GENRE_COLORS, genreLabel, formatDate, dateBadgeParts, timeUntil, formatEndTime, splitLocation } from "../lib/constants";

const LEVEL_LABELS: Record<string, string> = {
  all: "全レベル",
  beginner: "初心者",
  intermediate: "中級者",
  advanced: "上級者",
};

export function PLCard({ lesson, onClick, index = 0 }: { lesson: PrivateLesson; onClick: () => void; index?: number }) {
  const { time } = formatDate(lesson.starts_at);
  const { month, day, weekday } = dateBadgeParts(lesson.starts_at);
  const { station, venue } = splitLocation(lesson.location);
  const until = timeUntil(lesson.starts_at);
  const [hover, setHover] = useState(false);
  // イベントもこのカードを使い回す。青(レッスン)と紫(イベント)だけ切り替える
  const accent = lesson.kind === "event" ? "#EAB308" : "#2563EB";
  const color = GENRE_COLORS[lesson.genres[0]] ?? accent;
  const isEnded = until === "終了";

  // 登場アニメは外側、ホバーの動きは内側（CypherCardと同じ理由）
  return (
    <div style={{ animation: `bdCardFloatIn 0.45s ease-out ${Math.min(index * 60, 400)}ms both` }}>
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      // タッチ端末はホバーできないので、PCのホバー時と同じ色付き影を@media(hover:none)で常時出す
      className="bd-glow-card-blue"
      style={{ background: "#141414", border: `1px solid ${hover ? accent + "4D" : "rgba(255,255,255,0.1)"}`, borderRadius: "10px", padding: "8px 16px", cursor: "pointer", transition: "transform 0.25s ease, box-shadow 0.25s ease", transform: hover ? "translateY(-3px)" : "none", position: "relative", overflow: "hidden", boxShadow: hover ? "0 6px 12px rgba(0,0,0,0.3), 0 18px 36px " + accent + "2E" : "0 2px 4px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.2)", opacity: isEnded ? 0.55 : 1 }}>
      {isEnded && <div style={{ position: "absolute", top: 0, right: 0, background: "rgba(255,255,255,0.12)", padding: "3px 10px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", fontWeight: "bold", borderBottomLeftRadius: "4px" }}>終了</div>}

      {lesson.genres[0] && (() => {
        // 背景に敷くジャンル名（CypherCardと同じ作り）
        const label = genreLabel(lesson.genres[0]).toUpperCase();
        return (
          <div aria-hidden="true" style={{ position: "absolute", right: "14px", bottom: "-8px", fontSize: `${Math.min(68, Math.round(360 / label.length))}px`, fontStyle: "italic", fontWeight: 900, fontFamily: "'Playfair Display','Noto Sans JP',sans-serif", letterSpacing: "-0.02em", lineHeight: 1, whiteSpace: "nowrap", color: color + "40", pointerEvents: "none", userSelect: "none" }}>
            {label}
          </div>
        );
      })()}
      {/* 開催日時はチケットの半券風にカード左端へ張り付ける（CypherCardと同じ）。
          背景色はカード本体と同じにして馴染ませ、区切り線だけで境目を示す */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "44px", display: "flex", flexDirection: "column", background: "#141414", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 900, color: isEnded ? "rgba(255,255,255,0.4)" : "#F0F0F0" }}>{month}</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: 900, fontFamily: "'Noto Sans JP',sans-serif", color: isEnded ? "rgba(255,255,255,0.4)" : "#F0F0F0", lineHeight: 1 }}>{day}</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: 900, fontFamily: "'Noto Sans JP',sans-serif", color: isEnded ? "rgba(255,255,255,0.4)" : "#F0F0F0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>{weekday}</div>
      </div>
      {/* 中身は背景文字より上に置く。日付バッジぶん（44px - カード左paddingの16px = 28px）に加えて、間隔を空けるため12px余分に取る */}
      <div style={{ position: "relative", marginLeft: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0px" }}>
        <div style={{ flex: 1, paddingRight: "52px" }}>
          {/* 開催日そのものは左の日付バッジに出す（CypherCardと同じ） */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 700, color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.05em", lineHeight: 1.2 }}>{lesson.title}</h3>
          </div>
          <div style={{ fontSize: "12px", color: "#F0F0F0", marginTop: "2px", fontFamily: "'Noto Sans JP',sans-serif", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            {/* Instagramを設定している主催者は名前ではなくアカウント名を出す */}
            {lesson.organizer.instagram
              ? <span>by <span style={{ color: "#A855F7" }}>@{lesson.organizer.instagram}</span></span>
              : <span>by {lesson.organizer.dancer_name}</span>}
          </div>
        </div>
        {/* 参加人数は講師アイコンの真下（CypherCardと同じ）。料金・対象レベルもこの列にまとめて出す */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", flexShrink: 0 }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: `linear-gradient(135deg,${color}22,${color}44)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: "bold", color, fontFamily: "'Noto Sans JP',sans-serif", overflow: "hidden" }}>
            {lesson.organizer.avatar_url
              ? <img src={lesson.organizer.avatar_url} alt={lesson.organizer.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : lesson.organizer.avatar}
          </div>
          <span style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", color: isEnded ? "rgba(255,255,255,0.4)" : "#F0F0F0", whiteSpace: "nowrap" }}>
            {lesson.participant_count}{lesson.max_members ? `/${lesson.max_members}` : ""}人
          </span>
          {/* 料金は参加人数表記のすぐ下に出す */}
          {lesson.price != null && (
            <span style={{ fontSize: "9px", padding: "2px 7px", background: "rgba(255,255,255,0.08)", borderRadius: "4px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", whiteSpace: "nowrap" }}>
              ¥{lesson.price.toLocaleString()}
            </span>
          )}
          {/* 対象レベルは料金のすぐ下に出す */}
          {lesson.kind !== "event" && (
            <span style={{ fontSize: "9px", padding: "2px 7px", background: accent + "14", borderRadius: "4px", color: accent, fontFamily: "'Noto Sans JP',sans-serif", display: "flex", alignItems: "center", gap: "3px", whiteSpace: "nowrap" }}>
              <BookOpen size={9} /> {LEVEL_LABELS[lesson.target_level] ?? "全レベル"}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Clock size={11} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: "11px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>{time}{lesson.ends_at ? `〜${formatEndTime(lesson.starts_at, lesson.ends_at)}` : ""}</span>
        </div>
        {/* カード上では地図リンクにしない（CypherCardと同じ理由） */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <MapPin size={11} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: "11px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>
            {venue || (station && `${station}駅`)}
            {venue && station && ` ${station}駅`}
          </span>
        </div>
      </div>
      </div>
    </div>
    </div>
  );
}
