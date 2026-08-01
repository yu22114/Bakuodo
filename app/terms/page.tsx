export default function TermsPage() {
  const CONTACT_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdtORTcN86YUDCwq_v8f300PtwnmUENTAvGXs8AYvVS50IyGA/viewform";

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "32px 20px 80px", fontFamily: "'Noto Sans JP', sans-serif", color: "#111111", background: "#FAFAFA", minHeight: "100vh" }}>
      <div style={{ marginBottom: "28px" }}>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(0,0,0,0.06)", borderRadius: "8px", padding: "10px 16px", marginBottom: "20px", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "600", color: "#111111", textDecoration: "none" }}>← 戻る</a>
        <div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111111", letterSpacing: "0.2em", marginBottom: "8px" }}>▶ LEGAL</div>
        <h1 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "36px", color: "#111111" }}>利用規約</h1>
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif" }}>最終更新: 2026年7月31日</p>
      </div>

      {/* 前文 */}
      <p style={{ fontSize: "13px", lineHeight: "1.8", color: "#111111", margin: "0 0 28px", whiteSpace: "pre-line" }}>
        {"本利用規約（以下「本規約」といいます。）は、サイファー募集アプリ「爆踊」（以下「本サービス」といいます。）の利用条件を定めるものです。\nユーザーは、本サービスを利用することにより、本規約に同意したものとみなされます。"}
      </p>

      {[
        {
          title: "第1条（適用）",
          body: "本規約は、本サービスの利用に関する運営者とユーザーとの間の一切の関係に適用されます。\n運営者が本サービス上で掲載するルール、ガイドライン等は本規約の一部を構成するものとします。",
        },
        {
          title: "第2条（サービス内容）",
          body: "本サービスは、ダンサー同士がサイファー、セッション、練習会、ダンスイベント等の募集および参加を行うためのプラットフォームです。\n運営者は、ユーザーが投稿する情報の正確性、安全性、適法性を保証しません。",
        },
        {
          title: "第3条（利用登録）",
          body: "ユーザーは、真実かつ正確な情報を登録しなければなりません。\n運営者は、以下の場合に利用登録を拒否または取り消すことができます。\n・虚偽の情報を登録した場合\n・本規約に違反した場合\n・過去に利用停止処分を受けた場合\n・その他、運営者が不適切と判断した場合",
        },
        {
          title: "第4条（アカウント管理）",
          body: "ユーザーは自己の責任においてアカウントを管理するものとします。\nアカウントの第三者への譲渡、貸与、売買を禁止します。\nアカウント利用によって生じた損害について、運営者は責任を負いません。",
        },
        {
          title: "第5条（禁止事項）",
          body: "ユーザーは以下の行為を行ってはなりません。\n\n＜ダンスコミュニティに関する禁止事項＞\n・誹謗中傷\n・嫌がらせ\n・差別的表現\n・脅迫行為\n・ストーカー行為\n\n＜募集に関する禁止事項＞\n・ダンスと無関係な募集\n・宗教活動または勧誘\n・ネットワークビジネス勧誘\n・投資勧誘\n・違法行為への勧誘\n\n＜その他禁止事項＞\n・恋愛目的のみでの利用\n・性的な接触を目的とした利用\n・わいせつな投稿\n・不正アクセス\n・サービス妨害\n・なりすまし\n・他人の個人情報の無断掲載\n・法令違反行為",
        },
        {
          title: "第6条（投稿コンテンツ）",
          body: "ユーザーが投稿した文章、画像、動画等の権利は、当該ユーザーに帰属します。\nユーザーは運営者に対し、本サービスの運営、宣伝、改善のために投稿コンテンツを利用する権利を無償で許諾するものとします。\n運営者は、本規約違反の投稿を削除できるものとします。",
        },
        {
          title: "第7条（イベント・サイファー参加）",
          body: "ユーザーは自己責任でサイファー、セッション、練習会、ダンスイベント等に参加するものとします。\n運営者は以下について責任を負いません。\n・怪我\n・事故\n・盗難\n・紛失\n・ユーザー間のトラブル\n・イベント主催者との紛争\nユーザー同士で発生した問題は当事者間で解決するものとします。",
        },
        {
          title: "第8条（未成年者の利用）",
          body: "未成年者は保護者の同意を得た上で本サービスを利用するものとします。\n運営者は未成年者の利用に関して特別な監督義務を負うものではありません。",
        },
        {
          title: "第9条（利用停止等）",
          body: "運営者は、ユーザーが以下のいずれかに該当すると判断した場合、事前通知なく利用停止またはアカウント削除を行うことができます。\n・本規約違反\n・他ユーザーへの迷惑行為\n・不正利用\n・反社会的勢力との関係\n・その他運営者が不適切と判断した場合",
        },
        {
          title: "第10条（サービスの変更・終了）",
          body: "運営者は、ユーザーへの事前通知なく、本サービスの内容変更、停止または終了を行うことができます。",
        },
        {
          title: "第11条（免責事項）",
          body: "運営者は、本サービスが常に利用可能であることを保証しません。\n運営者は、本サービスの利用により生じた損害について、故意または重過失がある場合を除き責任を負いません。\nユーザー間で発生した紛争について、運営者は一切責任を負いません。",
        },
        {
          title: "第12条（規約の変更）",
          body: "運営者は必要と判断した場合、本規約を変更することができます。\n変更後の規約は、本サービス内または運営者が適切と判断する方法で公表した時点から効力を生じます。",
        },
        {
          title: "第13条（準拠法・管轄裁判所）",
          body: "本規約は日本法に準拠します。\n本サービスに関して紛争が生じた場合、運営者所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。",
        },
        {
          title: "特別条件",
          body: "インターネット接続料金、通信料金等はお客様のご負担となります。\n運営者はサービス内容を予告なく変更または終了する場合があります。",
        },
      ].map(s => (
        <section key={s.title} style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px", color: "#111111" }}>{s.title}</h2>
          <p style={{ fontSize: "13px", lineHeight: "1.8", color: "#111111", margin: 0, whiteSpace: "pre-line" }}>{s.body}</p>
        </section>
      ))}

      {/* サービス情報 */}
      <div style={{ marginTop: "8px", padding: "16px", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#111111", minWidth: "84px" }}>サービス名</span>
          <span style={{ fontSize: "13px", color: "#111111" }}>爆踊</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#111111", minWidth: "84px" }}>問い合わせ先</span>
          <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" style={{ fontSize: "13px", color: "#FF3D00", textDecoration: "underline", wordBreak: "break-all" }}>お問い合わせフォーム</a>
        </div>
      </div>

      <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid rgba(0,0,0,0.08)", textAlign: "center" }}>
        <a href="/" style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "#FF3D00", textDecoration: "none" }}>← アプリに戻る</a>
      </div>
    </div>
  );
}
