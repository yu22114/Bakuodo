import type { GenreKey } from "./types";

export const GENRES: GenreKey[] = [
  "Breaking",
  "Popping",
  "Locking",
  "Waacking",
  "House",
  "Krump",
  "Hip-Hop",
  "All Style",
];

export const GENRE_COLORS: Record<GenreKey, string> = {
  Breaking: "#FF3D00",
  Popping: "#0891B2",
  Locking: "#D97706",
  Waacking: "#A855F7",
  House: "#16A34A",
  Krump: "#EA580C",
  "Hip-Hop": "#2563EB",
  "All Style": "#6B7280",
};

// 6時始まりで30分刻み（6:00〜5:30）
export const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = (Math.floor(i / 2) + 6) % 24;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export function formatDate(iso: string) {
  const d = new Date(iso);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return {
    date: `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`,
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}

// 開催日を過ぎていたら「終了」を返す
export function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - new Date().getTime();
  if (diff < 0) return "終了";
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}日後`;
  if (h > 0) return `${h}時間後`;
  return "まもなく";
}
