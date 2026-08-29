"use client";
import { useState, useEffect } from "react";
import { Calendar, MapPin, User, X, Check, Zap, Share2, Pencil, Trash2, Star } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { DanceNumber, ParticipantProfile } from "../lib/types";
import { dateBadgeParts, timeUntil } from "../lib/constants";
import { ParticipantBar } from "./ParticipantBar";
import { showToast } from "./Toast";
import { hapticTap } from "../lib/haptics";

// 本番当日（"YYYY-MM-DD"）を「9/10(木)」のように短く表示する
function formatJaDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`;
}

// DetailModal（CYPHER用）とほぼ同じ作り。限定公開・参加承認制・コメントは持たない分シンプル。
// 主催者向けの編集・削除は（プロフィール画面の主催タブにはまだ出していないので）このモーダル自身に持たせる
export function NumberDetailModal({ number, onClose, joined, onJoin, onViewProfile, onEdit, onDeleted, user, keepOpenOnJoin }: {
  number: DanceNumber | null;
  onClose: () => void;
  joined: boolean;
  onJoin: (id: string) => void;
  onViewProfile: (id: string) => void;
  // ホーム画面のカードから開いた時は渡さない＝編集・削除ボタンを出さない。
  // プロフィール画面の「主催」タブから開いた時だけ渡す（そちらで編集・削除できるようにするため）
  onEdit?: (id: string) => void;
  onDeleted?: (id: string) => void;
  user: SupabaseUser | null;
  keepOpenOnJoin?: boolean; // /n/[id] では参加後も閉じない（onCloseがページ遷移のため）
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  if (!number) return null;

  const handleDelete = async () => {
    if (!user || deleting) return;
    setDeleting(true);
    // number_genres・number_participationsはnumbersへのon delete cascadeで一緒に消える
    const { error } = await supabase.from("numbers").delete().eq("id", number.id).eq("organizer_id", user.id);
    setDeleting(false);
    if (error) { showToast("削除に失敗しました"); return; }
    setDeleteConfirm(false);
    onDeleted?.(number.id);
  };

  const numberId = number.id;
  const organizerId = number.organizer.id;

  const start = dateBadgeParts(number.starts_at);
  const end = number.ends_at ? dateBadgeParts(number.ends_at) : null;
  // 複数日にまたがる練習期間なので、「終了」判定は2日目（あれば）を基準にする
  const isEnded = timeUntil(number.ends_at ?? number.starts_at) === "終了";
  const isOwn = organizerId === user?.id;
  const [participants, setParticipants] = useState<ParticipantProfile[]>([]);
  const [participantsFetched, setParticipantsFetched] = useState(false);
  const [justJoined, setJustJoined] = useState(false);

  useEffect(() => {
    async function fetchParticipants() {
      const { data } = await supabase
        .from("number_participations")
        .select("profile_id, profiles:profile_id ( dancer_name, avatar_url )")
        .eq("number_id", numberId)
        .neq("profile_id", organizerId); // 主催者は参加者に含めない
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
  }, [numberId, joined]);

  const handleShare = async () => {
    const url = `${window.location.origin}/n/${numberId}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${number.title} | 爆踊`, url }); } catch { /* ユーザーが共有をやめた */ }
    } else {
      await navigator.clipboard.writeText(url);
      showToast("リンクをコピーしました");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", padding: "0 12px 12px", boxSizing: "border-box" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", margin: "0 auto", background: "linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.1) 46%, rgba(255,255,255,0.02) 58%, transparent 72%), linear-gradient(150deg, #2c2c2c 0%, #1a1a1a 25%, #242424 48%, #161616 70%, #282828 100%)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "16px", maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 -4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)" }}>
        <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0, borderRadius: "12px 12px 0 0" }}>
          <h2 style={{ margin: 0, fontSize: "24px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", lineHeight: 1.1, flex: 1 }}>{number.title}</h2>
          <button onClick={handleShare} title="共有" style={{ background: "none", border: "none", color: "#F0F0F0", cursor: "pointer", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Share2 size={19} /></button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#F0F0F0", cursor: "pointer", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><X size={22} /></button>
        </div>
        <div style={{ overflowY: "auto", padding: "8px 20px 20px", flex: 1 }}>
          {/* カード表紙ではジャンル名を背景に大きく出しているが、詳細画面ではあえて出さない。
              複数枚ある時は横スワイプで見せ、右上に「1/3」のように枚数を出す */}
          {number.image_urls.length > 0 && (
            <div style={{ position: "relative", marginTop: "8px", marginBottom: "16px" }}>
              <div className="bd-scroll" style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", borderRadius: "10px" }}>
                {number.image_urls.map((url, i) => (
                  <img key={i} src={url} alt="" style={{ width: "100%", flexShrink: 0, aspectRatio: "3 / 4", objectFit: "cover", scrollSnapAlign: "start", display: "block" }} />
                ))}
              </div>
              {number.image_urls.length > 1 && (
                <div style={{ position: "absolute", top: "8px", right: "8px", padding: "2px 8px", borderRadius: "10px", background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif" }}>
                  {number.image_urls.length}枚
                </div>
              )}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
            <button onClick={() => onViewProfile(organizerId)}
              style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", textDecoration: "underline dotted", textUnderlineOffset: "3px" }}>
              <User size={14} color="rgba(255,255,255,0.45)" /> 主催: {number.organizer.dancer_name}
            </button>
            <div style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", alignItems: "center" }}>
              <Calendar size={14} color="rgba(255,255,255,0.45)" />
              想定練習期間: {start.month}/{start.day}({start.weekday}){end ? `〜${end.month}/${end.day}(${end.weekday})` : ""}
            </div>
            {number.performance_dates.length > 0 && (
              <div style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", alignItems: "flex-start" }}>
                <Star size={14} color="rgba(255,255,255,0.45)" style={{ marginTop: "2px", flexShrink: 0 }} />
                <span>本番当日: {number.performance_dates.map(formatJaDate).join("、")}</span>
              </div>
            )}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(number.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", alignItems: "center", textDecoration: "none", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "8px", padding: "10px 12px", minHeight: "44px", background: "#1A1A1A" }}
            >
              <MapPin size={14} color="rgba(255,255,255,0.45)" />
              <span style={{ flex: 1 }}>{number.location}</span>
              <span style={{ fontSize: "11px", color: "#5B9BFF", fontWeight: 700, flexShrink: 0 }}>地図を開く →</span>
            </a>
          </div>
          {number.description && <p style={{ fontSize: "13px", color: "#F0F0F0", lineHeight: 1.7, marginBottom: "20px", fontFamily: "'Noto Sans JP',sans-serif" }}>{number.description}</p>}
          <ParticipantBar count={participantsFetched ? participants.length : number.participant_count} max={number.max_members} />

          {participants.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em", marginBottom: "8px" }}>参加者</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {participants.map(p => (
                  <button key={p.profile_id} onClick={() => onViewProfile(p.profile_id)}
                    style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", flexShrink: 0 }}
                    title={p.dancer_name}>
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt={p.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : p.dancer_name[0]?.toUpperCase() ?? "?"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!user ? (
            <div style={{ marginTop: "20px", padding: "14px", background: "rgba(255,255,255,0.06)", borderRadius: "6px", textAlign: "center", fontSize: "13px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>
              参加にはログインが必要です
            </div>
          ) : !isOwn && (isEnded ? (
            <div style={{ marginTop: "20px", padding: "14px", background: "rgba(255,255,255,0.06)", borderRadius: "6px", textAlign: "center", fontSize: "13px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>
              このNUMBERは終了しました
            </div>
          ) : (() => {
            const isFull = !joined && number.max_members !== null && participantsFetched && participants.length >= number.max_members;
            return isFull ? (
              <div style={{ marginTop: "20px", padding: "14px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: "6px", textAlign: "center", fontSize: "13px", color: "#DC2626", fontFamily: "'Noto Sans JP',sans-serif" }}>
                定員に達しています（{participants.length}/{number.max_members}人）
              </div>
            ) : (
              <div style={{ position: "relative", marginTop: "20px" }}>
                {justJoined && <div aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: "6px", border: "2px solid #16A34A", animation: "bdJoinRing 0.7s ease-out", pointerEvents: "none" }} />}
                <button onClick={() => {
                  hapticTap();
                  const isDirectJoin = !joined;
                  onJoin(number.id);
                  if (isDirectJoin) {
                    setJustJoined(true);
                    setTimeout(() => { setJustJoined(false); if (!keepOpenOnJoin) onClose(); }, 700);
                  }
                }}
                  className={!justJoined && !joined ? "bd-spray" : undefined}
                  style={{ width: "100%", padding: "14px", border: "none", borderRadius: "6px", background: justJoined ? "#16A34A" : joined ? "rgba(22,163,74,0.12)" : "linear-gradient(135deg, #EC4899, #BE185D)", color: justJoined ? "#fff" : joined ? "#16A34A" : "#fff", fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.15em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", animation: justJoined ? "bdJoinPop 0.4s ease-out" : undefined }}>
                  {justJoined ? <><Check size={16} /> 参加しました！</> : joined ? <><Check size={16} /> 参加済み — キャンセルする</> : <><Zap size={16} /> このNUMBERに参加する</>}
                </button>
              </div>
            );
          })())}

          {/* 編集・削除はプロフィール画面の「主催」タブからだけ行える
              （onEdit/onDeletedが渡されている時だけ、つまりホーム画面のカードからは出さない） */}
          {isOwn && onEdit && onDeleted && (
            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              <button onClick={() => onEdit(number.id)}
                style={{ flex: 1, padding: "12px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "6px", background: "transparent", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <Pencil size={13} /> 編集する
              </button>
              <button onClick={() => setDeleteConfirm(true)}
                style={{ flex: 1, padding: "12px", border: "1px solid rgba(220,38,38,0.35)", borderRadius: "6px", background: "transparent", color: "#DC2626", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <Trash2 size={13} /> 削除する
              </button>
            </div>
          )}
        </div>
      </div>

      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={e => { e.stopPropagation(); setDeleteConfirm(false); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderRadius: "12px", padding: "28px 24px", width: "100%", maxWidth: "320px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>🗑️</div>
            <div style={{ fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "20px", color: "#F0F0F0", marginBottom: "8px" }}>NUMBERを削除</div>
            <div style={{ fontSize: "13px", color: "#F0F0F0", marginBottom: "24px", lineHeight: "1.6" }}>削除すると参加者の記録もすべて消えます。元に戻せません。本当に削除しますか？</div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirm(false)} style={{ flex: 1, padding: "12px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "8px", background: "none", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#F0F0F0" }}>キャンセル</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", background: "linear-gradient(135deg, #DC2626, #A61B1B)", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#FFFFFF", fontWeight: "bold" }}>{deleting ? "削除中..." : "削除する"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
