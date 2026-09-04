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
  ios: {
    contentInset: "automatic",
  },
};

export default config;
