"use client";

// 丸いロゴ画像ができたら imageSrc に渡せば自動でそちらに切り替わる（未指定の間はテキストロゴ）
export function Logo({ imageSrc }: { imageSrc?: string | null }) {
  return imageSrc ? (
    <img src={imageSrc} alt="爆踊" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <span style={{ fontSize: "20px", fontFamily: "'Rampart One',sans-serif", letterSpacing: "0.05em", background: "linear-gradient(135deg,#FF3D00 0%,#2563EB 50%,#16A34A 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", whiteSpace: "nowrap", flexShrink: 0 }}>
      爆踊
    </span>
  );
}
