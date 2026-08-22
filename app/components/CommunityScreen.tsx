"use client";
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { formatDate } from "../lib/constants";
import { Loading } from "./Loading";

type BoardItem = { kind: "cypher" | "lesson"; id: string; title: string; starts_at: string; accent: string };

// 「コミュニティ」タブ：自分が主催 or 参加しているイベントの一覧。
// タップすると、そのイベントの参加者だけが読み書きできる掲示板（EventBoardScreen）が開く
export function CommunityScreen({ user, onOpenBoard }: {
  user: SupabaseUser;
  onOpenBoard: (target: BoardItem) => void;
}) {
  const [items, setItems] = useState<BoardItem[] | null>(null);

  useEffect(() => {
    async function fetchAll() {
      const [hostedC, joinedC, hostedL, joinedL] = await Promise.all([
        supabase.from("cyphers").select("id, title, starts_at").eq("organizer_id", user.id),
        supabase.from("participations").select("cyphers:cypher_id(id, title, starts_at)").eq("profile_id", user.id).eq("status", "approved"),
        supabase.from("private_lessons").select("id, title, starts_at, kind").eq("organizer_id", user.id),
        supabase.from("pl_participations").select("private_lessons:lesson_id(id, title, starts_at, kind)").eq("profile_id", user.id).eq("status", "approved"),
      ]);
      // 主催・参加の両方に出てくることがあるのでMapでまとめる（idで重複排除）
      const map = new Map<string, BoardItem>();
      (hostedC.data ?? []).forEach((c: any) => map.set(`cypher:${c.id}`, { kind: "cypher", id: c.id, title: c.title, starts_at: c.starts_at, accent: "#DC2626" }));
      (joinedC.data ?? []).forEach((r: any) => { const c = r.cyphers; if (c) map.set(`cypher:${c.id}`, { kind: "cypher", id: c.id, title: c.title, starts_at: c.starts_at, accent: "#DC2626" }); });
      (hostedL.data ?? []).forEach((l: any) => map.set(`lesson:${l.id}`, { kind: "lesson", id: l.id, title: l.title, starts_at: l.starts_at, accent: l.kind === "event" ? "#EAB308" : "#2563EB" }));
      (joinedL.data ?? []).forEach((r: any) => { const l = r.private_lessons; if (l) map.set(`lesson:${l.id}`, { kind: "lesson", id: l.id, title: l.title, starts_at: l.starts_at, accent: l.kind === "event" ? "#EAB308" : "#2563EB" }); });
      setItems(Array.from(map.values()).sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()));
    }
    fetchAll();
  }, [user.id]);

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flexShrink: 0, padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D" }}>
        <h2 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "32px", color: "#F0F0F0" }}>コミュニティ</h2>
        <div style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>参加者だけの掲示板</div>
      </div>
      <div className="bd-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {items === null ? (
          <Loading />
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 16px", color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>
            主催・参加しているイベントがまだありません
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {items.map(item => {
              const { date, time } = formatDate(item.starts_at);
              return (
                <div key={`${item.kind}:${item.id}`} onClick={() => onOpenBoard(item)}
                  style={{ padding: "12px 14px", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderLeft: `3px solid ${item.accent}`, borderRadius: "8px", cursor: "pointer" }}>
                  <div style={{ fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>{item.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans JP',sans-serif", marginTop: "3px" }}>
                    <Clock size={9} />{date} {time}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ height: "80px" }} />
      </div>
    </div>
  );
}
