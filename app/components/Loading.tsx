"use client";

// ロゴが回転するローディングは「何が起きてるか分かりにくい」とのことで、
// 定番の円グルグルスピナーに変更。keyframesをここに持たせているのは
// page.tsx配下だけでなく /c/[id] や /u/[id] のような別ルートからも使うため（Toast.tsxと同じやり方）
export function Loading({ size = 40, label }: { size?: number; label?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", padding: "40px" }}>
      <style>{`@keyframes bdSpin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: `${size}px`, height: `${size}px`, borderRadius: "50%",
        border: `${Math.max(3, Math.round(size / 12))}px solid rgba(255,255,255,0.12)`,
        borderTopColor: "#FF3D00",
        animation: "bdSpin 0.7s linear infinite",
      }} />
      {label && <div style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0" }}>{label}</div>}
    </div>
  );
}
