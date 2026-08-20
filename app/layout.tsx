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
        {/* 900は日付バッジの太字表示用、Permanent Markerはカード背景のジャンル文字（筆書き風）用に追加 */}
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&family=Permanent+Marker&display=swap" rel="stylesheet" />
      </head>
      <body>{children}<ToastHost /></body>
    </html>
  );
}