import type { Metadata } from "next";

// アプリを知らない人向けの紹介ページ（ランディングページ）。
// ログイン不要で見られる静的ページ。「はじめる」ボタンからアプリ本体（/）のログイン画面へ送る。
// 書いてある機能は /help の使い方ガイドと同じ内容に揃えている。機能を足したらここも更新する。

export const metadata: Metadata = {
  title: "爆踊 | ストリートダンサーのためのコミュニティアプリ",
  description: "サイファーの開催・参加、レッスンやイベントの告知、振付作品の出演者募集まで。ダンサーが集まり・つながるための無料アプリ「爆踊」。",
  openGraph: {
    title: "爆踊 | 今日、ここで、踊ろう。",
    description: "サイファーの開催・参加、レッスンやイベントの告知、振付作品の出演者募集まで。ダンサーが集まり・つながるための無料アプリ。",
    siteName: "爆踊",
    images: ["https://bakuodo.vercel.app/logo.jpg"],
    type: "website",
  },
};

const FONT = "'Noto Sans JP',sans-serif";

// ホーム画面のタブと同じ色（TopScreen.tsx の SECTION_COLOR）を使い、アプリと見た目を揃える
const FEATURES = [
  { key: "CYPHER", color: "#DC2626", title: "サイファー", body: "即興で踊り合うサイファーを、最寄り駅と日付だけでサクッと募集。深夜をまたぐセッションも、フォロワー限定・参加承認制もOK。" },
  { key: "LESSON", color: "#2563EB", title: "プライベートレッスン", body: "料金・対象レベル・定員を決めてレッスンを告知。申し込みの受付から承認まで、アプリの中で完結します。" },
  { key: "EVENT", color: "#EAB308", title: "イベント", body: "バトルやショーケースを告知。JUDGE・DJ・MCも載せられて、終わったあとは当日の写真を「振り返り」として残せます。" },
  { key: "NUMBER", color: "#EC4899", title: "振付作品の出演者募集", body: "発表会やイベントに向けたナンバーの出演者を募集。練習期間・募集人数・募集期限を決めて投稿できます。" },
  { key: "SPOTS", color: "#16A34A", title: "聖地スポット", body: "安田ビル前、湘南台駅地下……ダンサーが集まる場所に今だれがいるかをリアルタイムで確認。「ここにいる！」でチェックイン。" },
  { key: "COMMUNITY", color: "#F0F0F0", title: "マイコミュニティ", body: "チームの練習日程・出欠（○△×）・担当パートをまとめて管理。LINEで流れがちな連絡を、ひとつの掲示板に。" },
];

const SPOTS = ["安田", "湘南台", "代々木", "中野", "横浜", "溝口"];

const STEPS = [
  { n: "01", title: "ログイン", body: "GoogleアカウントかメールアドレスでOK。無料です。" },
  { n: "02", title: "さがす", body: "タブを切り替えて、近くのサイファーやレッスンを見つける。" },
  { n: "03", title: "踊る", body: "「参加する」を押して、現場へ。自分で開催するのも「＋」ボタンから。" },
];

// 「はじめる」ボタン。ページ内で2回使うので同じ見た目にする
function StartButton() {
  return (
    <a href="/" style={{ display: "inline-block", padding: "16px 40px", borderRadius: "999px", background: "linear-gradient(135deg, #F59E0B, #DC2626)", color: "#FFFFFF", fontFamily: FONT, fontWeight: 700, fontSize: "15px", letterSpacing: "0.15em", textDecoration: "none", boxShadow: "0 8px 32px rgba(220,38,38,0.35)" }}>
      無料ではじめる →
    </a>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: "11px", fontFamily: FONT, letterSpacing: "0.25em", color: "#F59E0B", marginBottom: "12px" }}>▶ {children}</div>;
}

export default function AboutPage() {
  return (
    <div style={{ background: "#000000", color: "#F0F0F0", fontFamily: FONT, minHeight: "100vh", overflowX: "hidden" }}>
      {/* スマホは1列、PCは2〜3列に並べるための最小限のCSS。インラインstyleではメディアクエリが書けないためここだけ<style>を使う */}
      <style>{`
        .ab-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        .ab-spots { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        @media (min-width: 720px) {
          .ab-grid { grid-template-columns: repeat(2, 1fr); }
          .ab-spots { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1024px) {
          .ab-grid.ab-3 { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>

      {/* ── ヒーロー（最初に目に入る部分） ── */}
      <section style={{ position: "relative", padding: "72px 20px 88px", textAlign: "center", background: "radial-gradient(ellipse at 50% 30%, rgba(245,158,11,0.18), rgba(220,38,38,0.08) 40%, transparent 70%)" }}>
        {/* ロゴは元画像に余白があるので、Logo.tsx と同じく少し拡大して丸く切り抜く */}
        <span style={{ width: "144px", height: "144px", borderRadius: "50%", overflow: "hidden", display: "inline-block", lineHeight: 0, boxShadow: "0 0 60px rgba(245,158,11,0.35)" }}>
          <img src="/logo.jpg" alt="爆踊" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.15)", display: "block" }} />
        </span>
        <p style={{ margin: "28px 0 0", fontSize: "12px", letterSpacing: "0.3em", color: "#F59E0B" }}>BAKUODO — ばくおど</p>
        <h1 style={{ margin: "12px 0 0", fontFamily: "'RocknRoll One',sans-serif", fontWeight: 400, fontSize: "clamp(34px, 8vw, 60px)", lineHeight: 1.25 }}>
          今日、ここで、<br />踊ろう。
        </h1>
        <p style={{ margin: "20px auto 0", maxWidth: "520px", fontSize: "15px", lineHeight: 1.9, color: "rgba(240,240,240,0.85)" }}>
          爆踊は、ストリートダンサーのための無料コミュニティアプリ。<br />
          サイファーを開きたい人と、踊りたい人をつなぎます。
        </p>
        <div style={{ marginTop: "36px" }}><StartButton /></div>
        <p style={{ margin: "14px 0 0", fontSize: "11px", color: "rgba(240,240,240,0.5)" }}>ブラウザですぐ使えます・登録無料</p>
      </section>

      <main style={{ maxWidth: "1040px", margin: "0 auto", padding: "0 20px" }}>
        {/* ── 爆踊とは ── */}
        <section style={{ padding: "56px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Label>ABOUT</Label>
          <h2 style={{ margin: 0, fontSize: "clamp(22px, 4.5vw, 32px)", fontWeight: 900, lineHeight: 1.5 }}>
            「どこで踊ってる？」を、<br />アプリひとつで。
          </h2>
          <p style={{ margin: "18px 0 0", maxWidth: "640px", fontSize: "14px", lineHeight: 2, color: "rgba(240,240,240,0.85)" }}>
            サイファーの情報は、これまでSNSや口コミに散らばっていました。
            爆踊なら、今日どこで誰が踊っているかがひと目でわかります。
            サイファーの開催・参加から、レッスンやイベントの告知、振付作品の出演者募集、チームの練習管理まで。
            ダンサーが集まり・つながるための機能を、ひとつにまとめました。
          </p>
        </section>

        {/* ── 機能紹介 ── */}
        <section style={{ padding: "56px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Label>FEATURES</Label>
          <h2 style={{ margin: "0 0 28px", fontSize: "clamp(22px, 4.5vw, 32px)", fontWeight: 900 }}>できること</h2>
          <div className="ab-grid ab-3">
            {FEATURES.map(f => (
              <div key={f.key} style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)", borderTop: `3px solid ${f.color}`, borderRadius: "10px", padding: "20px 20px 22px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", color: f.color }}>{f.key}</div>
                <h3 style={{ margin: "6px 0 10px", fontSize: "17px", fontWeight: 700 }}>{f.title}</h3>
                <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.85, color: "rgba(240,240,240,0.8)" }}>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 聖地スポット（アプリのSPOTSタブで使っている写真をそのまま使う） ── */}
        <section style={{ padding: "56px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Label>SPOTS</Label>
          <h2 style={{ margin: "0 0 10px", fontSize: "clamp(22px, 4.5vw, 32px)", fontWeight: 900 }}>あの聖地に、今だれがいる？</h2>
          <p style={{ margin: "0 0 24px", fontSize: "14px", lineHeight: 1.9, color: "rgba(240,240,240,0.8)" }}>
            ホストがいなくても、いつでも開いている練習場所。チェックインすれば、行く前に様子がわかります。
          </p>
          <div className="ab-spots">
            {SPOTS.map(name => (
              <div key={name} style={{ position: "relative", aspectRatio: "4 / 3", borderRadius: "10px", overflow: "hidden", backgroundImage: `linear-gradient(transparent 45%, rgba(0,0,0,0.85)), url(/${encodeURIComponent(name)}.jpg)`, backgroundSize: "cover", backgroundPosition: "center" }}>
                <span style={{ position: "absolute", left: "12px", bottom: "10px", fontSize: "14px", fontWeight: 700 }}>{name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── はじめかた ── */}
        <section style={{ padding: "56px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Label>HOW TO START</Label>
          <h2 style={{ margin: "0 0 28px", fontSize: "clamp(22px, 4.5vw, 32px)", fontWeight: 900 }}>はじめかたは、3ステップ</h2>
          <div className="ab-grid ab-3">
            {STEPS.map(s => (
              <div key={s.n} style={{ padding: "4px 0" }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontWeight: 900, fontSize: "44px", lineHeight: 1, background: "linear-gradient(135deg, #F59E0B, #DC2626)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{s.n}</div>
                <h3 style={{ margin: "10px 0 6px", fontSize: "17px", fontWeight: 700 }}>{s.title}</h3>
                <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.85, color: "rgba(240,240,240,0.8)" }}>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 最後の呼びかけ ── */}
        <section style={{ padding: "72px 0 80px", borderTop: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
          <h2 style={{ margin: "0 0 28px", fontFamily: "'RocknRoll One',sans-serif", fontWeight: 400, fontSize: "clamp(24px, 5vw, 36px)" }}>さあ、踊りにいこう。</h2>
          <StartButton />
        </section>
      </main>

      {/* ── フッター ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "28px 20px 40px", textAlign: "center", fontSize: "12px", color: "rgba(240,240,240,0.55)" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap", marginBottom: "14px" }}>
          <a href="/help" style={{ color: "inherit" }}>使い方ガイド</a>
          <a href="/terms" style={{ color: "inherit" }}>利用規約</a>
          <a href="/privacy" style={{ color: "inherit" }}>プライバシーポリシー</a>
        </div>
        © 爆踊
      </footer>
    </div>
  );
}
