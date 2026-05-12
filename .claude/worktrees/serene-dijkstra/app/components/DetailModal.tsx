import { Clock, MapPin, User, X, Check, Zap } from "lucide-react";
import { formatDate } from "../../lib/utils";
import type { Cypher } from "../../lib/types";
import { GenreBadge } from "./GenreBadge";
import { ParticipantBar } from "./ParticipantBar";

export function DetailModal({ cypher, onClose, joined, onJoin }: { cypher: Cypher | null; onClose: () => void; joined: boolean; onJoin: (id: string) => void }) {
  if (!cypher) return null;
  const { date, time } = formatDate(cypher.starts_at);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", margin: "0 auto", background: "#111", border: "1px solid rgba(255,255,255,0.12)", borderBottom: "none", borderRadius: "8px 8px 0 0", padding: "24px 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "24px", fontFamily: "'Bebas Neue',sans-serif", color: "#F5F5F5", lineHeight: 1.1 }}>{cypher.title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
          {cypher.genres.map(g => <GenreBadge key={g} genre={g} size="md" />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "10px", fontSize: "13px", color: "rgba(255,255,255,0.7)", fontFamily: "'Space Mono',monospace" }}><Clock size={14} /> {date} {time}</div>
          <div style={{ display: "flex", gap: "10px", fontSize: "13px", color: "rgba(255,255,255,0.7)", fontFamily: "'Space Mono',monospace" }}><MapPin size={14} /> {cypher.location}</div>
          <div style={{ display: "flex", gap: "10px", fontSize: "13px", color: "rgba(255,255,255,0.7)", fontFamily: "'Space Mono',monospace" }}><User size={14} /> 主催: {cypher.organizer.dancer_name}</div>
        </div>
        {cypher.description && <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: "20px" }}>{cypher.description}</p>}
        <ParticipantBar count={cypher.participant_count} max={cypher.max_members} />
        <button onClick={() => { onJoin(cypher.id); onClose(); }}
          style={{ marginTop: "20px", width: "100%", padding: "14px", border: "none", borderRadius: "2px", background: joined ? "rgba(105,255,71,0.15)" : "#FF3D00", color: joined ? "#69FF47" : "#fff", fontSize: "14px", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "0.15em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          {joined ? <><Check size={16} /> 参加済み — キャンセルする</> : <><Zap size={16} /> このサイファーに参加する</>}
        </button>
      </div>
    </div>
  );
}
