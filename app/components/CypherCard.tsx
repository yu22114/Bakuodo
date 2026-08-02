"use client";
import { useState } from "react";
import { Clock, MapPin } from "lucide-react";
import type { Cypher } from "../lib/types";
import { GENRE_COLORS, formatDate, timeUntil, formatEndTime } from "../lib/constants";
import { GenreBadge } from "./GenreBadge";
import { ParticipantBar } from "./ParticipantBar";

export function CypherCard({ cypher, onClick, index = 0 }: { cypher: Cypher; onClick: () => void; index?: number }) {
  const { date, time } = formatDate(cypher.starts_at);
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
      style={{ background: "#FFFFFF", border: `1px solid ${cypher.hot && !isEnded ? "rgba(255,61,0,0.25)" : "rgba(0,0,0,0.08)"}`, borderLeft: `4px solid ${isEnded ? "rgba(0,0,0,0.1)" : color}`, borderRadius: "10px", padding: "14px 18px", cursor: "pointer", transition: "transform 0.25s ease, box-shadow 0.25s ease", transform: hover ? "translateY(-3px)" : "none", position: "relative", overflow: "hidden", boxShadow: hover ? `0 6px 12px rgba(0,0,0,0.05), 0 18px 36px ${color}26` : "0 2px 4px rgba(0,0,0,0.04), 0 8px 20px rgba(0,0,0,0.06)", opacity: isEnded ? 0.55 : 1, ["--bd-glow" as any]: `${color}26` } as React.CSSProperties}>
      {cypher.hot && !isEnded && <div style={{ position: "absolute", top: 0, right: 0, background: "#FF3D00", padding: "3px 10px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#fff", fontWeight: "bold", borderBottomLeftRadius: "4px" }}>🔥 HOT</div>}
      {isEnded && <div style={{ position: "absolute", top: 0, right: 0, background: "rgba(0,0,0,0.1)", padding: "3px 10px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111111", fontWeight: "bold", borderBottomLeftRadius: "4px" }}>終了</div>}
      {cypher.visibility === "private" && !isEnded && !cypher.hot && <div style={{ position: "absolute", top: 0, right: 0, background: "rgba(0,0,0,0.65)", padding: "3px 10px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#fff", fontWeight: "bold", borderBottomLeftRadius: "4px" }}>🔒 限定</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div style={{ flex: 1, paddingRight: "52px" }}>
          <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 700, color: "#111111", fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.05em", lineHeight: 1.2 }}>{cypher.title}</h3>
          <div style={{ fontSize: "12px", color: "#111111", marginTop: "3px", fontFamily: "'Noto Sans JP',sans-serif", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span>by {cypher.organizer.dancer_name}</span>
            {cypher.organizer.instagram && (
              <span style={{ color: "#A855F7" }}>@{cypher.organizer.instagram}</span>
            )}
          </div>
        </div>
        <div style={{ width: "44px", height: "44px", borderRadius: "6px", background: `linear-gradient(135deg,${color}22,${color}44)`, border: `1px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: "bold", color, fontFamily: "'Noto Sans JP',sans-serif", flexShrink: 0, overflow: "hidden" }}>
          {cypher.organizer.avatar_url
            ? <img src={cypher.organizer.avatar_url} alt={cypher.organizer.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : cypher.organizer.avatar}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Clock size={11} color="rgba(0,0,0,0.35)" />
          <span style={{ fontSize: "11px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif" }}>{date} {time}{cypher.ends_at ? `〜${formatEndTime(cypher.starts_at, cypher.ends_at)}` : ""}</span>
          <span style={{ fontSize: "9px", padding: "1px 6px", background: isEnded ? "rgba(0,0,0,0.06)" : "rgba(255,61,0,0.08)", borderRadius: "3px", color: isEnded ? "rgba(0,0,0,0.4)" : "#FF3D00", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold" }}>{until}</span>
        </div>
        {/* カード上では地図リンクにしない。カードのどこを押しても詳細が開くようにして、
            「カードを押したつもりが地図に飛ぶ」のを防ぐ。地図へは詳細モーダルから飛べる */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <MapPin size={11} color="rgba(0,0,0,0.35)" />
          <span style={{ fontSize: "11px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif" }}>{cypher.location}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "8px" }}>
        {cypher.genres.map(g => <GenreBadge key={g} genre={g} />)}
        {cypher.studio_fee != null && (
          <span style={{ fontSize: "9px", padding: "2px 7px", background: "rgba(0,0,0,0.05)", borderRadius: "4px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif" }}>
            💴 {cypher.participant_count > 0 ? `¥${Math.ceil(cypher.studio_fee / cypher.participant_count).toLocaleString()}/人` : `¥${cypher.studio_fee.toLocaleString()}`}
          </span>
        )}
      </div>
      <ParticipantBar count={cypher.participant_count} max={cypher.max_members} />
    </div>
    </div>
  );
}
