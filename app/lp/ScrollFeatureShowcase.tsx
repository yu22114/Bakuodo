"use client";
import { useEffect, useRef, useState } from "react";

// iPhoneの製品ページのように、スクロールに合わせて右側（モバイルでは上側）の
// スマホ画面イメージが機能ごとに切り替わる演出。実スクリーンショットは使わず、
// 各機能のジャンルカラーでポスターカード風の画面を再現している。
// 継続的なscrollイベントは使わず、IntersectionObserverで「今画面中央に来ている
// 項目」を検知するだけなので、スクロール性能への負荷はほぼない。

const FEATURES = [
  { tag: "CYPHER", color: "#DC2626", title: "サイファーを開く・混ざる", desc: "開催情報を出すだけで人が集まる。参加も一言リクエストするだけ。" },
  { tag: "LESSON", color: "#2563EB", title: "プライベートレッスン", desc: "講師と受講者をつなぐ。レベル・定員を決めて募集できる。" },
  { tag: "EVENT", color: "#EAB308", title: "本番イベントの告知", desc: "JUDGE・DJ・MCまで載せて、観客ありの本番を告知できる。" },
  { tag: "NUMBER", color: "#EC4899", title: "振付作品の出演者募集", desc: "大人数振付の出演者をInstagramひとつで募集・確定。" },
  { tag: "SPOTS", color: "#16A34A", title: "聖地の今を知る", desc: "今そのスポットに何人いるか、リアルタイムでわかる。" },
];

export function ScrollFeatureShowcase() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const idx = refs.current.findIndex(el => el === entry.target);
          if (idx !== -1) setActive(idx);
        });
      },
      // 画面の上45%〜下45%の帯（＝ほぼ中央）に入った項目をアクティブにする
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    refs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section style={{ maxWidth: "1040px", margin: "0 auto", padding: "40px 20px" }}>
      <div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", marginBottom: "8px" }}>WHAT YOU CAN DO</div>
      <h2 style={{ margin: "0 0 8px", fontSize: "26px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700 }}>5つの遊び方</h2>

      <div className="lp-showcase">
        {/* スマホ画面（スクロールしても画面内に留まり、中身だけ切り替わる） */}
        <div className="lp-showcase-phone-wrap" style={{ position: "sticky", top: "14vh", height: "fit-content", display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative", width: "230px", aspectRatio: "9 / 19.5", borderRadius: "38px", background: "#0a0a0a", border: "6px solid #1c1c1c", boxShadow: "0 24px 60px rgba(0,0,0,0.55)", animation: "lpPhoneFloat 5s ease-in-out infinite" }}>
            {/* ノッチ */}
            <div style={{ position: "absolute", top: "10px", left: "50%", transform: "translateX(-50%)", width: "70px", height: "16px", borderRadius: "10px", background: "#0a0a0a", zIndex: 2 }} />
            {/* 画面：各機能のカードを重ねて置き、アクティブなものだけopacity/scaleで見せる */}
            <div style={{ position: "absolute", inset: "4px", borderRadius: "32px", overflow: "hidden" }}>
              {FEATURES.map((f, i) => (
                <div key={f.tag} style={{
                  position: "absolute", inset: 0, padding: "34px 14px 16px",
                  background: `linear-gradient(160deg, ${f.color}66 0%, #1c1c1c 62%, #101010 100%)`,
                  display: "flex", flexDirection: "column",
                  opacity: active === i ? 1 : 0, transform: active === i ? "scale(1)" : "scale(0.94)",
                  transition: "opacity 0.5s ease, transform 0.5s ease",
                }}>
                  <span style={{ alignSelf: "flex-start", fontSize: "8px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", padding: "3px 7px", borderRadius: "3px", background: f.color + "33", color: f.color }}>{f.tag}</span>
                  <span style={{ marginTop: "auto", fontSize: "17px", fontWeight: 900, fontStyle: "italic", color: "#fff", fontFamily: "'Playfair Display','Noto Sans JP',sans-serif", lineHeight: 1.15 }}>{f.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* テキスト側：これがスクロールで流れ、中央に来たものがアクティブになる */}
        <div>
          {FEATURES.map((f, i) => (
            <div key={f.tag} ref={el => { refs.current[i] = el; }} style={{ minHeight: "70vh", display: "flex", alignItems: "center" }}>
              <div style={{ opacity: active === i ? 1 : 0.32, transition: "opacity 0.4s ease" }}>
                <span style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", color: f.color, background: f.color + "1f", borderRadius: "3px", padding: "3px 7px" }}>{f.tag}</span>
                <div style={{ marginTop: "14px", fontSize: "22px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700 }}>{f.title}</div>
                <div style={{ marginTop: "10px", fontSize: "13px", lineHeight: 1.8, color: "rgba(255,255,255,0.55)", fontFamily: "'Noto Sans JP',sans-serif", maxWidth: "320px" }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes lpPhoneFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .lp-showcase { display: grid; grid-template-columns: 260px 1fr; gap: 40px; }
        @media (max-width: 860px) {
          .lp-showcase { grid-template-columns: 1fr; }
          .lp-showcase-phone-wrap { order: -1; margin-bottom: 8px; top: 6vh !important; }
        }
      `}</style>
    </section>
  );
}
