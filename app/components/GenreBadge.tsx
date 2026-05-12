"use client";
import type { GenreKey } from "../lib/types";
import { GENRE_COLORS } from "../lib/constants";

export function GenreBadge({ genre, size = "sm" }: { genre: GenreKey; size?: "sm" | "md" }) {
  const color = GENRE_COLORS[genre];
  return (
    <span style={{ border: `1px solid ${color}`, color, fontSize: size === "sm" ? "10px" : "12px", padding: size === "sm" ? "2px 8px" : "4px 12px", borderRadius: "3px", fontFamily: "'Space Mono',monospace", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap", background: `${color}12` }}>
      {genre}
    </span>
  );
}
