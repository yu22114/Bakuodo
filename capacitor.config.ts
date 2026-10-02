import type { CapacitorConfig } from "@capacitor/cli";

// Bakuodo(爆踊)のiOSアプリ設定。
// ネイティブアプリの中身は空にせず、本番のVercelサイト(server.url)をそのまま表示させる方式。
// → コンテンツ・機能の更新は今まで通り git push だけで即反映され、Appleの再審査は不要。
// → アプリアイコン変更やネイティブ機能の追加など「殻」自体を変える時だけ、再ビルド・再審査が必要になる。
const config: CapacitorConfig = {
  appId: "com.bakuodo.app",
  appName: "爆踊",
  webDir: "public",
  server: {
    url: "https://bakuodo.vercel.app",
    cleartext: false,
  },
  // 画面上部（時計・電池の部分）と下部の余白が白く見えないよう、爆踊の背景と同じ黒にする
  backgroundColor: "#000000",
  ios: {
    // iPhone側で上下に余白を自動で足さない（足すと、その分だけ画面全体が上下にずれて、
    // 背景の外側が見えてしまう）。カメラ・時計の部分の余白はWeb側（.bd-safe-top）で取る
    contentInset: "never",
  },
};

export default config;
