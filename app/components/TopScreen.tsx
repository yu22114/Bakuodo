"use client";
import { useState, useEffect } from "react";
import { Radio, Users, Bell, User } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { Cypher, GenreKey } from "../lib/types";
import { GENRES, GENRE_COLORS, timeUntil } from "../lib/constants";
import { CypherCard } from "./CypherCard";

export function TopScreen({ onNav, onCardClick, user, refreshKey, dancerName, unreadCount, onBell }: {
  onNav: (s: string) => void;
  onCardClick: (c: Cypher) => void;
  user: SupabaseUser;
  refreshKey: number;
  dancerName: string;
  unreadCount: number;
  onBell: () => void;
}) {
  const [filter, setFilter] = useState<GenreKey | "ALL">("ALL");
  const [cyphers, setCyphers] = useState<Cypher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCyphers() {
      setLoading(true);
      const [cypherRes, partRes, followRes] = await Promise.all([
        supabase
          .from("cyphers")
          .select(`
            id, title, organizer_id, starts_at, ends_at, location, description, max_members, status,
            profiles:organizer_id ( dancer_name ),
            cypher_genres ( genres:genre_id ( name ) )
          `)
          .gte("starts_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
          .order("starts_at"),
        supabase.from("participations").select("cypher_id"),
        supabase.from("follows").select("following_id").eq("follower_id", user.id),
      ]);
      if (cypherRes.error) { console.error(cypherRes.error); setLoading(false); return; }

      const countMap: Record<string, number> = {};
      (partRes.data ?? []).forEach((p: any) => {
        countMap[p.cypher_id] = (countMap[p.cypher_id] ?? 0) + 1;
      });

      const followingIds = new Set((followRes.data ?? []).map((f: any) => f.following_id));

      const shaped: Cypher[] = (cypherRes.data ?? []).map((row: any) => {
        const name = row.profiles?.dancer_name ?? "UNKNOWN";
        const genres: GenreKey[] = (row.cypher_genres ?? []).map((cg: any) => cg.genres?.name as GenreKey).filter(Boolean);
        const count = countMap[row.id] ?? 0;
        return { id: row.id, title: row.title, starts_at: row.starts_at, ends_at: row.ends_at ?? null, location: row.location, description: row.description ?? "", max_members: row.max_members, status: row.status, genres, organizer: { id: row.organizer_id, dancer_name: name, avatar: name[0]?.toUpperCase() ?? "?" }, participant_count: count, hot: count >= 5 };
      });

      shaped.sort((a, b) => {
        const aF = followingIds.has(a.organizer.id) ? 0 : 1;
        const bF = followingIds.has(b.organizer.id) ? 0 : 1;
        if (aF !== bF) return aF - bF;
        return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
      });
      setCyphers(shaped);
      setLoading(false);
    }
    fetchCyphers();
  }, [refreshKey]);

  const filtered = filter === "ALL" ? cyphers : cyphers.filter(c => c.genres.includes(filter));
  const activeCount = filtered.filter(c => timeUntil(c.starts_at) !== "終了").length;
  const dancerCount = filtered.reduce((a, c) => a + c.participant_count, 0);

  return (
    <div style={{ paddingBottom: "80px" }}>
      <div style={{ padding: "32px 16px 20px", borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#FFFFFF" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "10px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.35)", letterSpacing: "0.2em", marginBottom: "6px" }}>▶ LIVE SESSIONS</div>
            <h1 style={{ margin: 0, fontSize: "42px", fontFamily: "'Rampart One',sans-serif", letterSpacing: "0.05em", background: "linear-gradient(135deg,#FF3D00,#FF6D00,#D97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1 }}>爆踊</h1>
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: "rgba(0,0,0,0.4)", fontFamily: "'Space Mono',monospace" }}>今日、ここで、踊ろう。</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
            <button onClick={onBell} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "6px" }}>
              <Bell size={22} color="rgba(0,0,0,0.45)" />
              {unreadCount > 0 && (
                <span style={{ position: "absolute", top: "2px", right: "2px", background: "#FF3D00", color: "#fff", fontSize: "9px", fontFamily: "'Space Mono',monospace", fontWeight: "bold", minWidth: "16px", height: "16px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", transform: "translate(4px,-4px)", lineHeight: 1 }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <button onClick={() => onNav("profile")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg,#FF3D00,#FF6D00)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontFamily: "'Bebas Neue',sans-serif", color: "#fff", border: "2px solid rgba(0,0,0,0.08)" }}>
                {dancerName ? dancerName[0].toUpperCase() : <User size={16} color="#fff" />}
              </div>
              {dancerName && <span style={{ fontSize: "8px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.4)", maxWidth: "48px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dancerName}</span>}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "6px", padding: "12px 16px", overflowX: "auto", scrollbarWidth: "none", borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#FFFFFF" }}>
        {(["ALL", ...GENRES] as (GenreKey | "ALL")[]).map(g => (
          <button key={g} onClick={() => setFilter(g)}
            style={{ flexShrink: 0, padding: "5px 12px", border: filter === g ? `1px solid ${g === "ALL" ? "#FF3D00" : GENRE_COLORS[g as GenreKey]}` : "1px solid rgba(0,0,0,0.12)", borderRadius: "20px", background: filter === g ? `${g === "ALL" ? "#FF3D00" : GENRE_COLORS[g as GenreKey]}15` : "transparent", color: filter === g ? (g === "ALL" ? "#FF3D00" : GENRE_COLORS[g as GenreKey]) : "rgba(0,0,0,0.45)", fontSize: "10px", fontFamily: "'Space Mono',monospace", cursor: "pointer", fontWeight: filter === g ? "bold" : "normal" }}>
            {g}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", padding: "10px 16px", gap: "20px", borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#FFFFFF" }}>
        {[
          { label: "ACTIVE", value: activeCount, icon: <Radio size={10} /> },
          { label: "DANCERS", value: dancerCount, icon: <Users size={10} /> },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#FF3D00" }}>{s.icon}</span>
            <span style={{ fontSize: "18px", fontFamily: "'Bebas Neue',sans-serif", color: "#111111" }}>{s.value}</span>
            <span style={{ fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.35)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 16px", background: "#F5F7FA" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "rgba(0,0,0,0.35)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>LOADING...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "rgba(0,0,0,0.35)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>まだサイファーがありません。最初に作ろう！</div>
        ) : (
          filtered.map(c => <CypherCard key={c.id} cypher={c} onClick={() => onCardClick(c)} />)
        )}
      </div>
    </div>
  );
}
