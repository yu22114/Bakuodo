"use client";
import { useState } from "react";
import { Calendar, MapPin, Star } from "lucide-react";
import type { DanceNumber } from "../lib/types";
import { GENRE_COLORS, genreLabel, dateBadgeParts, timeUntil, todayStr } from "../lib/constants";

// 本番当日（"YYYY-MM-DD"）を「9/10(木)」のように短く表示する
function formatJaDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`;
}

// NUMBERは「本番・観客あり」の枠なので、CypherCardと違って縦長のポスター表示にする。
// 画像を添付していればそれを、無ければジャンルカラーのグラデーションを背景に敷く。
// 一覧は2列グリッドで並べる分カード自体が小さいので、中身の文字・余白も縮めてある
export function NumberCard({ number, onClick, index = 0, light }: { number: DanceNumber; onClick: () => void; index?: number; light?: boolean }) {
  const { month, day, weekday } = dateBadgeParts(number.starts_at);
  const endParts = number.ends_at ? dateBadgeParts(number.ends_at) : null;
  // 複数日にまたがる練習期間なので、「終了」判定は2日目（あれば）を基準にする
  const isEnded = timeUntil(number.ends_at ?? number.starts_at) === "終了";
  // 募集期限：想定練習期間そのものの終了とは別に、参加受付だけ先に締め切れる
  const recruitmentClosed = !!number.recruitment_deadline && number.recruitment_deadline < todayStr();
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const color = GENRE_COLORS[number.genres[0]] ?? "#EC4899";
  const cardTransform = pressed
    ? "perspective(600px) rotateX(3deg) rotateY(-2deg) scale(0.98)"
    : hover ? "translateY(-3px)" : "none";
  // 白テーマ用の色トークン（PLCardと同じ考え方）
  const T = light ? {
    border: "rgba(0,0,0,0.14)",
    noImageBg: `linear-gradient(160deg, ${color}33 0%, #f2f2f2 62%, #ffffff 100%)`,
    shade: "linear-gradient(0deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.72) 38%, rgba(255,255,255,0.12) 68%, transparent 100%)",
    endedBg: "rgba(0,0,0,0.1)",
    text: "#181818",
    textSub: "rgba(0,0,0,0.65)",
    iconDim: "rgba(0,0,0,0.5)",
    metaText: "rgba(0,0,0,0.75)",
    topHighlight: "rgba(255,255,255,0.9)",
  } : {
    border: "rgba(255,255,255,0.16)",
    noImageBg: `linear-gradient(160deg, ${color}59 0%, #1c1c1c 62%, #101010 100%)`,
    shade: "linear-gradient(0deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.62) 38%, rgba(0,0,0,0.08) 68%, transparent 100%)",
    endedBg: "rgba(255,255,255,0.14)",
    text: "#fff",
    textSub: "rgba(255,255,255,0.7)",
    iconDim: "rgba(255,255,255,0.55)",
    metaText: "rgba(255,255,255,0.85)",
    topHighlight: "rgba(255,255,255,0.08)",
  };

  // 登場アニメ・常時のゆらぎ浮遊は外側の2層、ホバーの動きは内側（CypherCardと同じ理由）
  return (
    <div style={{ animation: `bdCardFloatIn 0.45s ease-out ${Math.min(index * 60, 400)}ms both` }}>
    <div style={{ animation: `bdCardFloat ${4 + (index % 3) * 0.6}s ease-in-out infinite`, animationDelay: `-${(index % 5) * 0.8}s` }}>
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onPointerLeave={() => setPressed(false)} onPointerCancel={() => setPressed(false)}
      className="bd-glow-card"
      style={{ position: "relative", aspectRatio: "3 / 4", borderRadius: "10px", overflow: "hidden", cursor: "pointer", border: `1px solid ${number.hot && !isEnded ? "rgba(236,72,153,0.4)" : hover ? "rgba(236,72,153,0.5)" : T.border}`, transition: `transform ${pressed ? "0.12s" : "0.25s"} ease, box-shadow 0.25s ease`, transform: cardTransform, boxShadow: (hover ? `0 6px 14px rgba(0,0,0,0.4), 0 14px 28px ${color}33, ` : "0 3px 7px rgba(0,0,0,0.35), 0 8px 18px rgba(0,0,0,0.25), ") + `inset 0 1px 0 ${T.topHighlight}`, opacity: isEnded ? 0.6 : 1, ["--bd-glow" as any]: `${color}33` } as React.CSSProperties}>
      {/* 背景：画像を添付していればそれを表紙に、無ければジャンルカラーのグラデーションでポスター風に見せる */}
      {number.image_url ? (
        <img src={number.image_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: T.noImageBg }} />
      )}
      {/* 下から沈める。ここに乗る文字を読ませるためのシェード（白テーマは白ベースにする） */}
      <div style={{ position: "absolute", inset: 0, background: T.shade }} />

      {number.hot && !isEnded && <div style={{ position: "absolute", top: 0, right: 0, background: "#EC4899", padding: "2px 7px", fontSize: "7.5px", fontFamily: "'Noto Sans JP',sans-serif", color: "#fff", fontWeight: "bold", borderBottomLeftRadius: "5px" }}>🔥 HOT</div>}
      {isEnded ? (
        <div style={{ position: "absolute", top: 0, right: 0, background: T.endedBg, padding: "2px 7px", fontSize: "7.5px", fontFamily: "'Noto Sans JP',sans-serif", color: T.text, fontWeight: "bold", borderBottomLeftRadius: "5px" }}>終了</div>
      ) : recruitmentClosed && (
        <div style={{ position: "absolute", top: 0, right: 0, background: "rgba(220,38,38,0.75)", padding: "2px 7px", fontSize: "7.5px", fontFamily: "'Noto Sans JP',sans-serif", color: "#fff", fontWeight: "bold", borderBottomLeftRadius: "5px" }}>募集終了</div>
      )}

      {/* コンテンツは上から下まで満たすフライヤー組み。ジャンルタグは上、タイトルはmarginTop:autoで
          下寄せの大きな斜体文字にする（写真の有無に関わらず、これだけで様になるようにする） */}
      <div style={{ position: "absolute", inset: 0, padding: "10px", display: "flex", flexDirection: "column" }}>
        {/* タブ自体がNUMBERを表しているので、カード上に種別バッジは出さない。ジャンルだけ出す */}
        {number.genres[0] && (
          <span style={{ alignSelf: "flex-start", fontSize: "8px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", padding: "2px 6px", borderRadius: "3px", background: color + "26", color }}>
            {genreLabel(number.genres[0])}
          </span>
        )}

        <h3 style={{ margin: "auto 0 0", fontSize: "18px", fontWeight: 900, fontStyle: "italic", color: T.text, fontFamily: "'Playfair Display','Noto Sans JP',sans-serif", letterSpacing: "-0.01em", lineHeight: 0.98, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{number.title}</h3>
        <div style={{ fontSize: "8.5px", color: T.textSub, marginTop: "4px", fontFamily: "'Noto Sans JP',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {number.organizer.instagram
            ? <span>by <span style={{ color: "#38BDF8" }}>@{number.organizer.instagram}</span></span>
            : <span>by {number.organizer.dancer_name}</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "6px" }}>
          {/* 想定練習期間。開始日から表示し、終了日があれば「〜終了日」を続ける */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Calendar size={8} color={T.iconDim} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "9px", color: T.metaText, fontFamily: "'Noto Sans JP',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {month}/{day}({weekday}){endParts ? `〜${endParts.month}/${endParts.day}(${endParts.weekday})` : ""}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <MapPin size={8} color={T.iconDim} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "9px", color: T.metaText, fontFamily: "'Noto Sans JP',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{number.location}</span>
          </div>
          {number.performance_dates.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Star size={8} color={color} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: "9px", color: T.metaText, fontFamily: "'Noto Sans JP',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                本番: {formatJaDate(number.performance_dates[0])}{number.performance_dates.length > 1 ? ` 他${number.performance_dates.length - 1}日` : ""}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
          <span style={{ fontSize: "9.5px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", color: T.text, whiteSpace: "nowrap" }}>
            {number.participant_count}{number.max_members ? `/${number.max_members}` : ""}人
          </span>
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}
