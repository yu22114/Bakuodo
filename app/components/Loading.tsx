"use client";
import { Logo } from "./Logo";

// ローディング中はロゴがその場で転がり続ける。
// keyframesをここに持たせているのは、page.tsx配下だけでなく
// /c/[id] や /u/[id] のような別ルートからも使うため（Toast.tsxと同じやり方）
export function Loading({ size = 44, label }: { size?: number; label?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", padding: "40px" }}>
      <style>{`@keyframes bdLogoSpin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ animation: "bdLogoSpin 1.1s linear infinite", lineHeight: 0 }}>
        <Logo size={size} />
      </div>
      {label && <div style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(0,0,0,0.35)" }}>{label}</div>}
    </div>
  );
}
