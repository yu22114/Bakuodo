"use client";
import { useState, useEffect } from "react";
import { Radio, Users, Bell, Search, X, SlidersHorizontal, Navigation, Loader } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { Cypher, PrivateLesson, GenreKey } from "../lib/types";
import { GENRES, GENRE_COLORS, timeUntil, formatDate, formatEndTime, calcDistanceM } from "../lib/constants";
import { CypherCard } from "./CypherCard";
import { PLCard } from "./PLCard";
import { SpotCard } from "./SpotCard";

export function TopScreen({ onNav, onCardClick, onPLClick, onViewProfile, user, refreshKey, dancerName, myAvatarUrl, unreadCount, onBell }: {
  onNav: (s: string) => void;
  onCardClick: (c: Cypher) => void;
  onPLClick: (l: PrivateLesson) => void;
  onViewProfile?: (id: string) => void;
  user: SupabaseUser;
  refreshKey: number;
  dancerName: string;
  myAvatarUrl: string | null;
  unreadCount: number;
  onBell: () => void;
}) {
  const [section, setSection] = useState<"cypher" | "pl" | "spots">("cypher");
  const [spots, setSpots] = useState<{ id: string; name: string; location: string; description: string | null; latitude: number | null; longitude: number | null }[]>([]);
  const [cyphers, setCyphers] = useState<Cypher[]>([]);
  const [lessons, setLessons] = useState<PrivateLesson[]>([]);
  const [loading, setLoading] = useState(true);
  // 検索・フィルター
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<GenreKey[]>([]);
  const [dateFilter, setDateFilter] = useState<"ALL" | "today" | "tomorrow" | "week">("ALL");
  const [areaText, setAreaText] = useState("");
  // 現在地
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    async function fetchCyphers() {
      setLoading(true);
      const [cypherRes, partRes, followRes] = await Promise.all([
        supabase
          .from("cyphers")
          .select(`
            id, title, organizer_id, starts_at, ends_at, location, description, max_members, status, visibility, requires_approval,
            profiles:organizer_id ( dancer_name, avatar_url ),
            cypher_genres ( genres:genre_id ( name ) )
          `)
          .gte("starts_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
          .order("starts_at"),
        supabase.from("participations").select("cypher_id").eq("status", "approved"),
        supabase.from("follows").select("following_id").eq("follower_id", user.id).eq("status", "accepted"),
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
        return { id: row.id, title: row.title, starts_at: row.starts_at, ends_at: row.ends_at ?? null, location: row.location, description: row.description ?? "", max_members: row.max_members, status: row.status, visibility: row.visibility ?? "public", requires_approval: row.requires_approval ?? false, genres, organizer: { id: row.organizer_id, dancer_name: name, avatar: name[0]?.toUpperCase() ?? "?", avatar_url: row.profiles?.avatar_url ?? null }, participant_count: count, hot: count >= 5 };
      }).filter((c: any) =>
        // プライベートサイファーは自分が主催 or フォロワーのみ表示
        c.visibility === "public" || c.organizer.id === user.id || followingIds.has(c.organizer.id)
      );

      shaped.sort((a, b) => {
        const aF = followingIds.has(a.organizer.id) ? 0 : 1;
        const bF = followingIds.has(b.organizer.id) ? 0 : 1;
        if (aF !== bF) return aF - bF;
        return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
      });
      setCyphers(shaped);

      // PLフェッチ
      const [plRes, plPartRes] = await Promise.all([
        supabase.from("private_lessons").select(`
          id, title, organizer_id, starts_at, ends_at, location, description, max_members, price, target_level, visibility, requires_approval,
          profiles:organizer_id ( dancer_name, avatar_url ),
          pl_genres ( genres:genre_id ( name ) )
        `).gte("starts_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()).order("starts_at"),
        supabase.from("pl_participations").select("lesson_id").eq("status", "approved"),
      ]);
      if (plRes.data) {
        const plCountMap: Record<string, number> = {};
        (plPartRes.data ?? []).forEach((p: any) => { plCountMap[p.lesson_id] = (plCountMap[p.lesson_id] ?? 0) + 1; });
        const shapedPL: PrivateLesson[] = (plRes.data ?? []).map((row: any) => {
          const name = row.profiles?.dancer_name ?? "UNKNOWN";
          const genres: GenreKey[] = (row.pl_genres ?? []).map((cg: any) => cg.genres?.name as GenreKey).filter(Boolean);
          return { id: row.id, title: row.title, starts_at: row.starts_at, ends_at: row.ends_at ?? null, location: row.location, description: row.description ?? "", max_members: row.max_members, price: row.price ?? null, target_level: row.target_level ?? "all", visibility: row.visibility ?? "public", requires_approval: row.requires_approval ?? false, genres, organizer: { id: row.organizer_id, dancer_name: name, avatar: name[0]?.toUpperCase() ?? "?", avatar_url: row.profiles?.avatar_url ?? null }, participant_count: plCountMap[row.id] ?? 0 };
        }).filter((l: PrivateLesson) => l.visibility === "public" || l.organizer.id === user.id || followingIds.has(l.organizer.id));
        setLessons(shapedPL);
      }

      setLoading(false);
    }
    fetchCyphers();

    // スポット一覧は変わらないので一度だけ取得
    supabase.from("spots").select("id, name, location, description, latitude, longitude").order("created_at").then(({ data }) => {
      if (data) setSpots(data);
    });
  }, [refreshKey]);

  // 日程フィルター用
  const now = new Date();
  const todayStr = now.toDateString();
  const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowStr = tomorrowDate.toDateString();
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);

  const filtered = cyphers.filter(c => {
    if (selectedGenres.length > 0 && !selectedGenres.some(g => c.genres.includes(g))) return false;
    if (dateFilter !== "ALL") {
      const d = new Date(c.starts_at).toDateString();
      if (dateFilter === "today" && d !== todayStr) return false;
      if (dateFilter === "tomorrow" && d !== tomorrowStr) return false;
      if (dateFilter === "week" && new Date(c.starts_at) > weekEnd) return false;
    }
    if (areaText.trim()) {
      if (!c.location.toLowerCase().includes(areaText.trim().toLowerCase())) return false;
    }
    return true;
  });

  const activeFilterCount = (selectedGenres.length > 0 ? 1 : 0) + (dateFilter !== "ALL" ? 1 : 0) + (areaText.trim() ? 1 : 0);

  // 現在地取得 → 逆ジオコードでエリア名をareaTextに反映
  const handleUseLocation = async () => {
    if (!navigator.geolocation) { alert("この端末では位置情報が使えません"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setUserLocation({ lat, lng });
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja`);
        const data = await res.json();
        const addr = data.address;
        // 市区町村レベルの名前を取得（suburb > city_district > neighbourhood > city > town）
        const area = addr.suburb ?? addr.city_district ?? addr.neighbourhood ?? addr.city ?? addr.town ?? addr.county ?? "";
        if (area) setAreaText(area);
      } catch { /* 逆ジオコード失敗しても位置情報はセット済み */ }
      setLocating(false);
    }, () => {
      alert("位置情報の取得に失敗しました。ブラウザの設定を確認してください。");
      setLocating(false);
    });
  };

  // スポットを距離順にソート
  const sortedSpots = userLocation
    ? [...spots].sort((a, b) => {
        const dA = (a.latitude && a.longitude) ? calcDistanceM(userLocation.lat, userLocation.lng, a.latitude, a.longitude) : Infinity;
        const dB = (b.latitude && b.longitude) ? calcDistanceM(userLocation.lat, userLocation.lng, b.latitude, b.longitude) : Infinity;
        return dA - dB;
      })
    : spots;
  const activeCount = filtered.filter(c => timeUntil(c.starts_at) !== "終了").length;
  const dancerCount = filtered.reduce((a, c) => a + c.participant_count, 0);

  return (
    <div style={{ paddingBottom: "80px" }}>
      {/* ヘッダー */}
      <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#FFFFFF" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
          <div />
          <h1 style={{ margin: 0, fontSize: "42px", fontFamily: "'Rampart One',sans-serif", letterSpacing: "0.05em", background: "linear-gradient(135deg,#FF3D00 0%,#2563EB 50%,#16A34A 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1, filter: "drop-shadow(0 0 12px rgba(255,61,0,0.15))", textAlign: "center" }}>爆踊</h1>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
            {/* 検索ボタン */}
            <button onClick={() => setSearchOpen(true)} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "6px" }}>
              <Search size={22} color={activeFilterCount > 0 ? "#FF3D00" : "rgba(0,0,0,0.45)"} />
              {activeFilterCount > 0 && (
                <span style={{ position: "absolute", top: "2px", right: "2px", background: "#FF3D00", color: "#fff", fontSize: "9px", fontFamily: "'Space Mono',monospace", fontWeight: "bold", minWidth: "16px", height: "16px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", transform: "translate(4px,-4px)", lineHeight: 1 }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button onClick={onBell} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "6px" }}>
              <Bell size={22} color="rgba(0,0,0,0.45)" />
              {unreadCount > 0 && (
                <span style={{ position: "absolute", top: "2px", right: "2px", background: "#FF3D00", color: "#fff", fontSize: "9px", fontFamily: "'Space Mono',monospace", fontWeight: "bold", minWidth: "16px", height: "16px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", transform: "translate(4px,-4px)", lineHeight: 1 }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* セクション切り替え */}
      <div style={{ display: "flex", background: "#FFFFFF", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
        {([["cypher", "CYPHER", "#FF3D00"], ["pl", "LESSON", "#2563EB"], ["spots", "SPOTS", "#16A34A"]] as const).map(([key, label, color]) => (
          <button key={key} onClick={() => setSection(key)}
            style={{ flex: 1, padding: "12px 4px", border: "none", borderBottom: `2px solid ${section === key ? color : "transparent"}`, background: section === key ? `${color}0f` : "transparent", color: section === key ? color : "rgba(0,0,0,0.4)", fontSize: "10px", fontFamily: "'Space Mono',monospace", cursor: "pointer", fontWeight: section === key ? "bold" : "normal", letterSpacing: "0.06em", transition: "all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ジャンルチップ（横スクロール） */}
      {section === "cypher" && (
        <div style={{ display: "flex", gap: "6px", padding: "10px 16px", overflowX: "auto", scrollbarWidth: "none", borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#FFFFFF" }}>
          {(["ALL", ...GENRES] as (GenreKey | "ALL")[]).map(g => {
            const sel = g === "ALL" ? selectedGenres.length === 0 : selectedGenres.includes(g as GenreKey);
            const col = g === "ALL" ? "#FF3D00" : GENRE_COLORS[g as GenreKey];
            return (
              <button key={g} onClick={() => setSelectedGenres(prev => g === "ALL" ? [] : prev.includes(g as GenreKey) ? prev.filter(x => x !== g) : [...prev, g as GenreKey])}
                style={{ flexShrink: 0, padding: "5px 12px", border: sel ? `1px solid ${col}` : "1px solid rgba(0,0,0,0.12)", borderRadius: "20px", background: sel ? `${col}18` : "transparent", color: sel ? col : "rgba(0,0,0,0.45)", fontSize: "10px", fontFamily: "'Space Mono',monospace", cursor: "pointer", fontWeight: sel ? "bold" : "normal" }}>
                {g}
              </button>
            );
          })}
        </div>
      )}

      {/* コンテンツ */}
      {section === "spots" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px 16px", background: "linear-gradient(180deg, rgba(22,163,74,0.04) 0%, #F5F7FA 120px)" }}>
          <div style={{ padding: "8px 12px", background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)", borderRadius: "6px", fontSize: "10px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.5)", lineHeight: 1.6 }}>
            📍 ダンサーの聖地です。今そこにいる人はチェックインを！<span style={{ color: "rgba(0,0,0,0.35)" }}> (チェックインは3時間で自動退場)</span>
          </div>
          {sortedSpots.length === 0
            ? <div style={{ textAlign: "center", padding: "40px", color: "rgba(0,0,0,0.35)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>スポット情報はまだありません</div>
            : sortedSpots.map(s => <SpotCard key={s.id} spot={s} user={user} userLocation={userLocation} onViewProfile={id => onViewProfile?.(id)} />)}
        </div>
      ) : section === "pl" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 16px", background: "linear-gradient(180deg, rgba(37,99,235,0.04) 0%, #F5F7FA 120px)" }}>
          {loading
            ? <div style={{ textAlign: "center", padding: "40px", color: "rgba(0,0,0,0.35)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>LOADING...</div>
            : lessons.length === 0
              ? <div style={{ textAlign: "center", padding: "40px", color: "rgba(0,0,0,0.35)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>まだプライベートレッスンがありません</div>
              : lessons.map(l => <PLCard key={l.id} lesson={l} onClick={() => onPLClick(l)} />)}
        </div>
      ) : (
        <>
          {/* ACTIVE/DANCERS */}
          <div style={{ display: "flex", padding: "10px 16px", gap: "20px", borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#FFFFFF", alignItems: "center" }}>
            {[{ label: "ACTIVE", value: activeCount, icon: <Radio size={10} /> }, { label: "DANCERS", value: dancerCount, icon: <Users size={10} /> }].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: "#FF3D00" }}>{s.icon}</span>
                <span style={{ fontSize: "18px", fontFamily: "'Bebas Neue',sans-serif", color: "#111111" }}>{s.value}</span>
                <span style={{ fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.35)" }}>{s.label}</span>
              </div>
            ))}
            {activeFilterCount > 0 && (
              <button onClick={() => { setSelectedGenres([]); setDateFilter("ALL"); setAreaText(""); }}
                style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px", background: "rgba(255,61,0,0.08)", border: "1px solid rgba(255,61,0,0.2)", borderRadius: "12px", padding: "3px 10px", fontSize: "10px", fontFamily: "'Space Mono',monospace", color: "#FF3D00", cursor: "pointer" }}>
                <X size={10} /> フィルター解除
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 16px", background: "#F5F7FA" }}>
            {loading
              ? <div style={{ textAlign: "center", padding: "40px", color: "rgba(0,0,0,0.35)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>LOADING...</div>
              : filtered.length === 0
                ? <div style={{ textAlign: "center", padding: "40px", color: "rgba(0,0,0,0.35)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>条件に合うサイファーがありません</div>
                : filtered.map(c => <CypherCard key={c.id} cypher={c} onClick={() => onCardClick(c)} />)}
          </div>
        </>
      )}

      {/* 検索ドロワー */}
      {searchOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }} onClick={() => setSearchOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", margin: "0 auto", background: "#FFFFFF", borderRadius: "16px 16px 0 0", padding: "24px 20px 40px", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <SlidersHorizontal size={18} color="#111" />
                <span style={{ fontSize: "18px", fontFamily: "'Bebas Neue',sans-serif", color: "#111", letterSpacing: "0.05em" }}>サイファーを検索</span>
              </div>
              <button onClick={() => setSearchOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.4)", padding: "4px" }}><X size={20} /></button>
            </div>

            {/* エリア */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.45)", letterSpacing: "0.15em", marginBottom: "8px" }}>AREA</div>
              <div style={{ position: "relative", marginBottom: "8px" }}>
                <Search size={14} color="rgba(0,0,0,0.3)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={areaText}
                  onChange={e => setAreaText(e.target.value)}
                  placeholder="例: 新宿、渋谷、横浜（部分一致）"
                  style={{ width: "100%", padding: "10px 12px 10px 36px", background: "#F5F7FA", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                />
                {areaText && <button onClick={() => setAreaText("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.3)", padding: "2px" }}><X size={14} /></button>}
              </div>
              <button onClick={handleUseLocation} disabled={locating}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: userLocation ? "rgba(22,163,74,0.08)" : "#F5F7FA", border: `1px solid ${userLocation ? "rgba(22,163,74,0.3)" : "rgba(0,0,0,0.1)"}`, borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontFamily: "'Space Mono',monospace", color: userLocation ? "#16A34A" : "rgba(0,0,0,0.5)", opacity: locating ? 0.6 : 1 }}>
                {locating ? <Loader size={13} style={{ animation: "spin 0.7s linear infinite" }} /> : <Navigation size={13} />}
                {locating ? "取得中..." : userLocation ? "現在地を使用中" : "現在地から検索"}
              </button>
            </div>

            {/* 日程 */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.45)", letterSpacing: "0.15em", marginBottom: "8px" }}>DATE</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {([["ALL", "すべて"], ["today", `今日 ${now.getMonth()+1}/${now.getDate()}`], ["tomorrow", `明日 ${tomorrowDate.getMonth()+1}/${tomorrowDate.getDate()}`], ["week", "今週"]] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setDateFilter(val)}
                    style={{ padding: "8px 16px", border: dateFilter === val ? "1px solid #FF3D00" : "1px solid rgba(0,0,0,0.1)", borderRadius: "20px", background: dateFilter === val ? "rgba(255,61,0,0.08)" : "transparent", color: dateFilter === val ? "#FF3D00" : "rgba(0,0,0,0.5)", fontSize: "11px", fontFamily: "'Space Mono',monospace", cursor: "pointer", fontWeight: dateFilter === val ? "bold" : "normal" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setSearchOpen(false)}
              style={{ width: "100%", padding: "14px", border: "none", borderRadius: "8px", background: "#FF3D00", color: "#fff", fontSize: "14px", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "0.15em", cursor: "pointer" }}>
              {filtered.length}件 表示する
            </button>
            {activeFilterCount > 0 && (
              <button onClick={() => { setSelectedGenres([]); setDateFilter("ALL"); setAreaText(""); setSearchOpen(false); }}
                style={{ width: "100%", marginTop: "10px", padding: "12px", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "8px", background: "transparent", color: "rgba(0,0,0,0.45)", fontSize: "12px", fontFamily: "'Space Mono',monospace", cursor: "pointer" }}>
                フィルターをリセット
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
