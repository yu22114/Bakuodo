"use client";
import { useState } from "react";
import { Calendar, MapPin, Pencil, Trash2 } from "lucide-react";
import { GENRE_COLORS, genreLabel } from "../lib/constants";
import type { GenreKey } from "../lib/types";

export type Board = {
  id: string; title: string; subtitle: string | null; venue: string | null; genre: GenreKey | null;
  event_date: string | null; event_start_date: string | null; event_end_date: string | null;
  creator_id: string;
  instructors: { id: string; name: string; instagram: string | null }[];
};

// 公演日程を「9/20(日)」のように短く表示する
function formatJaDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`;
}

// マイコミュニティのカード。ホーム画面のCypherCardと同じメタリックな質感・
// ジャンル背景文字のサイズにそろえる。作成者だけ右上に編集・削除ボタンが出る
export function CommunityBoardCard({ board: b, isOwn, onClick, onEdit, onDelete }: {
  board: Board; isOwn: boolean; onClick: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  const color = b.genre ? GENRE_COLORS[b.genre] : "#DC2626";
  const genreText = b.genre ? genreLabel(b.genre).toUpperCase() : "";

  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="bd-glow-card"
      style={{ background: "linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.1) 46%, rgba(255,255,255,0.02) 58%, transparent 72%), linear-gradient(150deg, #2c2c2c 0%, #1a1a1a 25%, #242424 48%, #161616 70%, #282828 100%)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "10px", padding: "18px 18px", cursor: "pointer", transition: "transform 0.25s ease, box-shadow 0.25s ease", transform: hover ? "translateY(-3px)" : "none", position: "relative", overflow: "hidden", boxShadow: (hover ? `0 6px 12px rgba(0,0,0,0.3), 0 18px 36px ${color}26, ` : "0 2px 4px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.2), ") + "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.5)", ["--bd-glow" as any]: `${color}26` } as React.CSSProperties}>
      {/* ジャンルの背景文字。サイズ・位置ともホーム画面のCypherCardと同じ式にそろえる */}
      {b.genre && (
        <div aria-hidden="true" style={{ position: "absolute", right: "14px", bottom: "-8px", fontSize: `${Math.round(Math.min(68, Math.round(360 / genreText.length)) * 1.1)}px`, fontStyle: "italic", fontWeight: 900, fontFamily: "'Playfair Display','Noto Sans JP',sans-serif", letterSpacing: "-0.02em", lineHeight: 1, whiteSpace: "nowrap", color: color + "73", pointerEvents: "none", userSelect: "none" }}>
          {genreText}
        </div>
      )}
      <div style={{ position: "relative" }}>
        {isOwn && (
          <div style={{ position: "absolute", top: 0, right: 0, display: "flex", gap: "4px" }}>
            <button onClick={e => { e.stopPropagation(); onEdit(); }} title="編集" style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "6px", cursor: "pointer", color: "rgba(255,255,255,0.75)", padding: "6px", display: "flex" }}><Pencil size={13} /></button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }} title="削除" style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "6px", cursor: "pointer", color: "rgba(255,255,255,0.75)", padding: "6px", display: "flex" }}><Trash2 size={13} /></button>
          </div>
        )}
        <div style={{ fontSize: "20px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", paddingRight: isOwn ? "60px" : 0 }}>【{b.title}】</div>
        {b.subtitle && <div style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", marginTop: "4px" }}>{b.subtitle}</div>}
        {(b.event_start_date || b.event_date) && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "rgba(255,255,255,0.65)", fontFamily: "'Noto Sans JP',sans-serif", marginTop: "5px" }}>
            <Calendar size={10} color="rgba(255,255,255,0.4)" />
            {b.event_start_date
              ? formatJaDate(b.event_start_date) + (b.event_end_date ? `〜${formatJaDate(b.event_end_date)}` : "")
              : b.event_date}
          </div>
        )}
        {b.venue && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "rgba(255,255,255,0.65)", fontFamily: "'Noto Sans JP',sans-serif", marginTop: "3px" }}>
            <MapPin size={10} color="rgba(255,255,255,0.4)" />{b.venue}
          </div>
        )}
        {b.instructors.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "6px" }}>
            {b.instructors.map(ins => (
              <span key={ins.id} style={{ fontSize: "10px", padding: "2px 8px", background: "rgba(255,255,255,0.08)", borderRadius: "20px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>
                {ins.name}{ins.instagram && <span style={{ color: "#38BDF8" }}> @{ins.instagram}</span>}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
