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
export function PLCard({ lesson, onClick, index = 0, light }: { lesson: PrivateLesson; onClick: () => void; index?: number; light?: boolean }) {
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
  // 白テーマ用の色トークン。写真が無い時の背景と、写真の上に敷く「文字を読ませるためのシェード」を
  // 白ベースに切り替え、文字色も暗色にする（ポスター調自体は保つ）
  const T = light ? {
    border: "rgba(0,0,0,0.14)",
    noImageBg: `linear-gradient(160deg, ${accent}33 0%, #f2f2f2 62%, #ffffff 100%)`,
    shade: "linear-gradient(0deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.72) 38%, rgba(255,255,255,0.12) 68%, transparent 100%)",
    endedBg: "rgba(0,0,0,0.1)",
    text: "#181818",
    textSub: "rgba(0,0,0,0.65)",
    iconDim: "rgba(0,0,0,0.5)",
    metaText: "rgba(0,0,0,0.75)",
    chipBg: "rgba(0,0,0,0.08)",
    chipText: "#181818",
    topHighlight: "rgba(255,255,255,0.9)",
  } : {
    border: "rgba(255,255,255,0.16)",
    noImageBg: `linear-gradient(160deg, ${accent}59 0%, #1c1c1c 62%, #101010 100%)`,
    shade: "linear-gradient(0deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.62) 38%, rgba(0,0,0,0.08) 68%, transparent 100%)",
    endedBg: "rgba(255,255,255,0.14)",
    text: "#fff",
    textSub: "rgba(255,255,255,0.7)",
    iconDim: "rgba(255,255,255,0.55)",
    metaText: "rgba(255,255,255,0.85)",
    chipBg: "rgba(255,255,255,0.14)",
    chipText: "#fff",
    topHighlight: "rgba(255,255,255,0.08)",
  };

  // 登場アニメ・常時のゆらぎ浮遊は外側の2層、ホバーの動きは内側（CypherCardと同じ理由）
  return (
    <div style={{ animation: `bdCardFloatIn 0.45s ease-out ${Math.min(index * 60, 400)}ms both` }}>
    <div style={{ animation: `bdCardFloat ${4 + (index % 3) * 0.6}s ease-in-out infinite`, animationDelay: `-${(index % 5) * 0.8}s` }}>
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onPointerLeave={() => setPressed(false)} onPointerCancel={() => setPressed(false)}
      // タッチ端末はホバーできないので、PCのホバー時と同じ色付き影を@media(hover:none)で常時出す
      className="bd-glow-card-blue"
      style={{ position: "relative", aspectRatio: "3 / 4", borderRadius: "10px", overflow: "hidden", cursor: "pointer", border: `1px solid ${hover ? accent + "66" : T.border}`, transition: `transform ${pressed ? "0.12s" : "0.25s"} ease, box-shadow 0.25s ease`, transform: cardTransform, boxShadow: (hover ? "0 6px 14px rgba(0,0,0,0.4), 0 14px 28px " + accent + "33, " : "0 3px 7px rgba(0,0,0,0.35), 0 8px 18px rgba(0,0,0,0.25), ") + `inset 0 1px 0 ${T.topHighlight}`, opacity: isEnded ? 0.6 : 1 }}>
      {/* 背景：画像を添付していればそれを表紙に、無ければ種別カラーのグラデーションでポスター風に見せる */}
      {lesson.image_url ? (
        <img src={lesson.image_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: T.noImageBg }} />
      )}
      {/* 下から沈める。ここに乗る文字を読ませるためのシェード（白テーマは白ベースにする） */}
      <div style={{ position: "absolute", inset: 0, background: T.shade }} />

      {isEnded && <div style={{ position: "absolute", top: 0, right: 0, background: T.endedBg, padding: "2px 7px", fontSize: "7.5px", fontFamily: "'Noto Sans JP',sans-serif", color: T.text, fontWeight: "bold", borderBottomLeftRadius: "5px" }}>終了</div>}

      {/* コンテンツは上から下まで満たすフライヤー組み。ジャンルタグは上、タイトルはmarginTop:autoで
          下寄せの大きな斜体文字にする（写真の有無に関わらず、これだけで様になるようにする） */}
      <div style={{ position: "absolute", inset: 0, padding: "10px", display: "flex", flexDirection: "column" }}>
        {/* タブ自体がLESSON/EVENTを表しているので、カード上に種別バッジは出さない。ジャンルだけ出す */}
        {lesson.genres[0] && (
          <span style={{ alignSelf: "flex-start", fontSize: "8px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", padding: "2px 6px", borderRadius: "3px", background: genreColor + "26", color: genreColor }}>
            {genreLabel(lesson.genres[0])}
          </span>
        )}

        <h3 style={{ margin: "auto 0 0", fontSize: "18px", fontWeight: 900, fontStyle: "italic", color: T.text, fontFamily: "'Playfair Display','Noto Sans JP',sans-serif", letterSpacing: "-0.01em", lineHeight: 0.98, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lesson.title}</h3>
        <div style={{ fontSize: "8.5px", color: T.textSub, marginTop: "4px", fontFamily: "'Noto Sans JP',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lesson.organizer.instagram
            ? <span>by <span style={{ color: "#38BDF8" }}>@{lesson.organizer.instagram}</span></span>
            : <span>by {lesson.organizer.dancer_name}</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Clock size={8} color={T.iconDim} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "9px", color: T.metaText, fontFamily: "'Noto Sans JP',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{date} {time}{lesson.ends_at ? `〜${formatEndTime(lesson.starts_at, lesson.ends_at)}` : ""}</span>
          </div>
          {/* カード上では地図リンクにしない（CypherCardと同じ理由） */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <MapPin size={8} color={T.iconDim} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "9px", color: T.metaText, fontFamily: "'Noto Sans JP',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {venue || (station && `${station}駅`)}
              {venue && station && ` ${station}駅`}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px", gap: "4px" }}>
          <div style={{ display: "flex", gap: "3px", flexWrap: "wrap", minWidth: 0 }}>
            {lesson.price != null && (
              <span style={{ fontSize: "8.5px", padding: "2px 5px", background: T.chipBg, borderRadius: "3px", color: T.chipText, fontFamily: "'Noto Sans JP',sans-serif", whiteSpace: "nowrap" }}>
                ¥{lesson.price.toLocaleString()}
              </span>
            )}
            {lesson.kind !== "event" && (
              <span style={{ fontSize: "8.5px", padding: "2px 5px", background: accent + "26", borderRadius: "3px", color: T.chipText, fontFamily: "'Noto Sans JP',sans-serif", display: "flex", alignItems: "center", gap: "2px", whiteSpace: "nowrap" }}>
                <BookOpen size={8} /> {LEVEL_LABELS[lesson.target_level] ?? "全レベル"}
              </span>
            )}
          </div>
          <span style={{ fontSize: "9.5px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", color: T.text, whiteSpace: "nowrap", flexShrink: 0 }}>
            {lesson.participant_count}{lesson.max_members ? `/${lesson.max_members}` : ""}人
          </span>
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}
