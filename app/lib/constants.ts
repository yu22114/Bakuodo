import type { GenreKey } from "./types";

// スポットのチェックイン有効時間（時間）— ここを変えるだけで全体に反映
export const SPOT_CHECKIN_HOURS = 3;

// チェックインを許可する最大距離（メートル）
export const SPOT_CHECKIN_RADIUS_M = 500;

// 2点間の距離をメートルで返す（Haversine公式）
export function calcDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

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

// CYPHER=#FF3D00 / LESSON=#2563EB / SPOTS=#16A34A（TopScreenのセクションタブ色）とは
// 意味の異なる塊なので、ジャンル色に同じ色を使わないようにしている
export const GENRE_COLORS: Record<GenreKey, string> = {
  Breaking: "#DB2777",
  Popping: "#0891B2",
  Locking: "#D97706",
  Waacking: "#A855F7",
  House: "#0D9488",
  Krump: "#EA580C",
  "Hip-Hop": "#4338CA",
  "All Style": "#6B7280",
};

// 30分刻みの全時間（00:00〜23:30）
export const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
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

// 開始時間の選択肢（00:00〜23:30。表示はフォーム側で初期値9:00から始める）
export const START_TIME_OPTIONS = TIME_OPTIONS;

// 開始時刻の初期値（開くと9:00が見える。上スクロールで早朝、下スクロールで以降も選べる）
export const DEFAULT_START_TIME = "09:00";

// 終了が「翌日」かどうかを開始時刻基準で判定（開始以下の時刻＝翌日。最大24時間）
export function isNextDayEnd(end: string, start: string): boolean {
  if (!end || !start) return false;
  return end <= start;
}

// 終了時間の選択肢を開始時刻基準で並べる（当日＝開始より後 → 翌日＝00:00〜開始まで＝最大24h）
export function endTimeOptions(start: string): string[] {
  if (!start) return TIME_OPTIONS;
  const sameDay = TIME_OPTIONS.filter(t => t > start);
  const nextDay = TIME_OPTIONS.filter(t => t <= start);
  return [...sameDay, ...nextDay];
}

// 終了時間セレクトのラベル（翌日なら「翌」を付ける）
export function endTimeLabel(t: string, start: string): string {
  return isNextDayEnd(t, start) ? `翌${t}` : t;
}

// 日付文字列(YYYY-MM-DD)の翌日を返す
export function getNextDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(y, m - 1, d + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

// 翌日またぎの終了時刻表示（カード・詳細モーダル用）
export function formatEndTime(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  const timeStr = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  return endDay > startDay ? `翌${timeStr}` : timeStr;
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
