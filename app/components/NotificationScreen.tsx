"use client";
import { useState, useEffect } from "react";
import { Bell, ChevronLeft } from "lucide-react";
import { supabase } from "../../lib/supabase";

export function NotificationScreen({ currentUserId, onBack, onViewProfile }: {
  currentUserId: string;
  onBack: () => void;
  onViewProfile?: (id: string) => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        .select("id, type, read, created_at, actor:actor_id(id,dancer_name), cypher:cypher_id(id,title)")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(50);
      setItems(data ?? []);
      setLoading(false);
      await supabase.from("notifications").update({ read: true }).eq("user_id", currentUserId).eq("read", false);
    }
    fetchAndMarkRead();
  }, [currentUserId]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "#FAFAFA", overflowY: "auto", animation: "slideInRight 0.22s ease-out" }}>
      <div style={{ padding: "32px 16px 20px", borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#FFFFFF", display: "flex", alignItems: "center", gap: "16px" }}>
        <button onClick={onBack} style={{ background: "rgba(0,0,0,0.06)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#111111", fontFamily: "'Space Mono',monospace", fontSize: "13px", fontWeight: "600", padding: "10px 16px", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px", flexShrink: 0 }}>
          <ChevronLeft size={18} strokeWidth={2.5} /> 戻る
        </button>
        <div>
          <div style={{ fontSize: "10px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.35)", letterSpacing: "0.2em" }}>▶ NOTIFICATIONS</div>
          <h2 style={{ margin: 0, fontSize: "28px", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "0.05em" }}>お知らせ</h2>
        </div>
      </div>
      <div style={{ paddingBottom: "80px" }}>
        {loading ? (
          <div style={{ padding: "60px 16px", textAlign: "center", color: "rgba(0,0,0,0.3)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>読み込み中...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: "60px 16px", textAlign: "center" }}>
            <Bell size={32} color="rgba(0,0,0,0.15)" />
            <p style={{ marginTop: "12px", color: "rgba(0,0,0,0.3)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>お知らせはありません</p>
          </div>
        ) : items.map(n => {
          const actor = n.actor as any;
          const cypher = n.cypher as any;
          const actorName = actor?.dancer_name ?? "UNKNOWN";
          const cypherTitle = cypher?.title ?? "サイファー";
          return (
            <div key={n.id} style={{ padding: "14px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: n.read ? "transparent" : "rgba(255,61,0,0.03)", display: "flex", alignItems: "center", gap: "12px" }}>
              <button onClick={() => actor?.id && onViewProfile?.(actor.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg,#FF3D00,#FF6D00)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontFamily: "'Bebas Neue',sans-serif", color: "#fff" }}>
                  {actorName[0]?.toUpperCase() ?? "?"}
                </div>
              </button>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: "13px", color: "#111", lineHeight: 1.5 }}>
                  <strong>{actorName}</strong>さんが{
                    n.type === "follow"   ? "あなたをフォローしました👋" :
                    n.type === "comment"  ? `「${cypherTitle}」にコメントしました💬` :
                    n.type === "join"     ? `「${cypherTitle}」に参加しました🎉` :
                                           `「${cypherTitle}」をキャンセルしました`
                  }
                </p>
                <p style={{ margin: "3px 0 0", fontSize: "10px", color: "rgba(0,0,0,0.4)", fontFamily: "'Space Mono',monospace" }}>{timeAgo(n.created_at)}</p>
              </div>
              {!n.read && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#FF3D00", flexShrink: 0 }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
