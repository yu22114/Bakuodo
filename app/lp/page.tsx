import type { Metadata } from "next";
import { ScrollFeatureShowcase } from "./ScrollFeatureShowcase";

// 爆踊の紹介LP。アプリ本体（app/page.tsx、クライアントコンポーネント）とは完全に独立したページ。
// Vercelで別ドメインを割り当てて、proxy.tsがそのドメインへのアクセスだけを
// このページにリライトする（詳しくはproxy.tsのコメント参照）。
// アプリ側のログイン・セッション処理には一切触れない、サーバーコンポーネントの静的ページ。
// ※「5つの遊び方」セクションだけ、スクロール連動の演出のためクライアントコンポーネント
// （ScrollFeatureShowcase.tsx）に切り出している。それ以外はこのファイルのまま静的。

export const metadata: Metadata = {
  title: "爆踊 | 今日、ここで、踊ろう。",
  description: "サイファーの開催・参加、レッスン・イベントの告知、振付作品の募集まで。ダンサーが集まり、つながるための無料コミュニティアプリ。",
};

const APP_URL = "https://bakuodo.vercel.app";

const VALUES = [
  { title: "登録は無料", desc: "アカウント作成から検索・参加まで、料金は一切かかりません。" },
  { title: "招待なしで始められる", desc: "コードも紹介も不要。ダウンロードしたその日から使えます。" },
  { title: "安心して使える設計", desc: "通報・ブロック機能、アカウント削除、プライバシーポリシーを整備しています。" },
];

export default function LandingPage() {
  return (
    <div style={{ background: "#000000", color: "#F0F0F0", minHeight: "100dvh", overflowX: "hidden" }}>
      <style>{`
        @keyframes lpDrift { 0%,100% { transform: translateY(0) rotate(var(--r,0deg)); } 50% { transform: translateY(-10px) rotate(var(--r,0deg)); } }
        @keyframes lpFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .lp-fade { animation: lpFadeUp 0.6s ease-out both; }
        .lp-cta:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .lp-cta { transition: filter 0.2s, transform 0.2s; }
        @media (max-width: 640px) {
          .lp-hero-deco { display: none; }
        }
      `}</style>

      {/* ヘッダー */}
      <header style={{ maxWidth: "1040px", margin: "0 auto", padding: "24px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "'RocknRoll One',sans-serif", fontSize: "20px", letterSpacing: "0.05em" }}>爆踊</div>
        <a href={APP_URL} style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", textDecoration: "none", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "20px", padding: "8px 16px" }}>
          Web版を開く →
        </a>
      </header>

      {/* ヒーロー */}
      <section style={{ position: "relative", maxWidth: "1040px", margin: "0 auto", padding: "48px 20px 80px" }}>
        <div style={{ position: "absolute", top: "-80px", left: "50%", transform: "translateX(-50%)", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(220,38,38,0.16) 0%, transparent 68%)", pointerEvents: "none" }} />

        {/* 装飾：ジャンルカラーのカード片。実画面のスクショではなく、雰囲気だけを伝える抽象表現 */}
        <div className="lp-hero-deco" aria-hidden="true" style={{ position: "absolute", top: "40px", right: "0px", width: "220px", height: "280px" }}>
          {[
            { color: "#DC2626", top: 0, right: 90, rot: -8 },
            { color: "#EAB308", top: 40, right: 10, rot: 6 },
            { color: "#EC4899", top: 130, right: 60, rot: -4 },
          ].map((c, i) => (
            <div key={i} style={{
              position: "absolute", top: c.top, right: c.right, width: "108px", height: "144px", borderRadius: "10px",
              background: `linear-gradient(160deg, ${c.color}55 0%, #1c1c1c 62%, #101010 100%)`,
              border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 12px 28px rgba(0,0,0,0.5)",
              ["--r" as any]: `${c.rot}deg`, transform: `rotate(${c.rot}deg)`,
              animation: `lpDrift ${5 + i}s ease-in-out infinite`, animationDelay: `${i * 0.4}s`,
            } as React.CSSProperties} />
          ))}
        </div>

        <div className="lp-fade" style={{ position: "relative", maxWidth: "560px" }}>
          <div style={{ display: "inline-block", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", letterSpacing: "0.2em", color: "#DC2626", background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "4px", padding: "5px 10px", marginBottom: "20px" }}>
            DANCE COMMUNITY APP
          </div>
          <h1 style={{ margin: 0, fontSize: "clamp(40px, 8vw, 64px)", fontFamily: "'Playfair Display','Noto Sans JP',sans-serif", fontStyle: "italic", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.01em" }}>
            今日、ここで、<br />踊ろう。
          </h1>
          <p style={{ marginTop: "24px", fontSize: "15px", lineHeight: 1.9, color: "rgba(255,255,255,0.65)", fontFamily: "'Noto Sans JP',sans-serif" }}>
            サイファーの開催・参加から、レッスンやイベントの告知、振付作品の出演者募集まで。
            ダンサーが集まり、つながるための無料コミュニティアプリです。
          </p>
          <div style={{ marginTop: "32px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px" }}>
            <a href={APP_URL} className="lp-cta" style={{ display: "inline-block", background: "linear-gradient(135deg, #DC2626, #A61B1B)", color: "#fff", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "14px", letterSpacing: "0.08em", padding: "16px 28px", borderRadius: "8px", textDecoration: "none", boxShadow: "0 8px 20px rgba(220,38,38,0.35)" }}>
              今すぐ無料ではじめる
            </a>
          </div>
          <p style={{ marginTop: "14px", fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "'Noto Sans JP',sans-serif" }}>
            ※ アプリのダウンロード版は準備中です。今はWebブラウザからすぐに使えます。
          </p>
        </div>
      </section>

      {/* 5つの遊び方（スクロール連動でスマホ画面が切り替わる演出） */}
      <ScrollFeatureShowcase />

      {/* マイコミュニティ */}
      <section style={{ maxWidth: "1040px", margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ background: "linear-gradient(120deg, rgba(220,38,38,0.1), rgba(20,20,20,0.4))", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "36px 28px" }}>
          <div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "#DC2626", letterSpacing: "0.2em", marginBottom: "8px" }}>FOR TEAMS</div>
          <h2 style={{ margin: "0 0 12px", fontSize: "22px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700 }}>チームには、マイコミュニティ。</h2>
          <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.9, color: "rgba(255,255,255,0.6)", fontFamily: "'Noto Sans JP',sans-serif", maxWidth: "560px" }}>
            掲示板で連絡を回し、練習日程を○△×で集計。担当パートを割り振って、カレンダーで一目確認。
            チーム内の連絡と練習管理を、ひとつの場所にまとめられます。
          </p>
        </div>
      </section>

      {/* 選ばれる理由 */}
      <section style={{ maxWidth: "1040px", margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px" }}>
          {VALUES.map(v => (
            <div key={v.title}>
              <div style={{ fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700 }}>{v.title}</div>
              <div style={{ marginTop: "8px", fontSize: "12px", lineHeight: 1.8, color: "rgba(255,255,255,0.55)", fontFamily: "'Noto Sans JP',sans-serif" }}>{v.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 最後のCTA */}
      <section style={{ maxWidth: "1040px", margin: "0 auto", padding: "60px 20px 40px", textAlign: "center" }}>
        <h2 style={{ margin: "0 0 24px", fontSize: "clamp(26px, 5vw, 36px)", fontFamily: "'Playfair Display','Noto Sans JP',sans-serif", fontStyle: "italic", fontWeight: 900 }}>
          さあ、踊り出そう。
        </h2>
        <a href={APP_URL} className="lp-cta" style={{ display: "inline-block", background: "linear-gradient(135deg, #DC2626, #A61B1B)", color: "#fff", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "14px", letterSpacing: "0.08em", padding: "16px 32px", borderRadius: "8px", textDecoration: "none", boxShadow: "0 8px 20px rgba(220,38,38,0.35)" }}>
          爆踊をはじめる
        </a>
      </section>

      {/* フッター */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: "20px" }}>
        <div style={{ maxWidth: "1040px", margin: "0 auto", padding: "24px 20px", display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "'Noto Sans JP',sans-serif" }}>© 爆踊</span>
          <div style={{ display: "flex", gap: "18px" }}>
            <a href={`${APP_URL}/help`} style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans JP',sans-serif", textDecoration: "none" }}>使い方ガイド</a>
            <a href={`${APP_URL}/privacy`} style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans JP',sans-serif", textDecoration: "none" }}>プライバシーポリシー</a>
            <a href={`${APP_URL}/terms`} style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans JP',sans-serif", textDecoration: "none" }}>利用規約</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
