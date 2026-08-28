"use client";

// カードの形をしたプレースホルダー。「読み込み中...」の文字よりも、
// 光沢が右へ流れるアニメーション（シマー）の方が「今読み込み中」だと直感的に伝わる。
// keyframesをここに持たせているのはpage.tsx配下だけでなく他のルートからも使うため（Loading.tsxと同じやり方）
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <style>{`@keyframes bdShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{
          height: "84px", borderRadius: "10px",
          border: "0.5px solid rgba(255,255,255,0.16)",
          background: "linear-gradient(90deg, #171717 25%, #262626 37%, #171717 63%)",
          backgroundSize: "400% 100%",
          animation: "bdShimmer 1.6s ease-in-out infinite",
          animationDelay: `${i * 0.08}s`,
        }} />
      ))}
    </div>
  );
}
