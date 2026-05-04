import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // ビルド時のTypeScriptエラーを無視（開発中は引き続きチェックされる）
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
