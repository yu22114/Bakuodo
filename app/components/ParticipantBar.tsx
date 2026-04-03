export function ParticipantBar({ count, max }: { count: number; max: number | null }) {
  const pct = max ? Math.min((count / max) * 100, 100) : 50;
  const color = pct > 80 ? "#FF3D00" : pct > 50 ? "#FFD600" : "#69FF47";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ flex: 1, height: "3px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
      <span style={{ fontSize: "11px", color, fontFamily: "'Space Mono',monospace", minWidth: "60px", textAlign: "right" }}>
        {count}{max ? `/${max}` : ""} 人
      </span>
    </div>
  );
}
