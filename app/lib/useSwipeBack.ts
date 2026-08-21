"use client";
import { useRef } from "react";

// 「戻る」ボタンがある画面共通：画面端からの右スワイプで一つ前の画面に戻る（iOSの
// エッジスワイプと同じ考え方）。指のスタート位置を画面左端付近に限定するのは、
// ジャンル選択の横スクロールなど画面内の横スワイプ操作と誤って衝突しないようにするため
export function useSwipeBack(onBack?: () => void) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t.clientX > 24) return; // 端から始まったタッチだけを対象にする
    startRef.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = startRef.current;
    startRef.current = null;
    if (!start || !onBack) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (dx < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return; // 右スワイプだけ拾う
    onBack();
  };

  return { onTouchStart, onTouchEnd };
}
