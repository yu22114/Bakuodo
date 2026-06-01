"use client";
import { useState } from "react";
import { Clock, MapPin } from "lucide-react";
import type { Cypher } from "../lib/types";
import { GENRE_COLORS, formatDate, timeUntil, formatEndTime } from "../lib/constants";
import { GenreBadge } from "./GenreBadge";
import { ParticipantBar } from "./ParticipantBar";

export function CypherCard({ cypher, onClick }: { cypher: Cypher; onClick: () => void }) {
  const { date, time } = formatDate(cypher.starts_at);
  const until = timeUntil(cypher.starts_at);
  const [hover, setHover] = useState(false);
  const color = GENRE_COLORS[cypher.genres[0]] ?? "#FF3D00";
  const isEnded = until === "終了";
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: "#FFFFFF", border: `1px solid ${cypher.hot && !isEnded ? "rgba(255,61,0,0.25)" : "rgba(0,0,0,0.08)"}`, borderRadius: "8px", padding: "16px", cursor: "pointer", transition: "all 0.2s ease", transform: hover ? "translateY(-1px)" : "none", position: "relative", overflow: "hidden", boxShadow: hover ? "0 4px 16px rgba(0,0,0,0.08)" : "0 1px 4px rgba(0,0,0,0.04)", opacity: isEnded ? 0.55 : 1 }}>
      {cypher.hot && !isEnded && <div style={{ position: "absolute", top: 0, right: 0, background: "#FF3D00", padding: "3px 10px", fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "#fff", fontWeight: "bold", borderBottomLeftRadius: "4px" }}>🔥 HOT</div>}
      {isEnded && <div style={{ position: "absolute", top: 0, right: 0, background: "rgba(0,0,0,0.1)", padding: "3px 10px", fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.45)", fontWeight: "bold", borderBottomLeftRadius: "4px" }}>終了</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div style={{ flex: 1, paddingRight: "44px" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111111", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "0.05em", lineHeight: 1.2 }}>{cypher.title}</h3>
          <div style={{ fontSize: "10px", color: "rgba(0,0,0,0.4)", marginTop: "2px", fontFamily: "'Space Mono',monospace" }}>by {cypher.organizer.dancer_name}</div>
        </div>
        <div style={{ width: "36px", height: "36px", borderRadius: "4px", background: `linear-gradient(135deg,${color}22,${color}44)`, border: `1px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "bold", color, fontFamily: "'Bebas Neue',sans-serif", flexShrink: 0, overflow: "hidden" }}>
          {cypher.organizer.avatar_url
            ? <img src={cypher.organizer.avatar_url} alt={cypher.organizer.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : cypher.organizer.avatar}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Clock size={11} color="rgba(0,0,0,0.35)" />
          <span style={{ fontSize: "11px", color: "rgba(0,0,0,0.6)", fontFamily: "'Space Mono',monospace" }}>{date} {time}{cypher.ends_at ? `〜${formatEndTime(cypher.starts_at, cypher.ends_at)}` : ""}</span>
          <span style={{ fontSize: "9px", padding: "1px 6px", background: isEnded ? "rgba(0,0,0,0.06)" : "rgba(255,61,0,0.08)", borderRadius: "3px", color: isEnded ? "rgba(0,0,0,0.4)" : "#FF3D00", fontFamily: "'Space Mono',monospace", fontWeight: "bold" }}>{until}</span>
        </div>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cypher.location)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ display: "flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
        >
          <MapPin size={11} color="rgba(0,0,0,0.35)" />
          <span style={{ fontSize: "11px", color: "rgba(0,0,0,0.6)", fontFamily: "'Space Mono',monospace", textDecoration: "underline dotted", textUnderlineOffset: "2px" }}>{cypher.location}</span>
        </a>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "12px" }}>
        {cypher.genres.map(g => <GenreBadge key={g} genre={g} />)}
      </div>
      <ParticipantBar count={cypher.participant_count} max={cypher.max_members} />
    </div>
  );
}
