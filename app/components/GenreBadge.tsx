import { GENRE_COLORS } from "../../lib/constants";
import type { GenreKey } from "../../lib/types";

export function GenreBadge({ genre, size = "sm" }: { genre: GenreKey; size?: "sm" | "md" }) {
  const color = GENRE_COLORS[genre];
  return (
    <span style={{ border: `1px solid ${color}`, color, fontSize: size === "sm" ? "10px" : "12px", padding: size === "sm" ? "2px 8px" : "4px 12px", borderRadius: "2px", fontFamily: "'Space Mono',monospace", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {genre}
    </span>
  );
}
