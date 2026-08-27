"use client";
import type { GenreKey } from "../lib/types";
import { GENRE_COLORS } from "../lib/constants";

export function GenreBadge({ genre, size = "sm" }: { genre: GenreKey; size?: "sm" | "md" }) {
  const color = GENRE_COLORS[genre];
  return (
    <span style={{ border: "none", color: `color-mix(in srgb, ${color} 100%, black 35%)`, fontSize: size === "sm" ? "10px" : "12px", padding: size === "sm" ? "2px 8px" : "4px 12px", borderRadius: "20px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap", background: `linear-gradient(180deg, color-mix(in srgb, ${color} 55%, white 45%), color-mix(in srgb, ${color} 55%, white 15%))`, boxShadow: `0 2px 5px ${color}33, inset 0 1px 0 rgba(255,255,255,0.5)` }}>
      {genre}
    </span>
  );
}
