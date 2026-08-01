"use client";
import { useState, useEffect } from "react";
import { Clock, MapPin, User, X, Check, Zap, Share2 } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { Cypher, ParticipantProfile } from "../lib/types";
import { formatDate, timeUntil, formatEndTime } from "../lib/constants";
import { GenreBadge } from "./GenreBadge";
import { ParticipantBar } from "./ParticipantBar";
import { showToast } from "./Toast";

export function DetailModal({ cypher, onClose, joined, pending, onJoin, onViewProfile, user, keepOpenOnJoin }: {
  cypher: Cypher | null;
  onClose: () => void;
  joined: boolean;
  pending?: boolean;
  onJoin: (id: string) => void;
  onViewProfile: (id: string) => void;
  user: SupabaseUser | null; // 未ログイン閲覧（/c/[id] 共有ページ）でも表示できる
  keepOpenOnJoin?: boolean; // /c/[id] では参加後も閉じない（onCloseがページ遷移のため）
}) {
  if (!cypher) return null;

  const cypherId = cypher.id;
  const organizerId = cypher.organizer.id;

  const { date, time } = formatDate(cypher.starts_at);
  const isEnded = timeUntil(cypher.starts_at) === "終了";
  const [participants, setParticipants] = useState<ParticipantProfile[]>([]);
  const [participantsFetched, setParticipantsFetched] = useState(false);
  const [comments, setComments] = useState<{ id: string; content: string; created_at: string; profile: { id: string; dancer_name: string; avatar_url: string | null } }[]>([]);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    async function fetchParticipants() {
      const { data } = await supabase
        .from("participations")
        .select("profile_id, profiles:profile_id ( dancer_name, avatar_url )")
        .eq("cypher_id", cypherId)
        .eq("status", "approved");
      if (data) {
        setParticipants(data.map((row: any) => ({
          profile_id: row.profile_id,
          dancer_name: row.profiles?.dancer_name ?? "UNKNOWN",
          avatar_url: row.profiles?.avatar_url ?? null,
          genres: [], instagram: null, dance_years: null, age_group: null, gender: null,
        })));
        setParticipantsFetched(true);
      }
    }
    fetchParticipants();
  }, [cypherId, joined]);

  useEffect(() => {
    async function fetchComments() {
      const { data } = await supabase
        .from("comments")
        .select("id, content, created_at, profile:profile_id(id, dancer_name, avatar_url)")
        .eq("cypher_id", cypherId)
        .order("created_at", { ascending: true });
      if (data) setComments(data.map((c: any) => ({ ...c, profile: c.profile ?? { id: "", dancer_name: "UNKNOWN", avatar_url: null } })));
    }
    fetchComments();
  }, [cypherId]);

  const handlePostComment = async () => {
    const text = commentText.trim();
    if (!text || posting || !user) return;
    setPosting(true);
    // 主催者・参加者への通知はDBトリガーが作成する（sql/2026-07-07_security.sql）
    const { data, error } = await supabase
      .from("comments")
      .insert({ cypher_id: cypherId, profile_id: user.id, content: text })
      .select("id, content, created_at, profile:profile_id(id, dancer_name, avatar_url)")
      .single();
    if (!error && data) {
      setComments(c => [...c, { ...data, profile: (data as any).profile ?? { id: user.id, dancer_name: "YOU", avatar_url: null } }]);
      setCommentText("");
    }
    setPosting(false);
  };

  // /c/[id] の共有リンクを配る（対応端末はOSの共有シート、なければコピー）
  const handleShare = async () => {
    const url = `${window.location.origin}/c/${cypherId}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${cypher.title} | 爆踊`, url }); } catch { /* ユーザーが共有をやめた */ }
    } else {
      await navigator.clipboard.writeText(url);
      showToast("リンクをコピーしました");
    }
  };

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    const h = Math.floor(min / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}日前`;
    if (h > 0) return `${h}時間前`;
    if (min > 0) return `${min}分前`;
    return "たった今";
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", margin: "0 auto", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderBottom: "none", borderRadius: "12px 12px 0 0", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 -4px 24px rgba(0,0,0,0.1)" }}>
        <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0, borderRadius: "12px 12px 0 0" }}>
          <h2 style={{ margin: 0, fontSize: "24px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#111111", lineHeight: 1.1, flex: 1 }}>{cypher.title}</h2>
          <button onClick={handleShare} title="共有" style={{ background: "none", border: "none", color: "#111111", cursor: "pointer", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Share2 size={19} /></button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#111111", cursor: "pointer", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><X size={22} /></button>
        </div>
        <div style={{ overflowY: "auto", padding: "8px 20px 0", flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
            {cypher.genres.map(g => <GenreBadge key={g} genre={g} size="md" />)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif", alignItems: "center" }}><Clock size={14} color="rgba(0,0,0,0.4)" /> {date} {time}{cypher.ends_at ? `〜${formatEndTime(cypher.starts_at, cypher.ends_at)}` : ""}</div>
            {/* 地図へ飛べるのはここだけ。押せる場所だと一目で分かるよう枠で囲い、
                指で押しやすいよう高さも確保する */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cypher.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif", alignItems: "center", textDecoration: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "8px", padding: "10px 12px", minHeight: "44px", background: "#FAFAFA" }}
            >
              <MapPin size={14} color="rgba(0,0,0,0.4)" />
              <span style={{ flex: 1 }}>{cypher.location}</span>
              <span style={{ fontSize: "11px", color: "#2563EB", fontWeight: 700, flexShrink: 0 }}>地図を開く →</span>
            </a>
            <button onClick={() => onViewProfile(organizerId)}
              style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", textDecoration: "underline dotted", textUnderlineOffset: "3px" }}>
              <User size={14} color="rgba(0,0,0,0.4)" /> 主催: {cypher.organizer.dancer_name}
            </button>
          </div>
          {cypher.description && <p style={{ fontSize: "13px", color: "#111111", lineHeight: 1.7, marginBottom: "20px", fontFamily: "'Noto Sans JP',sans-serif" }}>{cypher.description}</p>}
          <ParticipantBar count={participantsFetched ? participants.length : cypher.participant_count} max={cypher.max_members} />

          {cypher.studio_fee != null && (() => {
            const count = participantsFetched ? participants.length : cypher.participant_count;
            const perPerson = count > 0 ? Math.ceil(cypher.studio_fee / count) : null;
            return (
              <div style={{ marginTop: "16px", padding: "12px 14px", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111111" }}>💴 スタジオ代（合計 ¥{cypher.studio_fee.toLocaleString()}）</div>
                <div style={{ fontSize: "15px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#111" }}>
                  {perPerson != null
                    ? <>¥{perPerson.toLocaleString()}<span style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111111" }}> /人</span></>
                    : <span style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111111" }}>人数未定</span>}
                </div>
              </div>
            );
          })()}

          {participants.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111111", letterSpacing: "0.15em", marginBottom: "8px" }}>PARTICIPANTS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {participants.map(p => (
                  <button key={p.profile_id} onClick={() => onViewProfile(p.profile_id)}
                    style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", background: "rgba(0,0,0,0.08)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#111111", flexShrink: 0 }}
                    title={p.dancer_name}>
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt={p.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : p.dancer_name[0]?.toUpperCase() ?? "?"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isEnded ? (
            <div style={{ marginTop: "20px", padding: "14px", background: "rgba(0,0,0,0.04)", borderRadius: "6px", textAlign: "center", fontSize: "13px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif" }}>
              このサイファーは終了しました
            </div>
          ) : (() => {
            const isFull = !joined && cypher.max_members !== null && participantsFetched && participants.length >= cypher.max_members;
            return isFull ? (
              <div style={{ marginTop: "20px", padding: "14px", background: "rgba(255,61,0,0.06)", border: "1px solid rgba(255,61,0,0.2)", borderRadius: "6px", textAlign: "center", fontSize: "13px", color: "#FF3D00", fontFamily: "'Noto Sans JP',sans-serif" }}>
                定員に達しています（{participants.length}/{cypher.max_members}人）
              </div>
            ) : (
              <button onClick={() => { onJoin(cypher.id); if (!joined && !pending && !keepOpenOnJoin) onClose(); }}
                style={{ marginTop: "20px", width: "100%", padding: "14px", border: "none", borderRadius: "6px", background: joined ? "rgba(22,163,74,0.1)" : pending ? "rgba(0,0,0,0.06)" : "#FF3D00", color: joined ? "#16A34A" : pending ? "rgba(0,0,0,0.45)" : "#fff", fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.15em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {joined ? <><Check size={16} /> 参加済み — キャンセルする</> : pending ? <>申請中... — キャンセルする</> : cypher.requires_approval ? <>📋 参加を申請する</> : <><Zap size={16} /> このサイファーに参加する</>}
              </button>
            );
          })()}

          <div style={{ marginTop: "28px", borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: "20px" }}>
            <div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111111", letterSpacing: "0.15em", marginBottom: "14px" }}>COMMENTS{comments.length > 0 ? ` (${comments.length})` : ""}</div>
            {comments.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif", marginBottom: "16px" }}>まだコメントはありません</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "16px" }}>
                {comments.map(c => (
                  <div key={c.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <button onClick={() => c.profile.id && onViewProfile(c.profile.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
                      <div style={{ width: "30px", height: "30px", borderRadius: "50%", overflow: "hidden", background: "rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#111111" }}>
                        {c.profile.avatar_url
                          ? <img src={c.profile.avatar_url} alt={c.profile.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : c.profile.dancer_name[0]?.toUpperCase() ?? "?"}
                      </div>
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "3px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "bold", color: "#111", fontFamily: "'Noto Sans JP',sans-serif" }}>{c.profile.dancer_name}</span>
                        <span style={{ fontSize: "10px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif" }}>{timeAgo(c.created_at)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "13px", color: "#111111", lineHeight: 1.5 }}>{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {user ? (
        <div style={{ padding: "12px 16px 24px", borderTop: "1px solid rgba(0,0,0,0.07)", background: "#FFFFFF", display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <textarea
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }}
            placeholder="コメントを入力..."
            rows={1}
            maxLength={200}
            style={{ flex: 1, resize: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "20px", padding: "10px 14px", fontSize: "13px", fontFamily: "inherit", background: "#FAFAFA", outline: "none", lineHeight: 1.5 }}
          />
          <button
            onClick={handlePostComment}
            disabled={!commentText.trim() || posting}
            style={{ width: "38px", height: "38px", borderRadius: "50%", background: commentText.trim() ? "#FF3D00" : "rgba(0,0,0,0.1)", border: "none", cursor: commentText.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </div>
        ) : (
        <div style={{ padding: "14px 16px 24px", borderTop: "1px solid rgba(0,0,0,0.07)", background: "#FFFFFF", textAlign: "center", fontSize: "12px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif" }}>
          コメントや参加にはログインが必要です
        </div>
        )}
      </div>
    </div>
  );
}
