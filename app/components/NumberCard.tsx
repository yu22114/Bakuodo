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

// NUMBERは「本番・観客あり」の枠なので、CypherCardと違って縦長のポスター表示にする。
// 画像を添付していればそれを、無ければジャンルカラーのグラデーションを背景に敷く
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
    : hover ? "translateY(-4px)" : "none";

  // 登場アニメ・常時のゆらぎ浮遊は外側の2層、ホバーの動きは内側（CypherCardと同じ理由）
  return (
    <div style={{ animation: `bdCardFloatIn 0.45s ease-out ${Math.min(index * 60, 400)}ms both` }}>
    <div style={{ animation: `bdCardFloat ${4 + (index % 3) * 0.6}s ease-in-out infinite`, animationDelay: `-${(index % 5) * 0.8}s` }}>
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onPointerLeave={() => setPressed(false)} onPointerCancel={() => setPressed(false)}
      className="bd-glow-card"
      style={{ position: "relative", aspectRatio: "3 / 4", borderRadius: "14px", overflow: "hidden", cursor: "pointer", border: `1px solid ${number.hot && !isEnded ? "rgba(236,72,153,0.4)" : hover ? "rgba(236,72,153,0.5)" : "rgba(255,255,255,0.16)"}`, transition: `transform ${pressed ? "0.12s" : "0.25s"} ease, box-shadow 0.25s ease`, transform: cardTransform, boxShadow: (hover ? `0 10px 22px rgba(0,0,0,0.4), 0 22px 46px ${color}33, ` : "0 4px 10px rgba(0,0,0,0.35), 0 12px 28px rgba(0,0,0,0.25), ") + "inset 0 1px 0 rgba(255,255,255,0.08)", opacity: isEnded ? 0.6 : 1, ["--bd-glow" as any]: `${color}33` } as React.CSSProperties}>
      {/* 背景：画像を添付していればそれを表紙に、無ければジャンルカラーのグラデーションでポスター風に見せる */}
      {number.image_url ? (
        <img src={number.image_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg, ${color}59 0%, #1c1c1c 62%, #101010 100%)` }} />
      )}
      {/* 下から黒く沈める。ここに乗る文字を読ませるためのシェード */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 34%, rgba(0,0,0,0.08) 64%, transparent 100%)" }} />

      {number.hot && !isEnded && <div style={{ position: "absolute", top: 0, right: 0, background: "#EC4899", padding: "4px 11px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#fff", fontWeight: "bold", borderBottomLeftRadius: "6px" }}>🔥 HOT</div>}
      {isEnded && <div style={{ position: "absolute", top: 0, right: 0, background: "rgba(255,255,255,0.14)", padding: "4px 11px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", fontWeight: "bold", borderBottomLeftRadius: "6px" }}>終了</div>}

      {/* コンテンツはすべて下部に重ねる */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "9px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", letterSpacing: "0.1em", padding: "3px 8px", borderRadius: "4px", background: "#EC4899", color: "#fff" }}>NUMBER</span>
          {number.genres[0] && (
            <span style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", padding: "3px 8px", borderRadius: "4px", background: color + "26", color }}>
              {genreLabel(number.genres[0])}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: `linear-gradient(135deg,${color}33,${color}55)`, border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "bold", color, fontFamily: "'Noto Sans JP',sans-serif", overflow: "hidden", flexShrink: 0 }}>
            {number.organizer.avatar_url
              ? <img src={number.organizer.avatar_url} alt={number.organizer.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : number.organizer.avatar}
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#fff", fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.03em", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{number.title}</h3>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)", marginTop: "1px", fontFamily: "'Noto Sans JP',sans-serif" }}>
              {number.organizer.instagram
                ? <span>by <span style={{ color: "#38BDF8" }}>@{number.organizer.instagram}</span></span>
                : <span>by {number.organizer.dancer_name}</span>}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "10px" }}>
          {/* 想定練習期間。開始日から表示し、終了日があれば「〜終了日」を続ける */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={11} color="rgba(255,255,255,0.55)" />
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.85)", fontFamily: "'Noto Sans JP',sans-serif" }}>
              {month}/{day}({weekday}){endParts ? `〜${endParts.month}/${endParts.day}(${endParts.weekday})` : ""}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <MapPin size={11} color="rgba(255,255,255,0.55)" />
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.85)", fontFamily: "'Noto Sans JP',sans-serif" }}>{number.location}</span>
          </div>
          {number.performance_dates.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Star size={11} color={color} />
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.85)", fontFamily: "'Noto Sans JP',sans-serif" }}>
                本番: {formatJaDate(number.performance_dates[0])}{number.performance_dates.length > 1 ? ` 他${number.performance_dates.length - 1}日` : ""}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "11px" }}>
          <span style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", color: "#fff", whiteSpace: "nowrap" }}>
            {number.participant_count}{number.max_members ? `/${number.max_members}` : ""}人
          </span>
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}
