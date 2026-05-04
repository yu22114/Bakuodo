import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // ビルド時のTypeScript・ESLintエラーを無視（開発中は引き続きチェックされる）
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
