"use client";

export default function PrivacyPage() {
  const CONTACT_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdtORTcN86YUDCwq_v8f300PtwnmUENTAvGXs8AYvVS50IyGA/viewform";

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "32px 20px 80px", fontFamily: "'Noto Sans JP', sans-serif", color: "#F0F0F0", background: "#000000", minHeight: "100vh" }}>
      <div style={{ marginBottom: "28px" }}>
        {/* 元いた画面（プロフィールなど）へ戻す。href="/"だとホーム画面に飛んでしまうため、
            ブラウザの履歴を1つ戻すことで、開く前の画面（多くはプロフィール）に復帰させる */}
        <button onClick={() => window.history.back()} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", padding: "10px 16px", marginBottom: "20px", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "600", color: "#F0F0F0", cursor: "pointer" }}>← 戻る</button>
        <div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.2em", marginBottom: "8px" }}>▶ LEGAL</div>
        <h1 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "36px", color: "#F0F0F0" }}>プライバシーポリシー</h1>
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>最終更新: 2026年9月3日</p>
      </div>

      {/* 前文 */}
      <p style={{ fontSize: "13px", lineHeight: "1.8", color: "#F0F0F0", margin: "0 0 28px", whiteSpace: "pre-line" }}>
        {"本プライバシーポリシー（以下「本ポリシー」といいます。）は、サイファー募集アプリ「爆踊」（以下「本サービス」といいます。）が、ユーザーの情報をどのように取得・利用・管理するかを定めるものです。\nユーザーは、本サービスを利用することにより、本ポリシーに同意したものとみなされます。"}
      </p>

      {[
        {
          title: "第1条（取得する情報）",
          body: "本サービスは、ユーザーから以下の情報を取得します。\n\n＜アカウント情報＞\n・メールアドレス（Googleログインまたはメールアドレス登録時）\n・パスワード（メールアドレスで登録した場合。運営者が読み取れない形で保存されます）\n\n＜プロフィール情報＞\n・ダンサーネーム、アイコン画像、得意ジャンル、Instagramアカウント、ダンス歴、年代、生年、性別、自己紹介、プレイリストURL、所属チーム等、ユーザーが任意で登録する情報\n\n＜投稿・利用に関する情報＞\n・サイファー、レッスン、イベント、NUMBER、コミュニティ掲示板等の投稿内容、添付画像、コメント\n・参加申請時にユーザーが入力する情報（ダンサーネーム、メールアドレス、電話番号、Instagramアカウント等。募集内容によって項目は異なります）\n・フォロー関係、「気になる」等の操作履歴、通知の既読状態",
        },
        {
          title: "第2条（利用目的）",
          body: "取得した情報は、以下の目的で利用します。\n・本サービスの提供、維持、改善\n・ユーザー間のマッチング（サイファー・レッスン・イベント等の募集と参加）\n・本人確認、不正利用の防止\n・お問い合わせへの対応\n・利用規約に違反する投稿・ユーザーへの対応\n・重要なお知らせの通知（開催リマインド等）",
        },
        {
          title: "第3条（第三者への提供）",
          body: "運営者は、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供しません。\n・法令に基づく場合\n・人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき\n・国の機関等が法令の定める事務を遂行することに協力する必要がある場合\n\nなお、ユーザーが投稿した内容（ダンサーネーム、プロフィール、募集内容等）は、本サービスの性質上、他のユーザーから閲覧できる状態で公開されます。",
        },
        {
          title: "第4条（外部サービスの利用）",
          body: "本サービスは、以下の外部サービスを利用してデータの保存・処理を行っています。各サービスの利用にあたっては、それぞれのプライバシーポリシーが適用されます。\n\n・Supabase（データベース、認証、画像等の保存）\n・Google（Googleアカウントでのログイン機能）\n・Vercel（アプリの配信・ホスティング）\n\n本サービスは、広告配信や分析を目的とした第三者のトラッキングツール（Google Analytics等）は使用していません。",
        },
        {
          title: "第5条（Cookie等の利用）",
          body: "本サービスは、ログイン状態を保つために、ブラウザまたはアプリ内にログイン情報（アクセストークン）を保存します。これは本サービスの利用に必要な範囲でのみ使用され、広告目的では使用しません。",
        },
        {
          title: "第6条（位置情報について）",
          body: "本サービスは、端末の位置情報（GPS）を取得・利用しません。練習場所やイベント会場の情報は、ユーザーまたは運営者が入力したテキスト情報として扱われます。",
        },
        {
          title: "第7条（未成年者の利用）",
          body: "未成年のユーザーは、保護者の同意を得た上で本サービスを利用し、個人情報を登録するものとします。",
        },
        {
          title: "第8条（安全管理措置）",
          body: "運営者は、取得した情報の漏えい、滅失またはき損の防止その他の安全管理のために、必要かつ適切な措置を講じます。パスワードは運営者が読み取れない形で保存され、データへのアクセスは必要な範囲に制限されています。",
        },
        {
          title: "第9条（開示・訂正・削除等の請求）",
          body: "ユーザーは、自己の登録情報について、アプリ内のプロフィール編集画面から確認・訂正できます。\nアカウントおよび登録情報の削除を希望する場合は、アプリ内の手続き、またはお問い合わせ窓口からご連絡ください。運営者は、本人確認の上、法令に従い速やかに対応します。",
        },
        {
          title: "第10条（本ポリシーの変更）",
          body: "運営者は、必要と判断した場合、本ポリシーを変更することができます。変更後のポリシーは、本サービス内に掲載した時点から効力を生じます。",
        },
      ].map(s => (
        <section key={s.title} style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px", color: "#F0F0F0" }}>{s.title}</h2>
          <p style={{ fontSize: "13px", lineHeight: "1.8", color: "#F0F0F0", margin: 0, whiteSpace: "pre-line" }}>{s.body}</p>
        </section>
      ))}

      {/* サービス情報 */}
      <div style={{ marginTop: "8px", padding: "16px", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#F0F0F0", minWidth: "84px" }}>サービス名</span>
          <span style={{ fontSize: "13px", color: "#F0F0F0" }}>爆踊</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#F0F0F0", minWidth: "84px" }}>お問い合わせ先</span>
          <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" style={{ fontSize: "13px", color: "#DC2626", textDecoration: "underline", wordBreak: "break-all" }}>お問い合わせフォーム</a>
        </div>
      </div>

      <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
        <a href="/" style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "#DC2626", textDecoration: "none" }}>← アプリに戻る</a>
      </div>
    </div>
  );
}
