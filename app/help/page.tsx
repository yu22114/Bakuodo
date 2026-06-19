export default function HelpPage() {
  const section = (title: string, items: { q: string; a: string }[]) => (
    <section style={{ marginBottom: "32px" }}>
      <h2 style={{ fontSize: "11px", fontFamily: "'Space Mono',monospace", letterSpacing: "0.2em", color: "rgba(0,0,0,0.35)", marginBottom: "12px", textTransform: "uppercase" as const }}>▶ {title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {items.map(({ q, a }) => (
          <div key={q} style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px", padding: "14px 16px" }}>
            <p style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: "700", color: "#111111" }}>{q}</p>
            <p style={{ margin: 0, fontSize: "13px", color: "rgba(0,0,0,0.6)", lineHeight: "1.7", whiteSpace: "pre-line" }}>{a}</p>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "32px 20px 80px", fontFamily: "'Noto Sans JP', sans-serif", color: "#111111", background: "#FAFAFA", minHeight: "100vh" }}>
      <div style={{ marginBottom: "32px" }}>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(0,0,0,0.06)", borderRadius: "8px", padding: "10px 16px", marginBottom: "20px", fontSize: "13px", fontFamily: "'Space Mono',monospace", fontWeight: "600", color: "#111111", textDecoration: "none" }}>← 戻る</a>
        <div style={{ fontSize: "10px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.35)", letterSpacing: "0.2em", marginBottom: "8px" }}>▶ HELP</div>
        <h1 style={{ margin: 0, fontFamily: "'Bebas Neue',sans-serif", fontSize: "36px", color: "#111111" }}>使い方ガイド</h1>
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "rgba(0,0,0,0.4)", fontFamily: "'Space Mono',monospace" }}>爆踊のつかいかた</p>
      </div>

      {section("爆踊とは", [
        {
          q: "爆踊ってなに？",
          a: "ダンサーのためのコミュニティアプリです。\nサイファーの開催・参加、プライベートレッスンの告知、聖地スポットのリアルタイム情報など、ダンサーが集まるための機能が揃っています。",
        },
      ])}

      {section("サイファー", [
        {
          q: "サイファーの作り方",
          a: "画面下の「＋」ボタン → CYPHERタブから作成できます。\n最寄り駅と日付だけ入力すれば投稿できます。ジャンル・定員・説明は任意です。",
        },
        {
          q: "深夜をまたぐセッションはどう入力する？",
          a: "終了時間に「翌00:00」〜「翌05:30」が選べます。\n例：22:00スタート〜翌02:00終了のように設定できます。",
        },
        {
          q: "フォロワー限定のサイファーを作りたい",
          a: "作成フォームの「🔒 フォロワー限定」をONにすると、自分をフォローしている人にのみ表示されます。",
        },
        {
          q: "参加者を承認制にしたい",
          a: "「📋 参加承認制」をONにすると、参加希望者から申請が届き、承認・拒否を通知画面から行えます。",
        },
        {
          q: "サイファーに参加する",
          a: "カードをタップして「このサイファーに参加する」を押すだけです。\n承認制の場合は「申請する」になり、主催者の承認後に参加確定します。",
        },
        {
          q: "参加をキャンセルしたい",
          a: "参加済みサイファーの詳細を開き、「参加済み — キャンセルする」を押すと確認画面が出ます。",
        },
      ])}

      {section("プライベートレッスン", [
        {
          q: "プライベートレッスンの作り方",
          a: "「＋」ボタン → LESSONタブから作成できます。\n料金・対象レベル・定員などを設定できます。",
        },
        {
          q: "レッスンを申し込む",
          a: "PLタブからレッスンを探してカードをタップ。「このレッスンを申し込む」ボタンから申し込めます。\n承認制のレッスンは講師の承認後に確定します。",
        },
      ])}

      {section("聖地スポット", [
        {
          q: "スポットってなに？",
          a: "ダンサーが自然と集まる有名な場所（安田ビル前、湘南台駅地下など）のことです。\nホストがいなくても常にオープンな情報として掲載されています。",
        },
        {
          q: "今いる人を確認・チェックインする",
          a: "SPOTSタブで各スポットに今いる人数とメンバーを確認できます。\n実際にその場所にいる時は「ここにいる！」ボタンでチェックインできます。\nチェックインはスポットから500m以内でないとできません。3時間経つと自動でチェックアウトされます。",
        },
        {
          q: "帰るときはどうする？",
          a: "「帰る（チェックアウト）」ボタンを押してください。忘れても3時間で自動退場されます。",
        },
      ])}

      {section("検索・絞り込み", [
        {
          q: "サイファーを絞り込みたい",
          a: "トップ画面の🔍ボタンから検索ドロワーを開けます。\nエリア（部分一致）・日程・ジャンルを組み合わせて絞り込めます。\nフィルター適用中はボタンがオレンジ色になります。",
        },
        {
          q: "近くのサイファーを探したい",
          a: "検索ドロワーの「現在地から検索」ボタンを押すと、現在地のエリア名が自動で入力されます。",
        },
        {
          q: "「新宿」で検索したら西新宿も出る？",
          a: "はい。エリア検索は部分一致なので、「新宿」と入力すると「西新宿」「新宿三丁目」なども全て表示されます。",
        },
      ])}

      {section("フォロー・鍵アカ", [
        {
          q: "フォローするとどうなる？",
          a: "フォローしているホストのサイファーが、トップ画面の上位に優先表示されます。\nまたフォロワー限定のサイファーやレッスンが見えるようになります。",
        },
        {
          q: "鍵アカウントにしたい",
          a: "プロフィール編集の「🔒 鍵アカウント」をONにすると、フォローに承認が必要になります。\n申請が届いたら通知画面から承認・拒否できます。",
        },
      ])}

      {section("プロフィール・その他", [
        {
          q: "プロフィールリンクをシェアしたい",
          a: "プロフィール画面右上のメニュー → 「プロフィールリンクをコピー」でURLをコピーできます。\nInstagramのプロフィールに貼ることで、なりすまし防止にも使えます。",
        },
        {
          q: "アイコン写真を設定したい",
          a: "プロフィール編集画面のアバター画像をタップすると、写真を選べます。",
        },
        {
          q: "場所はどこで確認できる？",
          a: "カードの場所名をタップするとGoogle マップが開きます。",
        },
        {
          q: "通知が来ない",
          a: "現在の通知はアプリ内のみです。ベルアイコンから確認できます。\nフォロー・参加・コメント・承認リクエストなどが届きます。",
        },
      ])}

      <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid rgba(0,0,0,0.08)", textAlign: "center" }}>
        <a href="/" style={{ fontSize: "12px", fontFamily: "'Space Mono',monospace", color: "#FF3D00", textDecoration: "none" }}>← アプリに戻る</a>
      </div>
    </div>
  );
}
