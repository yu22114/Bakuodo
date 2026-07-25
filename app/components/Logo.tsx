"use client";

export const LOGO_SRC = "/logo.jpg";

// 丸ロゴ。元画像は円のまわりに約6.5%クリーム色の余白があり、透過も無い。
// そのまま丸く切り抜くと余白が輪っかになって残るので、少し拡大して隠している。
export function Logo({ size = 32, src = LOGO_SRC }: { size?: number; src?: string }) {
  return (
    <span style={{ width: `${size}px`, height: `${size}px`, borderRadius: "50%", overflow: "hidden", display: "inline-block", flexShrink: 0, lineHeight: 0 }}>
      <img src={src} alt="爆踊" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.15)", display: "block" }} />
    </span>
  );
}
