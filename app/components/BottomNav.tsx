"use client";
import { useState, useEffect } from "react";
import { Home, Plus, User } from "lucide-react";

export function BottomNav({ current, onNav }: { current: string; onNav: (s: string) => void }) {
  // 下スクロールで隠れ、上スクロールで戻る
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = 0;
    const onScroll = (e: Event) => {
      const t = e.target as HTMLElement | Document;
      // トップ画面はカード一覧だけが内側でスクロールする。scrollイベントは
      // バブルしないので、キャプチャ（第3引数true）で内側の分も拾う
      const top = t instanceof HTMLElement ? t.scrollTop : window.scrollY;
      if (Math.abs(top - last) < 8) return; // 指の震え程度では動かさない
      setHidden(top > last && top > 60);
      last = top;
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  // ラベルは画面には出さずアイコンだけ。読み上げ用にaria-labelとしてだけ残す
  const items = [
    { id: "top", icon: <Home size={22} />, label: "ホーム" },
    { id: "post", icon: <Plus size={22} />, label: "投稿" },
    { id: "profile", icon: <User size={22} />, label: "マイページ" },
  ];
  return (
    // 外側はビューポート全幅の透明レイヤー（中央寄せのためだけ）。
    // pointerEvents:none にして、島の外の余白部分はタップをすり抜けさせる
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, display: "flex", justifyContent: "center", padding: "0 16px 16px", pointerEvents: "none", transform: hidden ? "translateY(140%)" : "none", transition: "transform 0.25s ease" }}>
      {/* 中身が透けるガラス感を出すため、白の不透明度を下げてぼかしを強めにする */}
      <div style={{ width: "100%", maxWidth: "448px", background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderRadius: "26px", display: "flex", boxShadow: "0 10px 30px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04)", border: "1px solid rgba(255,255,255,0.5)", pointerEvents: "auto" }}>
        {items.map(item => (
          <button key={item.id} onClick={() => onNav(item.id)} aria-label={item.label} style={{ flex: 1, padding: "14px 0", border: "none", background: "transparent", color: current === item.id ? "#FF3D00" : "rgba(0,0,0,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {item.id === "post" ? (
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#FF3D00", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "-22px", marginBottom: "-8px", boxShadow: "0 2px 12px rgba(255,61,0,0.4)", border: "3px solid rgba(255,255,255,0.7)" }}>
                <Plus size={20} color="#fff" />
              </div>
            ) : item.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
