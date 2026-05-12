"use client";
import { useState, useEffect } from "react";
import { Radio, Users } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { GENRES, GENRE_COLORS } from "../../lib/constants";
import type { GenreKey, Cypher } from "../../lib/types";
import { CypherCard } from "../components/CypherCard";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function TopScreen({ onNav, joined, onJoin, onCardClick, user }: { onNav: (s: string) => void; joined: string[]; onJoin: (id: string) => void; onCardClick: (c: Cypher) => void; user: SupabaseUser }) {
  const [filter, setFilter] = useState<GenreKey | "ALL">("ALL");
  const [cyphers, setCyphers] = useState<Cypher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCyphers() {
      setLoading(true);
      const { data, error } = await supabase
        .from("cyphers")
        .select(`
          id, title, starts_at, location, description, max_members, status,
          profiles:organizer_id ( dancer_name ),
          cypher_genres ( genres:genre_id ( name ) ),
          participations ( count )
        `)
        .eq("status", "open")
        .order("starts_at");
      if (error) { console.error(error); setLoading(false); return; }
      const shaped: Cypher[] = (data ?? []).map((row: any) => {
        const name = row.profiles?.dancer_name ?? "UNKNOWN";
        const genres: GenreKey[] = (row.cypher_genres ?? []).map((cg: any) => cg.genres?.name as GenreKey).filter(Boolean);
        const count = row.participations?.[0]?.count ?? 0;
        return { id: row.id, title: row.title, starts_at: row.starts_at, location: row.location, description: row.description ?? "", max_members: row.max_members, status: row.status, genres, organizer: { dancer_name: name, avatar: name[0]?.toUpperCase() ?? "?" }, participant_count: Number(count), hot: Number(count) >= 5 };
      });
      setCyphers(shaped);
      setLoading(false);
    }
    fetchCyphers();
  }, []);

  const filtered = filter === "ALL" ? cyphers : cyphers.filter(c => c.genres.includes(filter));

  return (
    <div style={{ paddingBottom: "80px" }}>
      <div style={{ padding: "32px 16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "10px", fontFamily: "'Space Mono',monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", marginBottom: "6px" }}>▶ LIVE SESSIONS</div>
            <h1 style={{ margin: 0, fontSize: "42px", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "0.1em", background: "linear-gradient(135deg,#FF3D00,#FF6D00,#FFD600)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1 }}>爆踊</h1>
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono',monospace" }}>今日、ここで、踊ろう。</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
            {user.user_metadata?.avatar_url && (
              <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)" }} />
            )}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "6px", padding: "12px 16px", overflowX: "auto", scrollbarWidth: "none", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {(["ALL", ...GENRES] as (GenreKey | "ALL")[]).slice(0, 7).map(g => (
          <button key={g} onClick={() => setFilter(g)}
            style={{ flexShrink: 0, padding: "5px 12px", border: filter === g ? `1px solid ${g === "ALL" ? "#FF3D00" : GENRE_COLORS[g as GenreKey]}` : "1px solid rgba(255,255,255,0.12)", borderRadius: "2px", background: filter === g ? `${g === "ALL" ? "#FF3D00" : GENRE_COLORS[g as GenreKey]}18` : "transparent", color: filter === g ? (g === "ALL" ? "#FF3D00" : GENRE_COLORS[g as GenreKey]) : "rgba(255,255,255,0.4)", fontSize: "10px", fontFamily: "'Space Mono',monospace", cursor: "pointer" }}>
            {g}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", padding: "10px 16px", gap: "20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {[{ label: "ACTIVE", value: filtered.length, icon: <Radio size={10} /> }, { label: "DANCERS", value: filtered.reduce((a, c) => a + c.participant_count, 0), icon: <Users size={10} /> }].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#FF3D00" }}>{s.icon}</span>
            <span style={{ fontSize: "18px", fontFamily: "'Bebas Neue',sans-serif", color: "#F5F5F5" }}>{s.value}</span>
            <span style={{ fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "rgba(255,255,255,0.3)" }}>{s.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 16px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>LOADING...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>まだサイファーがありません。最初に作ろう！</div>
        ) : (
          filtered.map(c => <CypherCard key={c.id} cypher={c} onClick={() => onCardClick(c)} joined={joined.includes(c.id)} onJoin={onJoin} />)
        )}
      </div>
    </div>
  );
}
