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

// ジャンル選択のトグル。カードの背景にジャンル名を大きく出すようになったので、
// 選べるのは1つだけ。選んでいるものをもう一度押すと解除。
// 返り値が配列なのは、保存側（cypher_genres / pl_genres）が複数行を入れる作りのまま
// 触らずに済むため。投稿フォーム・編集フォーム共通
export function toggleGenre<T extends string>(list: T[], g: T): T[] {
  return list[0] === g ? [] : [g];
}

// 「3日前」「2時間前」のような経過時間。コメントの投稿時刻に使う
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}日前`;
  if (h > 0) return `${h}時間前`;
  if (min > 0) return `${min}分前`;
  return "たった今";
}

// 短い表示名（Breaking → Break のように ing を落とす）。絞り込みチップと投稿フォームで使う。
// DBに入っている名前は変えず、見た目だけ短くする。
// ing を取ったあとに同じ字が2つ続いたら1つに戻す（Popping → Popp ではなく Pop にするため）。
// 縮めるのは ing で終わる名前だけ。そうしないと絞り込みチップの「ALL」が「AL」になる
export function genreLabel(g: string): string {
  if (!g.endsWith("ing")) return g;
  return g.slice(0, -3).replace(/(.)\1$/, "$1");
}

// CYPHER=#DC2626 / LESSON=#2563EB / SPOTS=#16A34A（TopScreenのセクションタブ色）とは
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

// カード左のチケット風日付表示用（月・日・曜日を別々に返す）
export function dateBadgeParts(iso: string) {
  const d = new Date(iso);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return { month: d.getMonth() + 1, day: d.getDate(), weekday: weekdays[d.getDay()] };
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

// 今日の日付(YYYY-MM-DD、ローカル時間)。<input type="date">のminに渡して過去日を選べなくする
export function todayStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
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

// カードのタイトル横に出す残り日数バッジ用。時間単位は出さず日数だけにする
export function daysUntil(iso: string): string {
  const start = new Date(iso);
  if (start.getTime() < Date.now()) return "終了";
  const today = new Date();
  // 「あと何時間」ではなく「何日後の予定か」を出したいので、カレンダー上の日付差で数える
  const d0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const d1 = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const days = Math.round((d1 - d0) / 86400000);
  if (days <= 0) return "今日";
  if (days === 1) return "明日";
  return `${days}日後`;
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
