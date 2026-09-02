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
  // 添付画像（複数枚）。カード表紙には1枚目だけを使う
  image_urls: string[];
};

// 公演日程を「9/20(日)」のように短く表示する
function formatJaDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`;
}

// マイコミュニティのカードも、ホーム画面のLESSON/EVENT/NUMBERと同じ縦長ポスター表示にする。
// 画像を添付していればそれを、無ければコミュニティカラー（紫）のグラデーションを背景に敷く
export function CommunityBoardCard({ board: b, isOwn, onClick, onEdit, onDelete }: {
  board: Board; isOwn: boolean; onClick: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  const color = b.genre ? GENRE_COLORS[b.genre] : "#A855F7";

  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="bd-glow-card"
      style={{ position: "relative", aspectRatio: "3 / 4", borderRadius: "10px", overflow: "hidden", cursor: "pointer", border: `1px solid ${hover ? "rgba(168,85,247,0.5)" : "rgba(255,255,255,0.16)"}`, transition: "transform 0.25s ease, box-shadow 0.25s ease", transform: hover ? "translateY(-3px)" : "none", boxShadow: (hover ? `0 6px 14px rgba(0,0,0,0.4), 0 14px 28px rgba(168,85,247,0.2), ` : "0 3px 7px rgba(0,0,0,0.35), 0 8px 18px rgba(0,0,0,0.25), ") + "inset 0 1px 0 rgba(255,255,255,0.08)", ["--bd-glow" as any]: "rgba(168,85,247,0.2)" } as React.CSSProperties}>
      {/* 背景：画像を添付していればそれを表紙に、無ければコミュニティカラーのグラデーションでポスター風に見せる */}
      {b.image_urls[0] ? (
        <img src={b.image_urls[0]} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(168,85,247,0.35) 0%, #1c1c1c 62%, #101010 100%)" }} />
      )}
      {/* 下から黒く沈める */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.62) 38%, rgba(0,0,0,0.08) 68%, transparent 100%)" }} />

      {isOwn && (
        <div style={{ position: "absolute", top: "12px", right: "12px", display: "flex", gap: "6px", zIndex: 1 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(); }} title="編集" style={{ background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", cursor: "pointer", color: "#fff", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}><Pencil size={15} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} title="削除" style={{ background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", cursor: "pointer", color: "#fff", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={15} /></button>
        </div>
      )}

      {/* コンテンツは上から下まで満たすフライヤー組み。ジャンルタグは上、タイトルは
          marginTop:autoで下寄せの大きな斜体文字にする */}
      <div style={{ position: "absolute", inset: 0, padding: "20px", display: "flex", flexDirection: "column" }}>
        {b.genre && (
          <span style={{ alignSelf: "flex-start", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", padding: "3px 9px", borderRadius: "4px", background: color + "26", color }}>
            {genreLabel(b.genre)}
          </span>
        )}

        <div style={{ margin: "auto 0 0" }}>
          <h3 style={{ margin: 0, fontSize: "26px", fontWeight: 900, fontStyle: "italic", color: "#fff", fontFamily: "'Playfair Display','Noto Sans JP',sans-serif", letterSpacing: "-0.01em", lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>【{b.title}】</h3>
          {/* タイトルと同じセリフ体の斜体にして、フライヤーの煽り文句っぽい見せ方にする */}
          {b.subtitle && <div style={{ fontSize: "18px", fontFamily: "'Playfair Display','Noto Sans JP',sans-serif", fontStyle: "italic", fontWeight: 600, letterSpacing: "0.02em", color: "rgba(255,255,255,0.88)", marginTop: "6px", textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}>{b.subtitle}</div>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "14px" }}>
          {(b.event_start_date || b.event_date) && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Calendar size={14} color="rgba(255,255,255,0.55)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.9)", fontFamily: "'Noto Sans JP',sans-serif" }}>
                {b.event_start_date
                  ? formatJaDate(b.event_start_date) + (b.event_end_date ? `〜${formatJaDate(b.event_end_date)}` : "")
                  : b.event_date}
              </span>
            </div>
          )}
          {b.venue && (
            // 公演会場はGoogleマップへのリンクにする（他のカードと違いカード自体に詳細画面が
            // ないため、ここでタップできるようにしておく）。カード全体のonClickは拾わないよう止める
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.venue)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", width: "fit-content" }}>
              <MapPin size={14} color="rgba(255,255,255,0.55)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.9)", fontFamily: "'Noto Sans JP',sans-serif", textDecoration: "underline", textUnderlineOffset: "2px" }}>{b.venue}</span>
            </a>
          )}
        </div>

        {b.instructors.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
            {b.instructors.map(ins => (
              <span key={ins.id} style={{ fontSize: "11px", padding: "4px 10px", background: "rgba(255,255,255,0.12)", borderRadius: "20px", color: "#fff", fontFamily: "'Noto Sans JP',sans-serif" }}>
                {ins.name}{ins.instagram && <span style={{ color: "#38BDF8" }}> @{ins.instagram}</span>}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
