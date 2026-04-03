"use client";
import { useState } from "react";
import { MapPin, Clock, Plus, Check } from "lucide-react";
import { GENRE_COLORS } from "../../lib/constants";
import { formatDate, timeUntil } from "../../lib/utils";
import type { Cypher } from "../../lib/types";
import { GenreBadge } from "./GenreBadge";
import { ParticipantBar } from "./ParticipantBar";

export function CypherCard({ cypher, onClick, joined, onJoin }: { cypher: Cypher; onClick: () => void; joined: boolean; onJoin: (id: string) => void }) {
  const { date, time } = formatDate(cypher.starts_at);
  const until = timeUntil(cypher.starts_at);
  const [hover, setHover] = useState(false);
  const color = GENRE_COLORS[cypher.genres[0]] ?? "#ffffff";
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)", border: cypher.hot ? "1px solid rgba(255,61,0,0.5)" : "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", padding: "16px", cursor: "pointer", transition: "all 0.2s ease", transform: hover ? "translateY(-2px)" : "none", position: "relative", overflow: "hidden" }}>
      {cypher.hot && <div style={{ position: "absolute", top: 0, right: 0, background: "#FF3D00", padding: "3px 10px", fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "#fff", fontWeight: "bold" }}>🔥 HOT</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div style={{ flex: 1, paddingRight: "40px" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#F5F5F5", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "0.05em", lineHeight: 1.2 }}>{cypher.title}</h3>
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginTop: "2px", fontFamily: "'Space Mono',monospace" }}>by {cypher.organizer.dancer_name}</div>
        </div>
        <div style={{ width: "36px", height: "36px", borderRadius: "2px", background: `linear-gradient(135deg,${color}33,transparent)`, border: `1px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "bold", color, fontFamily: "'Bebas Neue',sans-serif", flexShrink: 0 }}>
          {cypher.organizer.avatar}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Clock size={11} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontFamily: "'Space Mono',monospace" }}>{date} {time}</span>
          <span style={{ fontSize: "9px", padding: "1px 5px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", color: "rgba(255,255,255,0.5)", fontFamily: "'Space Mono',monospace" }}>{until}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <MapPin size={11} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontFamily: "'Space Mono',monospace" }}>{cypher.location}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "12px" }}>
        {cypher.genres.map(g => <GenreBadge key={g} genre={g} />)}
      </div>
      <ParticipantBar count={cypher.participant_count} max={cypher.max_members} />
      <button onClick={e => { e.stopPropagation(); onJoin(cypher.id); }}
        style={{ marginTop: "12px", width: "100%", padding: "9px", border: joined ? "1px solid rgba(105,255,71,0.5)" : "1px solid rgba(255,255,255,0.2)", borderRadius: "2px", background: joined ? "rgba(105,255,71,0.1)" : "transparent", color: joined ? "#69FF47" : "rgba(255,255,255,0.7)", fontSize: "11px", fontFamily: "'Space Mono',monospace", letterSpacing: "0.1em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
        {joined ? <><Check size={12} /> JOINED</> : <><Plus size={12} /> JUMP IN</>}
      </button>
    </div>
  );
}
