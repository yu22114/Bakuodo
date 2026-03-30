"use client";

import { useState, useEffect, useRef } from "react";
import {
  MapPin, Clock, Users, Zap, Plus, User, ChevronRight,
  Flame, Music, ArrowLeft, Check, X, Star, Radio
} from "lucide-react";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const GENRES = ["Breaking", "Popping", "Locking", "Waacking", "Voguing", "House", "Krump", "Hip-Hop"];

const GENRE_COLORS = {
  Breaking: "#FF3D00",
  Popping:  "#00E5FF",
  Locking:  "#FFD600",
  Waacking: "#E040FB",
  Voguing:  "#FF4081",
  House:    "#69FF47",
  Krump:    "#FF6D00",
  "Hip-Hop":"#40C4FF",
};

const MOCK_CYPHERS = [
  {
    id: "1",
    title: "渋谷地下サイファー",
    starts_at: "2025-07-05T21:00:00",
    location: "渋谷駅 ハチ公前広場",
    genres: ["Breaking", "Popping"],
    organizer: { dancer_name: "RYU", avatar: "R" },
    participant_count: 7,
    max_members: 15,
    status: "open",
    description: "毎週土曜の夜戦。初心者歓迎。気軽に来てください。",
    hot: true,
  },
  {
    id: "2",
    title: "SHIBUYA LOCK SESSION",
    starts_at: "2025-07-06T18:30:00",
    location: "代々木公園 ケヤキ並木",
    genres: ["Locking", "Waacking"],
    organizer: { dancer_name: "MIKI", avatar: "M" },
    participant_count: 4,
    max_members: 10,
    status: "open",
    description: "ロッキング特化サイファー。ファンキーな時間を一緒に。",
    hot: false,
  },
  {
    id: "3",
    title: "VOGUE BALLROOM NIGHT",
    starts_at: "2025-07-07T22:00:00",
    location: "新宿 2丁目 CLUB ARC",
    genres: ["Voguing", "House"],
    organizer: { dancer_name: "DIANA", avatar: "D" },
    participant_count: 12,
    max_members: 20,
    status: "open",
    description: "ボールルームスタイル限定。ドレスコードあり。",
    hot: true,
  },
  {
    id: "4",
    title: "夜の公園 B-BOY SESSION",
    starts_at: "2025-07-08T19:00:00",
    location: "上野恩賜公園 噴水前",
    genres: ["Breaking"],
    organizer: { dancer_name: "TATSU", avatar: "T" },
    participant_count: 9,
    max_members: null,
    status: "open",
    description: "制限なし。スキルレベル問わず集合。",
    hot: false,
  },
  {
    id: "5",
    title: "KRUMP BATTLE PRACTICE",
    starts_at: "2025-07-09T20:00:00",
    location: "池袋東口 西武前",
    genres: ["Krump", "Hip-Hop"],
    organizer: { dancer_name: "ZERO", avatar: "Z" },
    participant_count: 3,
    max_members: 8,
    status: "open",
    description: "バトル形式で練習。本気勢のみ。",
    hot: false,
  },
];

const MOCK_PROFILE = {
  dancer_name: "",
  genres: [],
};

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function formatDate(iso) {
  const d = new Date(iso);
  const weekdays = ["日","月","火","水","木","金","土"];
  return {
    date: `${d.getMonth()+1}/${d.getDate()}(${weekdays[d.getDay()]})`,
    time: `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`,
  };
}

function timeUntil(iso) {
  const diff = new Date(iso) - new Date();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}日後`;
  if (h > 0) return `${h}時間後`;
  return "まもなく";
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function GenreBadge({ genre, size = "sm" }) {
  const color = GENRE_COLORS[genre] || "#ffffff";
  return (
    <span
      style={{
        border: `1px solid ${color}`,
        color: color,
        fontSize: size === "sm" ? "10px" : "12px",
        padding: size === "sm" ? "2px 8px" : "4px 12px",
        borderRadius: "2px",
        fontFamily: "'Space Mono', monospace",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {genre}
    </span>
  );
}

function ParticipantBar({ count, max }) {
  const pct = max ? Math.min((count / max) * 100, 100) : 50;
  const color = pct > 80 ? "#FF3D00" : pct > 50 ? "#FFD600" : "#69FF47";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{
        flex: 1,
        height: "3px",
        background: "rgba(255,255,255,0.1)",
        borderRadius: "2px",
        overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          transition: "width 0.6s ease",
          boxShadow: `0 0 8px ${color}`,
        }} />
      </div>
      <span style={{
        fontSize: "11px",
        color: color,
        fontFamily: "'Space Mono', monospace",
        minWidth: "60px",
        textAlign: "right",
      }}>
        {count}{max ? `/${max}` : ""} 人
      </span>
    </div>
  );
}

function CypherCard({ cypher, onClick, joined, onJoin }) {
  const { date, time } = formatDate(cypher.starts_at);
  const until = timeUntil(cypher.starts_at);
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover
          ? "rgba(255,255,255,0.06)"
          : "rgba(255,255,255,0.03)",
        border: cypher.hot
          ? "1px solid rgba(255,61,0,0.5)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: "4px",
        padding: "16px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        transform: hover ? "translateY(-2px)" : "none",
        boxShadow: cypher.hot
          ? "0 0 20px rgba(255,61,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "inset 0 1px 0 rgba(255,255,255,0.03)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* HOT indicator */}
      {cypher.hot && (
        <div style={{
          position: "absolute",
          top: 0, right: 0,
          background: "#FF3D00",
          padding: "3px 10px",
          fontSize: "9px",
          fontFamily: "'Space Mono', monospace",
          letterSpacing: "0.1em",
          color: "#fff",
          fontWeight: "bold",
        }}>
          🔥 HOT
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div style={{ flex: 1, paddingRight: "40px" }}>
          <h3 style={{
            margin: 0,
            fontSize: "15px",
            fontWeight: "700",
            color: "#F5F5F5",
            fontFamily: "'Bebas Neue', 'Impact', sans-serif",
            letterSpacing: "0.05em",
            lineHeight: 1.2,
          }}>
            {cypher.title}
          </h3>
          <div style={{
            fontSize: "10px",
            color: "rgba(255,255,255,0.4)",
            marginTop: "2px",
            fontFamily: "'Space Mono', monospace",
          }}>
            by {cypher.organizer.dancer_name}
          </div>
        </div>

        {/* Avatar */}
        <div style={{
          width: "36px",
          height: "36px",
          borderRadius: "2px",
          background: `linear-gradient(135deg, ${GENRE_COLORS[cypher.genres[0]] || "#fff"}33, transparent)`,
          border: `1px solid ${GENRE_COLORS[cypher.genres[0]] || "#fff"}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          fontWeight: "bold",
          color: GENRE_COLORS[cypher.genres[0]] || "#fff",
          fontFamily: "'Bebas Neue', sans-serif",
          flexShrink: 0,
        }}>
          {cypher.organizer.avatar}
        </div>
      </div>

      {/* Meta info */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Clock size={11} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontFamily: "'Space Mono', monospace" }}>
            {date} {time}
          </span>
          <span style={{
            fontSize: "9px",
            padding: "1px 5px",
            background: "rgba(255,255,255,0.08)",
            borderRadius: "2px",
            color: "rgba(255,255,255,0.5)",
            fontFamily: "'Space Mono', monospace",
          }}>
            {until}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <MapPin size={11} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontFamily: "'Space Mono', monospace" }}>
            {cypher.location}
          </span>
        </div>
      </div>

      {/* Genres */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "12px" }}>
        {cypher.genres.map(g => <GenreBadge key={g} genre={g} />)}
      </div>

      {/* Participant bar */}
      <ParticipantBar count={cypher.participant_count} max={cypher.max_members} />

      {/* Join button */}
      <button
        onClick={e => { e.stopPropagation(); onJoin(cypher.id); }}
        style={{
          marginTop: "12px",
          width: "100%",
          padding: "9px",
          border: joined ? "1px solid rgba(105,255,71,0.5)" : "1px solid rgba(255,255,255,0.2)",
          borderRadius: "2px",
          background: joined ? "rgba(105,255,71,0.1)" : "transparent",
          color: joined ? "#69FF47" : "rgba(255,255,255,0.7)",
          fontSize: "11px",
          fontFamily: "'Space Mono', monospace",
          letterSpacing: "0.1em",
          cursor: "pointer",
          transition: "all 0.2s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
        }}
      >
        {joined ? <><Check size={12} /> JOINED</> : <><Plus size={12} /> JUMP IN</>}
      </button>
    </div>
  );
}

function DetailModal({ cypher, onClose, joined, onJoin }) {
  if (!cypher) return null;
  const { date, time } = formatDate(cypher.starts_at);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-end",
      animation: "fadeIn 0.2s ease",
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "480px",
          margin: "0 auto",
          background: "#111",
          border: "1px solid rgba(255,255,255,0.12)",
          borderBottom: "none",
          borderRadius: "8px 8px 0 0",
          padding: "24px 20px 40px",
          animation: "slideUp 0.3s ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <h2 style={{
            margin: 0,
            fontSize: "24px",
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: "0.05em",
            color: "#F5F5F5",
            lineHeight: 1.1,
          }}>
            {cypher.title}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: "4px" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
          {cypher.genres.map(g => <GenreBadge key={g} genre={g} size="md" />)}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "10px", fontSize: "13px", color: "rgba(255,255,255,0.7)", fontFamily: "'Space Mono', monospace" }}>
            <Clock size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {date} {time}
          </div>
          <div style={{ display: "flex", gap: "10px", fontSize: "13px", color: "rgba(255,255,255,0.7)", fontFamily: "'Space Mono', monospace" }}>
            <MapPin size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {cypher.location}
          </div>
          <div style={{ display: "flex", gap: "10px", fontSize: "13px", color: "rgba(255,255,255,0.7)", fontFamily: "'Space Mono', monospace" }}>
            <User size={14} style={{ flexShrink: 0, marginTop: 1 }} /> 主催: {cypher.organizer.dancer_name}
          </div>
        </div>

        {cypher.description && (
          <p style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.7,
            marginBottom: "20px",
            fontFamily: "'Noto Sans JP', sans-serif",
          }}>
            {cypher.description}
          </p>
        )}

        <ParticipantBar count={cypher.participant_count} max={cypher.max_members} />

        <button
          onClick={() => { onJoin(cypher.id); onClose(); }}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "14px",
            border: "none",
            borderRadius: "2px",
            background: joined ? "rgba(105,255,71,0.15)" : "#FF3D00",
            color: joined ? "#69FF47" : "#fff",
            fontSize: "14px",
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: "0.15em",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          {joined ? <><Check size={16} /> 参加済み — キャンセルする</> : <><Zap size={16} /> このサイファーに参加する</>}
        </button>
      </div>
    </div>
  );
}

// ─── SCREENS ──────────────────────────────────────────────────────────────────

function TopScreen({ onNav, joined, onJoin, onCardClick }) {
  const [filter, setFilter] = useState("ALL");

  const filtered = filter === "ALL"
    ? MOCK_CYPHERS
    : MOCK_CYPHERS.filter(c => c.genres.includes(filter));

  return (
    <div style={{ paddingBottom: "80px" }}>
      {/* Hero */}
      <div style={{
        padding: "32px 16px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          fontSize: "10px",
          fontFamily: "'Space Mono', monospace",
          color: "rgba(255,255,255,0.3)",
          letterSpacing: "0.2em",
          marginBottom: "6px",
        }}>
          ▶ LIVE SESSIONS
        </div>
        <h1 style={{
          margin: 0,
          fontSize: "42px",
          fontFamily: "'Bebas Neue', sans-serif",
          letterSpacing: "0.1em",
          background: "linear-gradient(135deg, #FF3D00, #FF6D00, #FFD600)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          lineHeight: 1,
        }}>
          爆踊
        </h1>
        <p style={{
          margin: "6px 0 0",
          fontSize: "11px",
          color: "rgba(255,255,255,0.4)",
          fontFamily: "'Space Mono', monospace",
          letterSpacing: "0.05em",
        }}>
          今日、ここで、踊ろう。
        </p>
      </div>

      {/* Genre filter */}
      <div style={{
        display: "flex",
        gap: "6px",
        padding: "12px 16px",
        overflowX: "auto",
        scrollbarWidth: "none",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        {["ALL", ...GENRES.slice(0, 6)].map(g => (
          <button
            key={g}
            onClick={() => setFilter(g)}
            style={{
              flexShrink: 0,
              padding: "5px 12px",
              border: filter === g
                ? `1px solid ${g === "ALL" ? "#FF3D00" : GENRE_COLORS[g]}`
                : "1px solid rgba(255,255,255,0.12)",
              borderRadius: "2px",
              background: filter === g
                ? `${g === "ALL" ? "#FF3D00" : GENRE_COLORS[g]}18`
                : "transparent",
              color: filter === g
                ? (g === "ALL" ? "#FF3D00" : GENRE_COLORS[g])
                : "rgba(255,255,255,0.4)",
              fontSize: "10px",
              fontFamily: "'Space Mono', monospace",
              letterSpacing: "0.08em",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div style={{
        display: "flex",
        padding: "10px 16px",
        gap: "20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        {[
          { label: "ACTIVE", value: filtered.length, icon: <Radio size={10} /> },
          { label: "DANCERS", value: filtered.reduce((a,c) => a + c.participant_count, 0), icon: <Users size={10} /> },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#FF3D00" }}>{s.icon}</span>
            <span style={{ fontSize: "18px", fontFamily: "'Bebas Neue', sans-serif", color: "#F5F5F5", lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: "9px", fontFamily: "'Space Mono', monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 16px" }}>
        {filtered.map(c => (
          <CypherCard
            key={c.id}
            cypher={c}
            onClick={() => onCardClick(c)}
            joined={joined.includes(c.id)}
            onJoin={onJoin}
          />
        ))}
      </div>
    </div>
  );
}

function PostScreen({ onNav, onPost }) {
  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    genres: [],
    description: "",
    max_members: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const toggle = g => {
    setForm(f => ({
      ...f,
      genres: f.genres.includes(g) ? f.genres.filter(x => x !== g) : [...f.genres, g],
    }));
  };

  const handleSubmit = () => {
    if (!form.title || !form.date || !form.location) return;
    setSubmitted(true);
    setTimeout(() => { onNav("top"); }, 1800);
  };

  if (submitted) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "70vh", gap: "16px",
        padding: "20px",
        animation: "fadeIn 0.4s ease",
      }}>
        <div style={{
          width: "72px", height: "72px",
          borderRadius: "50%",
          background: "rgba(105,255,71,0.1)",
          border: "2px solid #69FF47",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Check size={32} color="#69FF47" />
        </div>
        <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "28px", color: "#69FF47", letterSpacing: "0.1em", margin: 0 }}>
          POSTED!
        </p>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: 0 }}>
          サイファーを作成しました
        </p>
      </div>
    );
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "2px",
    color: "#F5F5F5",
    fontSize: "14px",
    fontFamily: "'Space Mono', monospace",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  const labelStyle = {
    display: "block",
    fontSize: "9px",
    fontFamily: "'Space Mono', monospace",
    letterSpacing: "0.15em",
    color: "rgba(255,255,255,0.4)",
    marginBottom: "6px",
    textTransform: "uppercase",
  };

  return (
    <div style={{ paddingBottom: "80px" }}>
      <div style={{ padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: "10px", fontFamily: "'Space Mono', monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", marginBottom: "4px" }}>
          ▶ NEW SESSION
        </div>
        <h2 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: "32px", letterSpacing: "0.08em", color: "#F5F5F5" }}>
          サイファーを作る
        </h2>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Title */}
        <div>
          <label style={labelStyle}>イベント名 *</label>
          <input
            style={inputStyle}
            placeholder="例: 渋谷夜間サイファー"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
        </div>

        {/* Date + Time */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={labelStyle}>日付 *</label>
            <input type="date" style={inputStyle} value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>時間</label>
            <input type="time" style={inputStyle} value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
          </div>
        </div>

        {/* Location */}
        <div>
          <label style={labelStyle}>場所 *</label>
          <input
            style={inputStyle}
            placeholder="例: 渋谷駅 ハチ公前"
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
          />
        </div>

        {/* Genres */}
        <div>
          <label style={labelStyle}>ジャンル</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
            {GENRES.map(g => {
              const sel = form.genres.includes(g);
              const col = GENRE_COLORS[g];
              return (
                <button
                  key={g}
                  onClick={() => toggle(g)}
                  style={{
                    padding: "6px 12px",
                    border: sel ? `1px solid ${col}` : "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "2px",
                    background: sel ? `${col}20` : "transparent",
                    color: sel ? col : "rgba(255,255,255,0.45)",
                    fontSize: "10px",
                    fontFamily: "'Space Mono', monospace",
                    letterSpacing: "0.05em",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>詳細説明</label>
          <textarea
            style={{ ...inputStyle, minHeight: "80px", resize: "vertical", lineHeight: 1.6 }}
            placeholder="参加者へのメッセージ、持ち物、雰囲気など..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>

        {/* Max members */}
        <div>
          <label style={labelStyle}>参加定員</label>
          <input
            style={inputStyle}
            type="number"
            placeholder="空欄 = 無制限"
            value={form.max_members}
            onChange={e => setForm(f => ({ ...f, max_members: e.target.value }))}
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          style={{
            width: "100%",
            padding: "14px",
            border: "none",
            borderRadius: "2px",
            background: form.title && form.date && form.location
              ? "linear-gradient(135deg, #FF3D00, #FF6D00)"
              : "rgba(255,255,255,0.06)",
            color: form.title && form.date && form.location ? "#fff" : "rgba(255,255,255,0.3)",
            fontSize: "15px",
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: "0.15em",
            cursor: form.title && form.date && form.location ? "pointer" : "not-allowed",
            transition: "all 0.2s",
          }}
        >
          <Zap size={15} style={{ display: "inline", marginRight: "8px", verticalAlign: "middle" }} />
          サイファーを投稿する
        </button>
      </div>
    </div>
  );
}

function ProfileScreen() {
  const [profile, setProfile] = useState(MOCK_PROFILE);
  const [saved, setSaved] = useState(false);

  const toggle = g => {
    setProfile(p => ({
      ...p,
      genres: p.genres.includes(g) ? p.genres.filter(x => x !== g) : [...p.genres, g],
    }));
    setSaved(false);
  };

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ paddingBottom: "80px" }}>
      <div style={{ padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: "10px", fontFamily: "'Space Mono', monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", marginBottom: "4px" }}>
          ▶ YOUR IDENTITY
        </div>
        <h2 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: "32px", letterSpacing: "0.08em", color: "#F5F5F5" }}>
          ダンサー設定
        </h2>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Avatar preview */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "64px", height: "64px",
            borderRadius: "4px",
            background: "linear-gradient(135deg, #FF3D00, #FF6D00)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "28px",
            fontFamily: "'Bebas Neue', sans-serif",
            color: "#fff",
            letterSpacing: "0.05em",
          }}>
            {profile.dancer_name ? profile.dancer_name[0].toUpperCase() : "?"}
          </div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "22px", color: "#F5F5F5", letterSpacing: "0.05em" }}>
              {profile.dancer_name || "YOUR NAME"}
            </div>
            <div style={{ fontSize: "10px", fontFamily: "'Space Mono', monospace", color: "rgba(255,255,255,0.3)" }}>
              {profile.genres.length > 0 ? profile.genres.join(" · ") : "No genres set"}
            </div>
          </div>
        </div>

        {/* Dancer name */}
        <div>
          <label style={{
            display: "block", fontSize: "9px", fontFamily: "'Space Mono', monospace",
            letterSpacing: "0.15em", color: "rgba(255,255,255,0.4)",
            marginBottom: "6px", textTransform: "uppercase",
          }}>
            ダンサーネーム
          </label>
          <input
            style={{
              width: "100%", padding: "10px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "2px", color: "#F5F5F5",
              fontSize: "16px", fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: "0.05em", outline: "none",
              boxSizing: "border-box",
            }}
            placeholder="DANCER NAME"
            value={profile.dancer_name}
            onChange={e => { setProfile(p => ({ ...p, dancer_name: e.target.value })); setSaved(false); }}
          />
        </div>

        {/* Genres */}
        <div>
          <label style={{
            display: "block", fontSize: "9px", fontFamily: "'Space Mono', monospace",
            letterSpacing: "0.15em", color: "rgba(255,255,255,0.4)",
            marginBottom: "10px", textTransform: "uppercase",
          }}>
            得意ジャンル
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {GENRES.map(g => {
              const sel = profile.genres.includes(g);
              const col = GENRE_COLORS[g];
              return (
                <button
                  key={g}
                  onClick={() => toggle(g)}
                  style={{
                    padding: "10px",
                    border: sel ? `1px solid ${col}` : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "2px",
                    background: sel ? `${col}15` : "rgba(255,255,255,0.02)",
                    color: sel ? col : "rgba(255,255,255,0.4)",
                    fontSize: "11px",
                    fontFamily: "'Space Mono', monospace",
                    letterSpacing: "0.05em",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  {g}
                  {sel && <Check size={11} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={save}
          style={{
            width: "100%",
            padding: "13px",
            border: "none",
            borderRadius: "2px",
            background: saved
              ? "rgba(105,255,71,0.15)"
              : "linear-gradient(135deg, #FF3D00, #FF6D00)",
            color: saved ? "#69FF47" : "#fff",
            fontSize: "14px",
            fontFamily: "'Bebas Neue', sans-serif",
            letterSpacing: "0.15em",
            cursor: "pointer",
            transition: "all 0.3s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          {saved
            ? <><Check size={15} /> SAVED!</>
            : <><Star size={15} /> プロフィールを保存する</>
          }
        </button>
      </div>
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
function BottomNav({ current, onNav }) {
  const items = [
    { id: "top",     icon: <Flame size={20} />,  label: "CYPHER" },
    { id: "post",    icon: <Plus size={20} />,   label: "POST" },
    { id: "profile", icon: <User size={20} />,   label: "ME" },
  ];

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "rgba(10,10,10,0.95)",
      backdropFilter: "blur(12px)",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      display: "flex",
      zIndex: 50,
      maxWidth: "480px",
      margin: "0 auto",
    }}>
      {items.map(item => {
        const active = current === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            style={{
              flex: 1,
              padding: "12px 0 10px",
              border: "none",
              background: "transparent",
              color: active ? "#FF3D00" : "rgba(255,255,255,0.3)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.15s",
            }}
          >
            {item.id === "post" ? (
              <div style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: active ? "#FF3D00" : "rgba(255,61,0,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "-20px",
                boxShadow: "0 0 20px rgba(255,61,0,0.5)",
                border: "3px solid #0a0a0a",
              }}>
                <Plus size={20} color="#fff" />
              </div>
            ) : item.icon}
            <span style={{ fontSize: "8px", fontFamily: "'Space Mono', monospace", letterSpacing: "0.1em" }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function BakuOdori() {
  const [screen, setScreen] = useState("top");
  const [joined, setJoined] = useState([]);
  const [detail, setDetail] = useState(null);

  const handleJoin = id => {
    setJoined(j => j.includes(id) ? j.filter(x => x !== id) : [...j, id]);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=Noto+Sans+JP:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body, html { background: #0a0a0a; color: #F5F5F5; -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { display: none; }
        input[type="date"], input[type="time"] { color-scheme: dark; }
        textarea { font-family: inherit; }

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,61,0,0.4); }
          50%       { box-shadow: 0 0 35px rgba(255,61,0,0.7); }
        }
      `}</style>

      <div style={{
        maxWidth: "480px",
        margin: "0 auto",
        minHeight: "100vh",
        position: "relative",
        background: "#0a0a0a",
      }}>
        {/* Noise texture overlay */}
        <div style={{
          position: "fixed", inset: 0, zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E")`,
          pointerEvents: "none",
          maxWidth: "480px",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {screen === "top"     && <TopScreen onNav={setScreen} joined={joined} onJoin={handleJoin} onCardClick={setDetail} />}
          {screen === "post"    && <PostScreen onNav={setScreen} />}
          {screen === "profile" && <ProfileScreen />}
        </div>

        <BottomNav current={screen} onNav={setScreen} />
        {detail && (
          <DetailModal
            cypher={detail}
            onClose={() => setDetail(null)}
            joined={joined.includes(detail.id)}
            onJoin={handleJoin}
          />
        )}
      </div>
    </>
  );
}
