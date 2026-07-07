"use client";
import { useEffect, useState } from "react";

// どこからでも showToast("...") で呼べる軽量トースト。
// 表示は layout.tsx に置いた <ToastHost /> が担当する。
export function showToast(message: string) {
  window.dispatchEvent(new CustomEvent("bd-toast", { detail: message }));
}

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handler = (e: Event) => {
      setMessage((e as CustomEvent<string>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), 3000);
    };
    window.addEventListener("bd-toast", handler);
    return () => { window.removeEventListener("bd-toast", handler); clearTimeout(timer); };
  }, []);

  if (!message) return null;
  return (
    <div style={{ position: "fixed", bottom: "92px", left: "50%", transform: "translateX(-50%)", zIndex: 300, maxWidth: "min(440px, calc(100vw - 32px))", background: "#111111", color: "#FFFFFF", padding: "12px 18px", borderRadius: "10px", fontSize: "13px", lineHeight: 1.5, boxShadow: "0 6px 24px rgba(0,0,0,0.25)", fontFamily: "'Noto Sans JP',sans-serif", animation: "bdToastIn 0.18s ease-out" }}>
      <style>{`@keyframes bdToastIn{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
      {message}
    </div>
  );
}
