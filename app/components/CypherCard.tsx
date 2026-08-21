"use client";
import { useState } from "react";
import { Clock, MapPin } from "lucide-react";
import type { Cypher } from "../lib/types";
import { GENRE_COLORS, genreLabel, formatDate, dateBadgeParts, timeUntil, formatEndTime, splitLocation } from "../lib/constants";

export function CypherCard({ cypher, onClick, index = 0 }: { cypher: Cypher; onClick: () => void; index?: number }) {
  const { time } = formatDate(cypher.starts_at);
  const { month, day, weekday } = dateBadgeParts(cypher.starts_at);
  const { station, venue } = splitLocation(cypher.location);
  const until = timeUntil(cypher.starts_at);
  const [hover, setHover] = useState(false);
  const color = GENRE_COLORS[cypher.genres[0]] ?? "#DC2626";
  const isEnded = until === "終了";
  // 浮かび上がる登場は外側のdivに持たせる。内側のカードはホバーで動かすので
  // 同じ要素にアニメーションを乗せるとtransformが競合してホバーが効かなくなる
  return (
    <div style={{ animation: `bdCardFloatIn 0.45s ease-out ${Math.min(index * 60, 400)}ms both` }}>
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      // bd-glow-card: タッチ端末はホバーできないので、PCのホバー時と同じ色付き影を
      // @media(hover:none) で常時出す（globals.css相当のスタイルはpage.tsxのstyleタグ）
      className="bd-glow-card"
      style={{ background: "#141414", border: `1px solid ${cypher.hot && !isEnded ? "rgba(220,38,38,0.25)" : "rgba(255,255,255,0.1)"}`, borderRadius: "10px", padding: "8px 16px", cursor: "pointer", transition: "transform 0.25s ease, box-shadow 0.25s ease", transform: hover ? "translateY(-3px)" : "none", position: "relative", overflow: "hidden", boxShadow: hover ? `0 6px 12px rgba(0,0,0,0.3), 0 18px 36px ${color}26` : "0 2px 4px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.2)", opacity: isEnded ? 0.55 : 1, ["--bd-glow" as any]: `${color}26` } as React.CSSProperties}>
      {cypher.hot && !isEnded && <div style={{ position: "absolute", top: 0, right: 0, background: "#DC2626", padding: "3px 10px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#fff", fontWeight: "bold", borderBottomLeftRadius: "4px" }}>🔥 HOT</div>}
      {isEnded && <div style={{ position: "absolute", top: 0, right: 0, background: "rgba(255,255,255,0.12)", padding: "3px 10px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", fontWeight: "bold", borderBottomLeftRadius: "4px" }}>終了</div>}
      {cypher.visibility === "private" && !isEnded && !cypher.hot && <div style={{ position: "absolute", top: 0, right: 0, background: "rgba(0,0,0,0.65)", padding: "3px 10px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#fff", fontWeight: "bold", borderBottomLeftRadius: "4px" }}>🔒 限定</div>}
      {/* 背景に敷くジャンル名。色はそのジャンルの色、薄くして文字の邪魔をしない。
          はみ出た分はカードのoverflow:hiddenで切られる */}
      {cypher.genres[0] && (() => {
        // 表示は ing を落とした短い名前（BREAKING → BREAK）。
        // 長い名前（ALL STYLE など）が右で切れないよう、文字数に応じて小さくする
        const label = genreLabel(cypher.genres[0]).toUpperCase();
        // 左側の縁取りでジャンル色を出さなくなった代わりに、この背景ジャンル名を1.1倍大きくして目立たせる
        return (
          <div aria-hidden="true" style={{ position: "absolute", right: "14px", bottom: "-8px", fontSize: `${Math.round(Math.min(68, Math.round(360 / label.length)) * 1.1)}px`, fontStyle: "italic", fontWeight: 900, fontFamily: "'Playfair Display','Noto Sans JP',sans-serif", letterSpacing: "-0.02em", lineHeight: 1, whiteSpace: "nowrap", color: color + "40", pointerEvents: "none", userSelect: "none" }}>
            {label}
          </div>
        );
      })()}
      {/* 開催日時はチケットの半券風にカード左端へ張り付ける。
          カード自体のpadding(11px 16px)より外側にはみ出させたいので、
          この2つは中身のラッパーではなくカード直下（position:relativeの基準）に置く。
          背景色はカード本体と同じにして馴染ませ、区切り線だけで境目を示す */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "44px", display: "flex", flexDirection: "column", background: "#141414", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 900, color: isEnded ? "rgba(255,255,255,0.4)" : "#F0F0F0" }}>{month}</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: 900, fontFamily: "'Noto Sans JP',sans-serif", color: isEnded ? "rgba(255,255,255,0.4)" : "#F0F0F0", lineHeight: 1 }}>{day}</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: 900, fontFamily: "'Noto Sans JP',sans-serif", color: isEnded ? "rgba(255,255,255,0.4)" : "#F0F0F0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>{weekday}</div>
      </div>
      {/* 中身は背景文字より上に置く（position指定がないと背景文字の下に隠れる）。
          日付バッジぶん（44px - カード左paddingの16px = 28px）に加えて、間隔を空けるため12px余分に取る */}
      <div style={{ position: "relative", marginLeft: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0px" }}>
        <div style={{ flex: 1, paddingRight: "52px" }}>
          {/* 開催日そのものは左の日付バッジに出す */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 700, color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.05em", lineHeight: 1.2 }}>{cypher.title}</h3>
          </div>
          <div style={{ fontSize: "12px", color: "#F0F0F0", marginTop: "2px", fontFamily: "'Noto Sans JP',sans-serif", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            {/* Instagramを設定している主催者は名前ではなくアカウント名を出す */}
            {cypher.organizer.instagram
              ? <span>by <span style={{ color: "#A855F7" }}>@{cypher.organizer.instagram}</span></span>
              : <span>by {cypher.organizer.dancer_name}</span>}
          </div>
        </div>
        {/* 参加人数は下のバーではなく主催者アイコンの真下に出す */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", flexShrink: 0 }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: `linear-gradient(135deg,${color}22,${color}44)`, border: `1px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: "bold", color, fontFamily: "'Noto Sans JP',sans-serif", overflow: "hidden" }}>
            {cypher.organizer.avatar_url
              ? <img src={cypher.organizer.avatar_url} alt={cypher.organizer.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : cypher.organizer.avatar}
          </div>
          <span style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", color: isEnded ? "rgba(255,255,255,0.4)" : "#F0F0F0", whiteSpace: "nowrap" }}>
            {cypher.participant_count}{cypher.max_members ? `/${cypher.max_members}` : ""}人
          </span>
          {/* スタジオ代は参加人数表記のすぐ下に出す */}
          {cypher.studio_fee != null && (
            <span style={{ fontSize: "9px", padding: "2px 7px", background: "rgba(255,255,255,0.08)", borderRadius: "4px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", whiteSpace: "nowrap" }}>
              {cypher.participant_count > 0 ? `¥${Math.ceil(cypher.studio_fee / cypher.participant_count).toLocaleString()}/人` : `¥${cypher.studio_fee.toLocaleString()}`}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Clock size={11} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: "11px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>{time}{cypher.ends_at ? `〜${formatEndTime(cypher.starts_at, cypher.ends_at)}` : ""}</span>
        </div>
        {/* カード上では地図リンクにしない。カードのどこを押しても詳細が開くようにして、
            「カードを押したつもりが地図に飛ぶ」のを防ぐ。地図へは詳細モーダルから飛べる */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <MapPin size={11} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: "11px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>
            {venue || (station && `${station}駅`)}
            {venue && station && ` ${station}駅`}
          </span>
        </div>
      </div>
      </div>
    </div>
    </div>
  );
}
