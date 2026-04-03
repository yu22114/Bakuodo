import type { GenreKey } from "./types";

export const GENRES: GenreKey[] = ["Breaking", "Popping", "Locking", "Waacking", "Voguing", "House", "Krump", "Hip-Hop"];

export const GENRE_COLORS: Record<GenreKey, string> = {
  Breaking: "#FF3D00",
  Popping: "#00E5FF",
  Locking: "#FFD600",
  Waacking: "#E040FB",
  Voguing: "#FF4081",
  House: "#69FF47",
  Krump: "#FF6D00",
  "Hip-Hop": "#40C4FF",
};
