"use client";
import { useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Cypher, PrivateLesson, GenreKey } from "../lib/types";
import { supabase } from "../../lib/supabase";
import { CypherCard } from "./CypherCard";
import { PLCard } from "./PLCard";
import { Loading } from "./Loading";

type FollowedParticipant = { profile_id: string; dancer_name: string; avatar_url: string | null };

// 下バーのハートタブ：フォローしている人が参加しているCYPHER・EVENTの掲示板を、
// 「誰が参加しているか」が分かる形で一覧にする
export function FollowingActivityScreen({ user, onCardClick, onPLClick, onViewProfile, refreshKey }: {
  user: SupabaseUser;
  onCardClick: (cypher: Cypher) => void;
  onPLClick: (lesson: PrivateLesson) => void;
  onViewProfile?: (id: string) => void;
  refreshKey?: number;
}) {
  const [loading, setLoading] = useState(true);
  const [cyphers, setCyphers] = useState<{ cypher: Cypher; participants: FollowedParticipant[] }[]>([]);
  const [events, setEvents] = useState<{ lesson: PrivateLesson; participants: FollowedParticipant[] }[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      const { data: followRows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id).eq("status", "accepted");
      const followingIds = (followRows ?? []).map((f: any) => f.following_id as string);
      if (followingIds.length === 0) {
        if (!cancelled) { setCyphers([]); setEvents([]); setLoading(false); }
        return;
      }
      const followingSet = new Set(followingIds);

      // TopScreenと同じく「これから始まる＋開催中」のものだけを対象にする
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const now = new Date().toISOString();

      // ── CYPHER：フォローしている人の参加行 → サイファー本体をまとめて取得 ──
      const { data: partRows } = await supabase.from("participations")
        .select("cypher_id, profile_id, profiles:profile_id(dancer_name, avatar_url)")
        .in("profile_id", followingIds).eq("status", "approved");
      const cypherIds = Array.from(new Set((partRows ?? []).map((r: any) => r.cypher_id)));
      let cypherList: { cypher: Cypher; participants: FollowedParticipant[] }[] = [];
      if (cypherIds.length > 0) {
        const [{ data: cypherRows }, { data: countRows }] = await Promise.all([
          supabase.from("cyphers")
            .select(`
              id, title, organizer_id, starts_at, ends_at, location, description, max_members, status, visibility, requires_approval, studio_fee,
              profiles:organizer_id ( dancer_name, avatar_url, instagram ),
              cypher_genres ( genres:genre_id ( name ) )
            `)
            .in("id", cypherIds)
            .or(`starts_at.gte.${oneHourAgo},ends_at.gte.${now}`),
          supabase.from("cypher_participant_counts").select("cypher_id, approved_count").in("cypher_id", cypherIds),
        ]);
        const countMap: Record<string, number> = {};
        (countRows ?? []).forEach((c: any) => { countMap[c.cypher_id] = c.approved_count ?? 0; });
        const shaped: Cypher[] = (cypherRows ?? []).map((row: any) => {
          const name = row.profiles?.dancer_name ?? "UNKNOWN";
          const genres: GenreKey[] = (row.cypher_genres ?? []).map((cg: any) => cg.genres?.name as GenreKey).filter(Boolean);
          const count = countMap[row.id] ?? 0;
          return { id: row.id, title: row.title, starts_at: row.starts_at, ends_at: row.ends_at ?? null, location: row.location, description: row.description ?? "", max_members: row.max_members, status: row.status, visibility: row.visibility ?? "public", requires_approval: row.requires_approval ?? false, studio_fee: row.studio_fee ?? null, genres, organizer: { id: row.organizer_id, dancer_name: name, avatar: name[0]?.toUpperCase() ?? "?", avatar_url: row.profiles?.avatar_url ?? null, instagram: row.profiles?.instagram ?? null }, participant_count: count, hot: count >= 5 };
        }).filter(c => c.visibility === "public" || c.organizer.id === user.id || followingSet.has(c.organizer.id));

        const cypherMap = new Map(shaped.map(c => [c.id, c]));
        const participantsByCypher = new Map<string, FollowedParticipant[]>();
        (partRows ?? []).forEach((r: any) => {
          if (!cypherMap.has(r.cypher_id)) return;
          const list = participantsByCypher.get(r.cypher_id) ?? [];
          list.push({ profile_id: r.profile_id, dancer_name: r.profiles?.dancer_name ?? "UNKNOWN", avatar_url: r.profiles?.avatar_url ?? null });
          participantsByCypher.set(r.cypher_id, list);
        });
        cypherList = shaped
          .map(cypher => ({ cypher, participants: participantsByCypher.get(cypher.id) ?? [] }))
          .filter(x => x.participants.length > 0)
          .sort((a, b) => new Date(a.cypher.starts_at).getTime() - new Date(b.cypher.starts_at).getTime());
      }

      // ── EVENT：private_lessonsのうちkind='event'のものだけ対象にする ──
      const { data: plPartRows } = await supabase.from("pl_participations")
        .select("lesson_id, profile_id, profiles:profile_id(dancer_name, avatar_url)")
        .in("profile_id", followingIds).eq("status", "approved");
      const lessonIds = Array.from(new Set((plPartRows ?? []).map((r: any) => r.lesson_id)));
      let eventList: { lesson: PrivateLesson; participants: FollowedParticipant[] }[] = [];
      if (lessonIds.length > 0) {
        const [{ data: lessonRows }, { data: plCountRows }] = await Promise.all([
          supabase.from("private_lessons")
            .select(`
              id, title, organizer_id, starts_at, ends_at, location, description, max_members, price, target_level, visibility, requires_approval, kind,
              profiles:organizer_id ( dancer_name, avatar_url, instagram ),
              pl_genres ( genres:genre_id ( name ) )
            `)
            .in("id", lessonIds).eq("kind", "event")
            .or(`starts_at.gte.${oneHourAgo},ends_at.gte.${now}`),
          supabase.from("pl_participant_counts").select("lesson_id, approved_count").in("lesson_id", lessonIds),
        ]);
        const plCountMap: Record<string, number> = {};
        (plCountRows ?? []).forEach((c: any) => { plCountMap[c.lesson_id] = c.approved_count ?? 0; });
        const shapedPL: PrivateLesson[] = (lessonRows ?? []).map((row: any) => {
          const name = row.profiles?.dancer_name ?? "UNKNOWN";
          const genres: GenreKey[] = (row.pl_genres ?? []).map((cg: any) => cg.genres?.name as GenreKey).filter(Boolean);
          return { id: row.id, kind: "event" as const, title: row.title, starts_at: row.starts_at, ends_at: row.ends_at ?? null, location: row.location, description: row.description ?? "", max_members: row.max_members, price: row.price ?? null, target_level: row.target_level ?? "all", visibility: row.visibility ?? "public", requires_approval: row.requires_approval ?? false, genres, organizer: { id: row.organizer_id, dancer_name: name, avatar: name[0]?.toUpperCase() ?? "?", avatar_url: row.profiles?.avatar_url ?? null, instagram: row.profiles?.instagram ?? null }, participant_count: plCountMap[row.id] ?? 0 };
        }).filter(l => l.visibility === "public" || l.organizer.id === user.id || followingSet.has(l.organizer.id));

        const lessonMap = new Map(shapedPL.map(l => [l.id, l]));
        const participantsByLesson = new Map<string, FollowedParticipant[]>();
        (plPartRows ?? []).forEach((r: any) => {
          if (!lessonMap.has(r.lesson_id)) return;
          const list = participantsByLesson.get(r.lesson_id) ?? [];
          list.push({ profile_id: r.profile_id, dancer_name: r.profiles?.dancer_name ?? "UNKNOWN", avatar_url: r.profiles?.avatar_url ?? null });
          participantsByLesson.set(r.lesson_id, list);
        });
        eventList = shapedPL
          .map(lesson => ({ lesson, participants: participantsByLesson.get(lesson.id) ?? [] }))
          .filter(x => x.participants.length > 0)
          .sort((a, b) => new Date(a.lesson.starts_at).getTime() - new Date(b.lesson.starts_at).getTime());
      }

      if (!cancelled) { setCyphers(cypherList); setEvents(eventList); setLoading(false); }
    }
    run();
    return () => { cancelled = true; };
  }, [user.id, refreshKey]);

  // カードの下に「誰が参加しているか」を名前だけで並べる帯。
  // 画面に収まらない人数は折り返さず、横スクロールで見られるようにする
  const ParticipantStrip = ({ participants }: { participants: FollowedParticipant[] }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 4px" }}>
      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", fontFamily: "'Noto Sans JP',sans-serif", flexShrink: 0 }}>参加</span>
      <div className="bd-scroll" style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
        {participants.map(p => (
          <button key={p.profile_id} onClick={() => onViewProfile?.(p.profile_id)}
            style={{ flexShrink: 0, background: "none", border: "none", padding: 0, cursor: onViewProfile ? "pointer" : "default" }}>
            <span style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", whiteSpace: "nowrap" }}>{p.dancer_name}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flexShrink: 0, padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D" }}>
        <h2 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "32px", color: "#F0F0F0" }}>フォロー中</h2>
        <p style={{ margin: "6px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans JP',sans-serif" }}>
          フォローしている人が参加するCYPHER・EVENTをまとめて見られます
        </p>
      </div>

      <div className="bd-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {loading ? (
          <Loading />
        ) : cyphers.length === 0 && events.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 16px", color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px", lineHeight: 1.7 }}>
            フォロー中の人が参加しているCYPHER・EVENTはまだありません
          </div>
        ) : (
          <>
            {cyphers.length > 0 && (
              <div style={{ marginBottom: events.length > 0 ? "24px" : 0 }}>
                <div style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: "10px" }}>CYPHER</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {cyphers.map(({ cypher, participants }, i) => (
                    <div key={cypher.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <CypherCard cypher={cypher} index={i} onClick={() => onCardClick(cypher)} />
                      <ParticipantStrip participants={participants} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {events.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: "10px" }}>EVENT</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {events.map(({ lesson, participants }, i) => (
                    <div key={lesson.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <PLCard lesson={lesson} index={i} onClick={() => onPLClick(lesson)} />
                      <ParticipantStrip participants={participants} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <div style={{ height: "80px" }} />
      </div>
    </div>
  );
}
