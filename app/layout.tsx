import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastHost } from "./components/Toast";

export const metadata: Metadata = {
  title: "爆踊 | 今日、ここで、踊ろう。",
  description: "ダンサーがサイファーを募集・参加できるマッチングアプリ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // iPhoneアプリで画面いっぱい（カメラ・時計の部分まで）に描くため。カメラの下に来てほしい中身は
  // .bd-safe-top（globals.css）でその分の余白を取る。ブラウザの縦画面では余白は0なので見た目は変わらない
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* 900は日付バッジの太字表示用、Playfair Displayはカード背景のジャンル文字用、
            RocknRoll Oneは画面タイトル（「フォロー中」など）用に追加 */}
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&family=Playfair+Display:ital,wght@0,900;1,900&family=RocknRoll+One&display=swap" rel="stylesheet" />
      </head>
      <body>{children}<ToastHost /></body>
    </html>
  );
}