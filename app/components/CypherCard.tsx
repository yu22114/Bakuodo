"use client";
import { useState } from "react";
import { Clock, MapPin } from "lucide-react";
import type { Cypher } from "../lib/types";
import { GENRE_COLORS, genreLabel, formatDate, dateBadgeParts, timeUntil, daysUntil, formatEndTime } from "../lib/constants";

export function CypherCard({ cypher, onClick, index = 0 }: { cypher: Cypher; onClick: () => void; index?: number }) {
  const { time } = formatDate(cypher.starts_at);
  const { month, day, weekday } = dateBadgeParts(cypher.starts_at);
  const until = timeUntil(cypher.starts_at);
  const [hover, setHover] = useState(false);
  const color = GENRE_COLORS[cypher.genres[0]] ?? "#FF3D00";
  const isEnded = until === "終了";
  // 浮かび上がる登場は外側のdivに持たせる。内側のカードはホバーで動かすので
  // 同じ要素にアニメーションを乗せるとtransformが競合してホバーが効かなくなる
  return (
    <div style={{ animation: `bdCardFloatIn 0.45s ease-out ${Math.min(index * 60, 400)}ms both` }}>
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      // bd-glow-card: タッチ端末はホバーできないので、PCのホバー時と同じ色付き影を
      // @media(hover:none) で常時出す（globals.css相当のスタイルはpage.tsxのstyleタグ）
      className="bd-glow-card"
      style={{ background: "#141414", border: `1px solid ${cypher.hot && !isEnded ? "rgba(255,61,0,0.25)" : "rgba(255,255,255,0.1)"}`, borderLeft: "4px solid transparent", borderRadius: "10px", padding: "11px 16px", cursor: "pointer", transition: "transform 0.25s ease, box-shadow 0.25s ease", transform: hover ? "translateY(-3px)" : "none", position: "relative", overflow: "hidden", boxShadow: hover ? `0 6px 12px rgba(0,0,0,0.3), 0 18px 36px ${color}26` : "0 2px 4px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.2)", opacity: isEnded ? 0.55 : 1, ["--bd-glow" as any]: `${color}26` } as React.CSSProperties}>
      {cypher.hot && !isEnded && <div style={{ position: "absolute", top: 0, right: 0, background: "#FF3D00", padding: "3px 10px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#fff", fontWeight: "bold", borderBottomLeftRadius: "4px" }}>🔥 HOT</div>}
      {isEnded && <div style={{ position: "absolute", top: 0, right: 0, background: "rgba(255,255,255,0.12)", padding: "3px 10px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", fontWeight: "bold", borderBottomLeftRadius: "4px" }}>終了</div>}
      {cypher.visibility === "private" && !isEnded && !cypher.hot && <div style={{ position: "absolute", top: 0, right: 0, background: "rgba(0,0,0,0.65)", padding: "3px 10px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#fff", fontWeight: "bold", borderBottomLeftRadius: "4px" }}>🔒 限定</div>}
      {/* 背景に敷くジャンル名。色はそのジャンルの色、薄くして文字の邪魔をしない。
          はみ出た分はカードのoverflow:hiddenで切られる */}
      {cypher.genres[0] && (() => {
        // 表示は ing を落とした短い名前（BREAKING → BREAK）。
        // 長い名前（ALL STYLE など）が右で切れないよう、文字数に応じて小さくする
        const label = genreLabel(cypher.genres[0]).toUpperCase();
        // 左側の縁取りでジャンル色を出さなくなった代わりに、この背景ジャンル名を1.1倍大きくして目立たせる
        return (
          <div aria-hidden="true" style={{ position: "absolute", right: "14px", bottom: "-8px", fontSize: `${Math.round(Math.min(68, Math.round(360 / label.length)) * 1.1)}px`, fontStyle: "italic", fontFamily: "'Titan One','Noto Sans JP',sans-serif", letterSpacing: "-0.02em", lineHeight: 1, whiteSpace: "nowrap", color: color + "1F", pointerEvents: "none", userSelect: "none" }}>
            {label}
          </div>
        );
      })()}
      {/* 中身は背景文字より上に置く（position指定がないと背景文字の下に隠れる） */}
      <div style={{ position: "relative", display: "flex", gap: "12px" }}>
      {/* 開催日時はチケットの半券風に左端へ。上から月・日・曜日の3段 */}
      <div style={{ width: "44px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", borderRadius: "8px", overflow: "hidden", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ width: "100%", textAlign: "center", padding: "3px 0", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#fff", background: isEnded ? "rgba(255,255,255,0.15)" : color }}>{month}月</div>
        <div style={{ fontSize: "21px", fontWeight: 700, fontFamily: "'Noto Sans JP',sans-serif", color: isEnded ? "rgba(255,255,255,0.4)" : "#F0F0F0", padding: "3px 0", lineHeight: 1 }}>{day}</div>
        <div style={{ width: "100%", textAlign: "center", padding: "3px 0", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>{weekday}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "5px" }}>
        <div style={{ flex: 1, paddingRight: "52px" }}>
          {/* 残り日数はタイトルの真横に。開催日そのものは左の日付バッジに出す */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 700, color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.05em", lineHeight: 1.2 }}>{cypher.title}</h3>
            <span style={{ fontSize: "9px", padding: "1px 6px", background: isEnded ? "rgba(255,255,255,0.08)" : "rgba(255,61,0,0.08)", borderRadius: "3px", color: isEnded ? "rgba(255,255,255,0.45)" : "#FF3D00", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", flexShrink: 0 }}>{daysUntil(cypher.starts_at)}</span>
          </div>
          <div style={{ fontSize: "12px", color: "#F0F0F0", marginTop: "3px", fontFamily: "'Noto Sans JP',sans-serif", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span>by {cypher.organizer.dancer_name}</span>
            {cypher.organizer.instagram && (
              <span style={{ color: "#A855F7" }}>@{cypher.organizer.instagram}</span>
            )}
          </div>
        </div>
        {/* 参加人数は下のバーではなく主催者アイコンの真下に出す */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", flexShrink: 0 }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: `linear-gradient(135deg,${color}22,${color}44)`, border: `1px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: "bold", color, fontFamily: "'Noto Sans JP',sans-serif", overflow: "hidden" }}>
            {cypher.organizer.avatar_url
              ? <img src={cypher.organizer.avatar_url} alt={cypher.organizer.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : cypher.organizer.avatar}
          </div>
          <span style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", color: isEnded ? "rgba(255,255,255,0.4)" : "#F0F0F0", whiteSpace: "nowrap" }}>
            {cypher.participant_count}{cypher.max_members ? `/${cypher.max_members}` : ""}人
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Clock size={11} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: "11px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>{time}{cypher.ends_at ? `〜${formatEndTime(cypher.starts_at, cypher.ends_at)}` : ""}</span>
        </div>
        {/* カード上では地図リンクにしない。カードのどこを押しても詳細が開くようにして、
            「カードを押したつもりが地図に飛ぶ」のを防ぐ。地図へは詳細モーダルから飛べる */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <MapPin size={11} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: "11px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>{cypher.location}</span>
        </div>
      </div>
      {cypher.studio_fee != null && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "5px" }}>
          <span style={{ fontSize: "9px", padding: "2px 7px", background: "rgba(255,255,255,0.08)", borderRadius: "4px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>
            {cypher.participant_count > 0 ? `¥${Math.ceil(cypher.studio_fee / cypher.participant_count).toLocaleString()}/人` : `¥${cypher.studio_fee.toLocaleString()}`}
          </span>
        </div>
      )}
      </div>
      </div>
    </div>
    </div>
  );
}
