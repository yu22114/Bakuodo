"use client";
import { GENRE_COLORS, GENRES } from "../lib/constants";

// genreは固定ジャンル一覧（GenreKey）に加えて、プロフィール編集の「その他」で
// 自由記入された文字列も来る。その場合は色を持たないので白バッジにする
export function GenreBadge({ genre, size = "sm" }: { genre: string; size?: "sm" | "md" }) {
  const isCustomGenre = !(GENRES as readonly string[]).includes(genre);
  if (isCustomGenre) {
    return (
      <span style={{ border: "1px solid rgba(255,255,255,0.5)", color: "#fff", fontSize: size === "sm" ? "10px" : "12px", padding: size === "sm" ? "2px 8px" : "4px 12px", borderRadius: "20px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap", background: "rgba(255,255,255,0.12)" }}>
        {genre}
      </span>
    );
  }
  const color = (GENRE_COLORS as Record<string, string>)[genre];
  return (
    <span style={{ border: "none", color: `color-mix(in srgb, ${color} 100%, black 35%)`, fontSize: size === "sm" ? "10px" : "12px", padding: size === "sm" ? "2px 8px" : "4px 12px", borderRadius: "20px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap", background: `linear-gradient(180deg, color-mix(in srgb, ${color} 55%, white 45%), color-mix(in srgb, ${color} 55%, white 15%))`, boxShadow: `0 2px 5px ${color}33, inset 0 1px 0 rgba(255,255,255,0.5)` }}>
      {genre}
    </span>
  );
}
