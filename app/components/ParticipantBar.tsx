"use client";

// 定員が大きすぎるとドットが並びきらずかえって見にくいので、この範囲だけドット表示にする
const MAX_DOTS = 20;

export function ParticipantBar({ count, max }: { count: number; max: number | null }) {
  const pct = max ? Math.min((count / max) * 100, 100) : 50;
  const color = pct > 80 ? "#DC2626" : pct > 50 ? "#D97706" : "#16A34A";

  // 定員が決まっていればその分、決まっていなければ今の参加人数の分だけドットを並べる。
  // 実際の投稿はほぼ「定員無制限」なので、無制限でもドットが機能するようにしている
  // （無制限の場合は「埋まっている/空いている」の概念が無いので全部同じ色で点灯させる）
  const dotTotal = max ?? count;
  if (dotTotal > 0 && dotTotal <= MAX_DOTS) {
    const dotColor = max != null ? color : "#16A34A";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", flex: 1 }}>
          {Array.from({ length: dotTotal }, (_, i) => (
            <span key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: i < count ? dotColor : "rgba(255,255,255,0.14)", flexShrink: 0 }} />
          ))}
        </div>
        <span style={{ fontSize: "11px", color, fontFamily: "'Noto Sans JP',sans-serif", minWidth: "60px", textAlign: "right", fontWeight: "bold" }}>
          {count}{max ? `/${max}` : ""} 人
        </span>
      </div>
    );
  }

  // 定員が多すぎてドットで表現しづらい場合、または参加者が誰もいない場合は今まで通りバーで表示
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
      <span style={{ fontSize: "11px", color, fontFamily: "'Noto Sans JP',sans-serif", minWidth: "60px", textAlign: "right", fontWeight: "bold" }}>
        {count}{max ? `/${max}` : ""} 人
      </span>
    </div>
  );
}
