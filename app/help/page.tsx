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
        <div style={{ fontSize: "10px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.35)", letterSpacing: "0.2em", marginBottom: "8px" }}>▶ HELP</div>
        <h1 style={{ margin: 0, fontFamily: "'Bebas Neue',sans-serif", fontSize: "36px", color: "#111111" }}>使い方ガイド</h1>
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "rgba(0,0,0,0.4)", fontFamily: "'Space Mono',monospace" }}>爆踊のつかいかた</p>
      </div>

      {section("爆踊とは", [
        {
          q: "爆踊ってなに？",
          a: "サイファーを開催したい人と参加したい人をつなぐサービスです。\n「今日どこかで踊りたい」「仲間を集めてセッションしたい」そんなダンサーのための場所です。",
        },
      ])}

      {section("サイファーを作る", [
        {
          q: "サイファーの作り方",
          a: "画面下の「＋」ボタンからサイファーを作成できます。\n最寄り駅と日付だけ入力すれば投稿できます。スタジオ名・ジャンル・定員は任意です。",
        },
        {
          q: "イベント名を設定しないとどうなる？",
          a: "空欄のままにすると、最寄り駅名が自動でイベント名になります。",
        },
        {
          q: "深夜のセッションはどう入力する？",
          a: "終了時間に「翌00:00」〜「翌05:30」が選べます。\n例：22:00スタート〜翌02:00終了のように設定できます。",
        },
      ])}

      {section("サイファーに参加する", [
        {
          q: "参加の仕方",
          a: "カードをタップして詳細を開き、「このサイファーに参加する」ボタンを押すだけです。",
        },
        {
          q: "参加をキャンセルしたい",
          a: "参加済みのサイファーの詳細を開き、「参加済み — キャンセルする」ボタンを押すと確認画面が出ます。",
        },
        {
          q: "定員がある場合",
          a: "定員に達したサイファーには参加できません。カードに満員の表示が出ます。",
        },
      ])}

      {section("絞り込みと検索", [
        {
          q: "ジャンルで絞り込みたい",
          a: "トップ画面の「ジャンル」タブを選んで、見たいジャンルのチップをタップします。",
        },
        {
          q: "今日・明日のサイファーだけ見たい",
          a: "「日程」タブを選んで「今日」または「明日」を選択してください。",
        },
        {
          q: "場所で絞り込みたい",
          a: "「エリア」タブを選ぶと、開催エリアの一覧が表示されます。",
        },
      ])}

      {section("プロフィール", [
        {
          q: "ダンサーネームを変えたい",
          a: "プロフィール画面右上の編集ボタンから変更できます。大文字・小文字・日本語どちらでも入力可能です。",
        },
        {
          q: "アイコン写真を設定したい",
          a: "プロフィール編集画面のアバター画像をタップすると、カメラロールから写真を選べます。",
        },
      ])}

      {section("フォロー", [
        {
          q: "フォローするとどうなる？",
          a: "フォローしているホストのサイファーが、トップ画面の上位に優先表示されます。",
        },
      ])}

      {section("その他", [
        {
          q: "場所はどこで確認できる？",
          a: "カードの場所名をタップするとGoogle マップが開きます。",
        },
        {
          q: "通知が来ない",
          a: "現在の通知はアプリ内のみです。ベルアイコンから確認できます。",
        },
      ])}

      <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid rgba(0,0,0,0.08)", textAlign: "center" }}>
        <a href="/" style={{ fontSize: "12px", fontFamily: "'Space Mono',monospace", color: "#FF3D00", textDecoration: "none" }}>← アプリに戻る</a>
      </div>
    </div>
  );
}
