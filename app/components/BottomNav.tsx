"use client";
import { useState, useEffect, useRef } from "react";
import { Home, Heart, Plus, Users, User } from "lucide-react";

export function BottomNav({ current, onNav, onProfileLongPress }: { current: string; onNav: (s: string) => void; onProfileLongPress?: () => void }) {
  // マイページボタンの長押しでアカウント切り替えを開く（団体用・個人用など複数Googleアカウントの使い分け用）
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const startLongPress = (id: string) => {
    if (id !== "profile" || !onProfileLongPress) return;
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onProfileLongPress();
    }, 550);
  };
  const clearLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

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
    { id: "following", icon: <Heart size={22} />, label: "フォロー中" },
    { id: "post", icon: <Plus size={22} />, label: "投稿" },
    { id: "community", icon: <Users size={22} />, label: "コミュニティ" },
    { id: "profile", icon: <User size={22} />, label: "マイページ" },
  ];
  return (
    // 外側はビューポート全幅の透明レイヤー（中央寄せのためだけ）。
    // pointerEvents:none にして、島の外の余白部分はタップをすり抜けさせる
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, display: "flex", justifyContent: "center", padding: "0 16px 16px", pointerEvents: "none", transform: hidden ? "translateY(140%)" : "none", transition: "transform 0.25s ease" }}>
      {/* すりガラス調：うっすら白を乗せてブラーすることで、後ろが透けて見えるガラス板の質感にする。
          上端に薄いハイライトを乗せて、ガラスの縁が光を受けているように見せる */}
      <div style={{ width: "100%", maxWidth: "448px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderRadius: "26px", display: "flex", position: "relative", boxShadow: "0 10px 30px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.18)", pointerEvents: "auto" }}>
        {/* アクティブ表示のピル。背景の四角自体がヌルッと隣のアイコンへスライドする
            （各アイコンごとに個別のON/OFFではなく、1枚の板が移動する見せ方）。
            どのタブにも一致しない画面（プロフィール編集など）の時は消しておく */}
        <div aria-hidden="true" style={{ position: "absolute", top: "9px", left: 0, width: `${100 / items.length}%`, height: "40px", display: "flex", alignItems: "center", justifyContent: "center", opacity: items.some(i => i.id === current) ? 1 : 0, transform: `translateX(${Math.max(0, items.findIndex(i => i.id === current)) * 100}%)`, transition: "transform 0.32s cubic-bezier(0.34,1.56,0.64,1), opacity 0.15s ease", pointerEvents: "none" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(180deg, #3a3a3a, #232323)", boxShadow: "0 3px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)" }} />
        </div>
        {items.map(item => {
          const active = current === item.id;
          return (
            <button key={item.id}
              onClick={() => { if (longPressFired.current) { longPressFired.current = false; return; } onNav(item.id); }}
              onPointerDown={() => startLongPress(item.id)}
              onPointerUp={clearLongPress}
              onPointerLeave={clearLongPress}
              onPointerCancel={clearLongPress}
              aria-label={item.id === "profile" && onProfileLongPress ? `${item.label}（長押しでアカウント切り替え）` : item.label}
              style={{ flex: 1, padding: "9px 0", border: "none", background: "transparent", position: "relative", zIndex: 1, color: active ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {item.id === "post" ? (
                  <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.35)" }}>
                    <Plus size={18} color="#171717" />
                  </div>
                ) : item.icon}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
