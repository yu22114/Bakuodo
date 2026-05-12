"use client";

export function ParticipantBar({ count, max }: { count: number; max: number | null }) {
  const pct = max ? Math.min((count / max) * 100, 100) : 50;
  const color = pct > 80 ? "#FF3D00" : pct > 50 ? "#D97706" : "#16A34A";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ flex: 1, height: "4px", background: "rgba(0,0,0,0.08)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
      <span style={{ fontSize: "11px", color, fontFamily: "'Space Mono',monospace", minWidth: "60px", textAlign: "right", fontWeight: "bold" }}>
        {count}{max ? `/${max}` : ""} 人
      </span>
    </div>
  );
}
