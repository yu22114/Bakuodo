export default function TermsPage() {
  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "32px 20px 80px", fontFamily: "'Noto Sans JP', sans-serif", color: "#111111", background: "#FAFAFA", minHeight: "100vh" }}>
      <div style={{ marginBottom: "32px" }}>
        <div style={{ fontSize: "10px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.35)", letterSpacing: "0.2em", marginBottom: "8px" }}>▶ LEGAL</div>
        <h1 style={{ margin: 0, fontFamily: "'Bebas Neue',sans-serif", fontSize: "36px", color: "#111111" }}>利用規約</h1>
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "rgba(0,0,0,0.4)", fontFamily: "'Space Mono',monospace" }}>最終更新: 2025年6月</p>
      </div>

      {[
        {
          title: "第1条（サービスの目的）",
          body: "爆踊（以下「本サービス」）は、ダンサー同士がサイファーやプライベートレッスンを通じてつながるためのコミュニティサービスです。サイファーの開催・参加、プライベートレッスンの告知・申し込み、聖地スポットのリアルタイム情報共有などの機能を提供します。",
        },
        {
          title: "第2条（利用条件）",
          body: "本サービスはGoogleアカウントによる認証を必要とします。アカウント登録をもって本規約に同意したものとみなします。",
        },
        {
          title: "第3条（禁止事項）",
          body: "以下の行為を禁止します。\n・虚偽の情報の登録（実在しない場所・日時でのサイファー投稿など）\n・他のユーザーへの迷惑行為・誹謗中傷\n・なりすまし行為\n・スポットのチェックイン機能を不正に使用する行為（実際にいない場所へのチェックインなど）\n・本サービスの運営を妨害する行為\n・その他、法令または公序良俗に反する行為",
        },
        {
          title: "第4条（コンテンツの責任）",
          body: "ユーザーが投稿したサイファー情報・レッスン情報・プロフィール情報の内容については、投稿者が責任を負います。当サービスは投稿内容の正確性・安全性を保証しません。",
        },
        {
          title: "第5条（位置情報の利用）",
          body: "本サービスは、スポットへのチェックイン認証および現在地検索のためにデバイスの位置情報を利用する場合があります。位置情報の利用はユーザーの許可を得た場合のみ行われます。取得した位置情報はチェックイン処理・検索のためにのみ使用し、サーバーに保存・記録することはありません。",
        },
        {
          title: "第6条（プライベートレッスンの料金）",
          body: "プライベートレッスンの料金はレッスンを提供するダンサーが設定します。料金の支払いはユーザー間で直接行われるものとし、当サービスは料金の徴収・管理・保証を行いません。料金に関するトラブルは当事者間で解決してください。",
        },
        {
          title: "第7条（免責事項）",
          body: "本サービスを通じて成立したサイファー・プライベートレッスン・スポットでの活動において発生した事故・怪我・トラブル・金銭的損害等について、当サービスは一切の責任を負いません。参加者同士での解決をお願いします。",
        },
        {
          title: "第8条（サービスの変更・停止）",
          body: "当サービスは、予告なくサービス内容の変更・機能の追加・削除・サービスの停止を行う場合があります。",
        },
        {
          title: "第9条（プライバシー）",
          body: "取得した個人情報（メールアドレス・プロフィール情報等）はサービス提供の目的のみに使用し、第三者への提供は行いません。認証・データベースにはSupabaseを利用しており、Supabaseのプライバシーポリシーが適用されます。",
        },
        {
          title: "第10条（規約の変更）",
          body: "本規約は予告なく変更される場合があります。変更後も継続して本サービスを利用した場合、変更後の規約に同意したものとみなします。",
        },
      ].map(s => (
        <section key={s.title} style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px", color: "#111111" }}>{s.title}</h2>
          <p style={{ fontSize: "13px", lineHeight: "1.8", color: "rgba(0,0,0,0.7)", margin: 0, whiteSpace: "pre-line" }}>{s.body}</p>
        </section>
      ))}

      <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid rgba(0,0,0,0.08)", textAlign: "center" }}>
        <a href="/" style={{ fontSize: "12px", fontFamily: "'Space Mono',monospace", color: "#FF3D00", textDecoration: "none" }}>← アプリに戻る</a>
      </div>
    </div>
  );
}
