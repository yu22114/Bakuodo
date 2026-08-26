"use client";
import { useEffect, useRef, useState } from "react";

// 固定ヘッダーの下に、スクロールして中身が隠れている時だけうっすら影を出すためのフック。
// 「まだ上に続きがある」ことを直感的に伝える。返すrefをスクロールする要素に付ける
export function useScrollShadow<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 4);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  return { ref, scrolled };
}
