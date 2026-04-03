export function formatDate(iso: string) {
  const d = new Date(iso);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return {
    date: `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`,
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}

export function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - new Date().getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}日後`;
  if (h > 0) return `${h}時間後`;
  return "まもなく";
}
