"use client";

// 定員が大きすぎるとドットが並びきらずかえって見にくいので、この範囲だけドット表示にする
const MAX_DOTS = 20;

export function ParticipantBar({ count, max }: { count: number; max: number | null }) {
  const pct = max ? Math.min((count / max) * 100, 100) : 50;
  const color = pct > 80 ? "#FF3D00" : pct > 50 ? "#D97706" : "#16A34A";

  // 定員が決まっていれば、埋まっていくバーの代わりに定員ぶんのドットを並べ、
  // 参加人数の分だけ色を付ける（例: 定員5人なら点が5個、参加すると1個ずつ色が変わる）
  if (max != null && max > 0 && max <= MAX_DOTS) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", flex: 1 }}>
          {Array.from({ length: max }, (_, i) => (
            <span key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: i < count ? color : "rgba(0,0,0,0.12)", flexShrink: 0 }} />
          ))}
        </div>
        <span style={{ fontSize: "11px", color, fontFamily: "'Noto Sans JP',sans-serif", minWidth: "60px", textAlign: "right", fontWeight: "bold" }}>
          {count}/{max} 人
        </span>
      </div>
    );
  }

  // 定員無制限、またはドットで表現するには多すぎる場合は今まで通りバーで表示
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ flex: 1, height: "4px", background: "rgba(0,0,0,0.08)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
      <span style={{ fontSize: "11px", color, fontFamily: "'Noto Sans JP',sans-serif", minWidth: "60px", textAlign: "right", fontWeight: "bold" }}>
        {count}{max ? `/${max}` : ""} 人
      </span>
    </div>
  );
}
