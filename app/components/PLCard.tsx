"use client";
import { useState } from "react";
import { Clock, MapPin, BookOpen } from "lucide-react";
import type { PrivateLesson } from "../lib/types";
import { GENRE_COLORS, genreLabel, formatDate, timeUntil, formatEndTime, splitLocation } from "../lib/constants";

const LEVEL_LABELS: Record<string, string> = {
  all: "全レベル",
  beginner: "初心者",
  intermediate: "中級者",
  advanced: "上級者",
};

// LESSON・EVENTは「本番・観客あり」の枠なので、CypherCardと違って縦長のポスター表示にする。
// 画像を添付していればそれを、無ければ種別カラーのグラデーションを背景に敷く。
// 一覧は2列グリッドで並べる分カード自体が小さいので、中身の文字・余白も縮めてある
export function PLCard({ lesson, onClick, index = 0 }: { lesson: PrivateLesson; onClick: () => void; index?: number }) {
  const { date, time } = formatDate(lesson.starts_at);
  const { station, venue } = splitLocation(lesson.location);
  const until = timeUntil(lesson.starts_at);
  const [hover, setHover] = useState(false);
  // 押している間だけ、カードがわずかに傾く（指で押さえた物理カードのような質感）
  const [pressed, setPressed] = useState(false);
  // イベントもこのカードを使い回す。青(レッスン)と黄(イベント)だけ切り替える
  const accent = lesson.kind === "event" ? "#EAB308" : "#2563EB";
  const genreColor = GENRE_COLORS[lesson.genres[0]] ?? accent;
  const isEnded = until === "終了";
  const cardTransform = pressed
    ? "perspective(600px) rotateX(3deg) rotateY(-2deg) scale(0.98)"
    : hover ? "translateY(-3px)" : "none";

  // 登場アニメ・常時のゆらぎ浮遊は外側の2層、ホバーの動きは内側（CypherCardと同じ理由）
  return (
    <div style={{ animation: `bdCardFloatIn 0.45s ease-out ${Math.min(index * 60, 400)}ms both` }}>
    <div style={{ animation: `bdCardFloat ${4 + (index % 3) * 0.6}s ease-in-out infinite`, animationDelay: `-${(index % 5) * 0.8}s` }}>
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onPointerLeave={() => setPressed(false)} onPointerCancel={() => setPressed(false)}
      // タッチ端末はホバーできないので、PCのホバー時と同じ色付き影を@media(hover:none)で常時出す
      className="bd-glow-card-blue"
      style={{ position: "relative", aspectRatio: "3 / 4", borderRadius: "10px", overflow: "hidden", cursor: "pointer", border: `1px solid ${hover ? accent + "66" : "rgba(255,255,255,0.16)"}`, transition: `transform ${pressed ? "0.12s" : "0.25s"} ease, box-shadow 0.25s ease`, transform: cardTransform, boxShadow: (hover ? "0 6px 14px rgba(0,0,0,0.4), 0 14px 28px " + accent + "33, " : "0 3px 7px rgba(0,0,0,0.35), 0 8px 18px rgba(0,0,0,0.25), ") + "inset 0 1px 0 rgba(255,255,255,0.08)", opacity: isEnded ? 0.6 : 1 }}>
      {/* 背景：画像を添付していればそれを表紙に、無ければ種別カラーのグラデーションでポスター風に見せる */}
      {lesson.image_url ? (
        <img src={lesson.image_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg, ${accent}59 0%, #1c1c1c 62%, #101010 100%)` }} />
      )}
      {/* 下から黒く沈める。ここに乗る文字を読ませるためのシェード */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.62) 38%, rgba(0,0,0,0.08) 68%, transparent 100%)" }} />

      {isEnded && <div style={{ position: "absolute", top: 0, right: 0, background: "rgba(255,255,255,0.14)", padding: "2px 7px", fontSize: "7.5px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", fontWeight: "bold", borderBottomLeftRadius: "5px" }}>終了</div>}

      {/* コンテンツはすべて下部に重ねる */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "8px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", letterSpacing: "0.06em", padding: "2px 6px", borderRadius: "3px", background: accent, color: lesson.kind === "event" ? "#171717" : "#fff" }}>
            {lesson.kind === "event" ? "EVENT" : "PRIVATE"}
          </span>
          {lesson.genres[0] && (
            <span style={{ fontSize: "8px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", padding: "2px 6px", borderRadius: "3px", background: genreColor + "26", color: genreColor }}>
              {genreLabel(lesson.genres[0])}
            </span>
          )}
        </div>

        <h3 style={{ margin: 0, fontSize: "12.5px", fontWeight: 700, color: "#fff", fontFamily: "'Noto Sans JP',sans-serif", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{lesson.title}</h3>
        <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.7)", marginTop: "2px", fontFamily: "'Noto Sans JP',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lesson.organizer.instagram
            ? <span>by <span style={{ color: "#38BDF8" }}>@{lesson.organizer.instagram}</span></span>
            : <span>by {lesson.organizer.dancer_name}</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Clock size={8} color="rgba(255,255,255,0.55)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.85)", fontFamily: "'Noto Sans JP',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{date} {time}{lesson.ends_at ? `〜${formatEndTime(lesson.starts_at, lesson.ends_at)}` : ""}</span>
          </div>
          {/* カード上では地図リンクにしない（CypherCardと同じ理由） */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <MapPin size={8} color="rgba(255,255,255,0.55)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.85)", fontFamily: "'Noto Sans JP',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {venue || (station && `${station}駅`)}
              {venue && station && ` ${station}駅`}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px", gap: "4px" }}>
          <div style={{ display: "flex", gap: "3px", flexWrap: "wrap", minWidth: 0 }}>
            {lesson.price != null && (
              <span style={{ fontSize: "8.5px", padding: "2px 5px", background: "rgba(255,255,255,0.14)", borderRadius: "3px", color: "#fff", fontFamily: "'Noto Sans JP',sans-serif", whiteSpace: "nowrap" }}>
                ¥{lesson.price.toLocaleString()}
              </span>
            )}
            {lesson.kind !== "event" && (
              <span style={{ fontSize: "8.5px", padding: "2px 5px", background: accent + "26", borderRadius: "3px", color: "#fff", fontFamily: "'Noto Sans JP',sans-serif", display: "flex", alignItems: "center", gap: "2px", whiteSpace: "nowrap" }}>
                <BookOpen size={8} /> {LEVEL_LABELS[lesson.target_level] ?? "全レベル"}
              </span>
            )}
          </div>
          <span style={{ fontSize: "9.5px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", color: "#fff", whiteSpace: "nowrap", flexShrink: 0 }}>
            {lesson.participant_count}{lesson.max_members ? `/${lesson.max_members}` : ""}人
          </span>
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}
