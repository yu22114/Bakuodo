"use client";
import { useState, useEffect } from "react";
import { Bell, ChevronLeft, Check, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { showToast } from "./Toast";
import { useSwipeBack } from "../lib/useSwipeBack";

export function NotificationScreen({ currentUserId, onBack, onViewProfile }: {
  currentUserId: string;
  onBack: () => void;
  onViewProfile?: (id: string) => void;
}) {
  const swipeBack = useSwipeBack(onBack);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  useEffect(() => {
    async function fetchAndMarkRead() {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, read, created_at, actor:actor_id(id,dancer_name,avatar_url), cypher:cypher_id(id,title), lesson:lesson_id(id,title)")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(50);
      setItems(data ?? []);
      setLoading(false);
      await supabase.from("notifications").update({ read: true }).eq("user_id", currentUserId).eq("read", false);
    }
    fetchAndMarkRead();
  }, [currentUserId]);

  const handleApprove = async (notifId: string, actorId: string, type: string, cypherId?: string, lessonId?: string) => {
    setActionLoading(notifId);
    // 申請者への通知はDBトリガーが作成する（sql/2026-07-07_security.sql）
    if (type === "follow_request") {
      await supabase.from("follows").update({ status: "accepted" }).eq("follower_id", actorId).eq("following_id", currentUserId);
    } else if (type === "join_request" && cypherId) {
      // 承認できるのは主催者のみ（DBトリガーでも強制されるが、UI側でも確認）
      const { data: cypher } = await supabase.from("cyphers").select("organizer_id").eq("id", cypherId).single();
      if (!cypher || cypher.organizer_id !== currentUserId) { setActionLoading(null); return; }
      const { error } = await supabase.from("participations").update({ status: "approved" }).eq("cypher_id", cypherId).eq("profile_id", actorId);
      if (error) {
        showToast(error.message.includes("CAPACITY_FULL") ? "定員に達しているため承認できません" : "承認に失敗しました");
        setActionLoading(null);
        return;
      }
    } else if (type === "join_request" && lessonId) {
      const { data: lesson } = await supabase.from("private_lessons").select("organizer_id").eq("id", lessonId).single();
      if (!lesson || lesson.organizer_id !== currentUserId) { setActionLoading(null); return; }
      const { error } = await supabase.from("pl_participations").update({ status: "approved" }).eq("lesson_id", lessonId).eq("profile_id", actorId);
      if (error) {
        showToast(error.message.includes("CAPACITY_FULL") ? "定員に達しているため承認できません" : "承認に失敗しました");
        setActionLoading(null);
        return;
      }
    }
    setItems(prev => prev.filter(n => n.id !== notifId));
    setActionLoading(null);
  };

  const handleReject = async (notifId: string, actorId: string, type: string, cypherId?: string, lessonId?: string) => {
    setActionLoading(notifId);
    if (type === "follow_request") {
      await supabase.from("follows").delete().eq("follower_id", actorId).eq("following_id", currentUserId);
    } else if (type === "join_request" && cypherId) {
      await supabase.from("participations").delete().eq("cypher_id", cypherId).eq("profile_id", actorId);
    } else if (type === "join_request" && lessonId) {
      await supabase.from("pl_participations").delete().eq("lesson_id", lessonId).eq("profile_id", actorId);
    }
    setItems(prev => prev.filter(n => n.id !== notifId));
    setActionLoading(null);
  };

  return (
    <div {...swipeBack} style={{ position: "fixed", inset: 0, zIndex: 150, background: "#000000", overflowY: "auto", animation: "slideInRight 0.22s ease-out" }}>
      <div style={{ padding: "32px 16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D", display: "flex", alignItems: "center", gap: "16px" }}>
        <button onClick={onBack} style={{ background: "linear-gradient(180deg, #303030, #1c1c1c)", boxShadow: "0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "600", padding: "10px 16px", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px", flexShrink: 0 }}>
          <ChevronLeft size={18} strokeWidth={2.5} /> 戻る
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: "28px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.05em", color: "#F0F0F0" }}>お知らせ</h2>
        </div>
      </div>
      <div style={{ paddingBottom: "80px" }}>
        {loading ? (
          <div style={{ padding: "60px 16px", textAlign: "center", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>読み込み中...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: "60px 16px", textAlign: "center" }}>
            <Bell size={32} color="rgba(255,255,255,0.2)" />
            <p style={{ marginTop: "12px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>お知らせはありません</p>
          </div>
        ) : items.map(n => {
          const actor = n.actor as any;
          const cypher = n.cypher as any;
          const lesson = n.lesson as any;
          const actorName = actor?.dancer_name ?? "UNKNOWN";
          const cypherTitle = cypher?.title ?? lesson?.title ?? "サイファー";
          return (
            <div key={n.id} style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: n.read ? "transparent" : "rgba(220,38,38,0.06)", display: "flex", alignItems: "center", gap: "12px" }}>
              <button onClick={() => actor?.id && onViewProfile?.(actor.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>
                  {actor?.avatar_url
                    ? <img src={actor.avatar_url} alt={actorName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : actorName[0]?.toUpperCase() ?? "?"}
                </div>
              </button>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: "13px", color: "#F0F0F0", lineHeight: 1.5 }}>
                  {/* 開催リマインドは「誰々さんが」ではなくイベントが主語 */}
                  {n.type === "reminder" ? <>まもなく<strong>「{cypherTitle}」</strong>が開催されます⏰</> : <><strong>{actorName}</strong>さんが{
                    n.type === "follow"          ? "あなたをフォローしました👋" :
                    n.type === "follow_request"  ? "フォローを申請しました🔒" :
                    n.type === "join_request"    ? `「${cypherTitle}」への参加を申請しました📋` :
                    n.type === "join_approved"   ? `「${cypherTitle}」への参加を承認しました✅` :
                    n.type === "comment"         ? `「${cypherTitle}」にコメントしました💬` :
                    n.type === "join"            ? `「${cypherTitle}」に参加しました🎉` :
                                                  `「${cypherTitle}」をキャンセルしました`
                  }</>}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: "10px", color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans JP',sans-serif" }}>{timeAgo(n.created_at)}</p>
                {(n.type === "follow_request" || n.type === "join_request") && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button onClick={() => handleApprove(n.id, actor?.id, n.type, cypher?.id, lesson?.id)} disabled={actionLoading === n.id}
                      style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 14px", background: "linear-gradient(135deg, #DC2626, #A61B1B)", border: "none", borderRadius: "6px", color: "#fff", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", cursor: "pointer", opacity: actionLoading === n.id ? 0.6 : 1 }}>
                      <Check size={11} /> 承認
                    </button>
                    <button onClick={() => handleReject(n.id, actor?.id, n.type, cypher?.id, lesson?.id)} disabled={actionLoading === n.id}
                      style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 14px", background: "transparent", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "6px", color: "#F0F0F0", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", opacity: actionLoading === n.id ? 0.6 : 1 }}>
                      <X size={11} /> 拒否
                    </button>
                  </div>
                )}
              </div>
              {!n.read && n.type !== "follow_request" && n.type !== "join_request" && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#DC2626", flexShrink: 0 }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
