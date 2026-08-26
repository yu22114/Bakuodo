"use client";
import type { LucideIcon } from "lucide-react";

// 一覧が空の時の共通表示。文字だけより、小さいアイコンを一つ添えた方が寂しさが和らぐ
export function EmptyState({ icon: Icon, children, padding = "40px" }: { icon: LucideIcon; children: React.ReactNode; padding?: string }) {
  return (
    <div style={{ textAlign: "center", padding, color: "rgba(255,255,255,0.4)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      <Icon size={26} color="rgba(255,255,255,0.22)" strokeWidth={1.5} />
      <span>{children}</span>
    </div>
  );
}
