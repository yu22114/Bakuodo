"use client";
import { useRef, useState } from "react";

// タブの左右スワイプに「指に追従する動き」と「跳ね返り（バウンス）」を付けるフック。
// - ドラッグ中は指の移動量ぶんだけ中身を一緒に動かす（追従）
// - 閾値を超えて離す＆隣にタブがあれば、そのまま同じ方向へ滑らせ切ってからタブを切り替える
//   （切り替わった後の新しいタブ自身の登場アニメーション（bdSlideFromRight/Left）と合わせて、
//   　1枚が奥へ滑っていき、次の1枚が現れる…という一連の動きに見える）
// - 閾値未満、または端でこれ以上動けない場合は、弾むイージングで元の位置へ戻す
export function useSwipeTabs({ canSwipe, onSwipe }: {
  canSwipe: (dir: 1 | -1) => boolean;
  onSwipe: (dir: 1 | -1) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [transitionMode, setTransitionMode] = useState<"none" | "bounce" | "complete">("none");
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const widthRef = useRef(320);

  const onTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY };
    draggingRef.current = false;
    setTransitionMode("none");
    widthRef.current = e.currentTarget.offsetWidth || 320;
  };

  const onTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    const start = startRef.current;
    if (!start) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (!draggingRef.current) {
      // 横移動が縦移動よりはっきり大きい時だけドラッグ扱いにする（縦スクロールと衝突させない）
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      draggingRef.current = true;
    }
    setOffset(dx);
  };

  const onTouchEnd = () => {
    const start = startRef.current;
    startRef.current = null;
    if (!draggingRef.current || !start) { setOffset(0); return; }
    draggingRef.current = false;
    const dx = offset;
    const dir: 1 | -1 = dx < 0 ? 1 : -1;
    if (Math.abs(dx) >= 60 && canSwipe(dir)) {
      // 慣性っぽく同じ方向へ滑らせ切ってから、タブを切り替える
      setTransitionMode("complete");
      setOffset(dir === 1 ? -widthRef.current : widthRef.current);
      setTimeout(() => {
        onSwipe(dir);
        setTransitionMode("none");
        setOffset(0);
      }, 200);
      return;
    }
    // 閾値未満・または端：弾んで元の位置へ戻る
    setTransitionMode("bounce");
    setOffset(0);
    setTimeout(() => setTransitionMode("none"), 320);
  };

  const style: React.CSSProperties = {
    transform: offset !== 0 ? `translateX(${offset}px)` : undefined,
    transition:
      transitionMode === "bounce" ? "transform 0.32s cubic-bezier(0.34,1.56,0.64,1)" :
      transitionMode === "complete" ? "transform 0.2s cubic-bezier(0.4,0,1,1)" :
      "none",
  };

  return { onTouchStart, onTouchMove, onTouchEnd, style };
}
