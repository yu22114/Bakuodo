"use client";
import { useState, useEffect } from "react";
import { Clock, X, Pencil, Trash2, LogOut, Menu, ChevronLeft, Link, BookOpen, FileText, MessageCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { GenreKey } from "../lib/types";
import { formatDate, timeUntil } from "../lib/constants";
import { GenreBadge } from "./GenreBadge";

export function PublicProfileScreen({ profileId, currentUserId, onBack, onEdit, onLogout, onViewProfile, onCypherClick, onLessonClick, onEditCypher }: {
  profileId: string;
  currentUserId: string;
  onBack?: () => void;
  onEdit?: () => void;
  onLogout?: () => void;
  onViewProfile?: (id: string) => void;
  onCypherClick?: (cypherId: string) => void;
  onLessonClick?: (lessonId: string) => void;
  onEditCypher?: (cypherId: string) => void;
}) {
  const isOwn = profileId === currentUserId;
  type ProfileData = { dancer_name: string; genres: GenreKey[]; instagram: string | null; dance_years: number | null; age_group: string | null; gender: string | null; avatar_url: string | null; is_private: boolean };
  type HostedCypher = { id: string; title: string; starts_at: string; location: string; participant_count: number };
  type JoinedCypher = { id: string; title: string; starts_at: string; location: string; organizer_name: string };
  type HostedLesson = { id: string; title: string; starts_at: string; location: string };

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [followStatus, setFollowStatus] = useState<"none" | "pending" | "accepted">("none");
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [hostedCyphers, setHostedCyphers] = useState<HostedCypher[]>([]);
  const [hostedLessons, setHostedLessons] = useState<HostedLesson[]>([]);
  const [joinedCyphers, setJoinedCyphers] = useState<JoinedCypher[]>([]);
  const [mainTab, setMainTab] = useState<"profile" | "cyphers">("profile");
  const [cypherTab, setCypherTab] = useState<"joined" | "hosted">("joined");
  const [loading, setLoading] = useState(true);
  const [participantSheet, setParticipantSheet] = useState<{ title: string; participants: Array<{ profile_id: string; dancer_name: string; avatar_url: string | null }> } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [followSheet, setFollowSheet] = useState<{ type: "followers" | "following"; users: { id: string; dancer_name: string; avatar_url: string | null }[] } | null>(null);
  const [followSheetLoading, setFollowSheetLoading] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const [profileRes, hostedRes, hostedLessonsRes, allPartsRes, followersRes, followingRes] = await Promise.all([
        supabase.from("profiles").select("dancer_name, genres, instagram, dance_years, age_group, gender, avatar_url, is_private").eq("id", profileId).single(),
        supabase.from("cyphers").select("id, title, starts_at, location").eq("organizer_id", profileId).order("starts_at", { ascending: false }),
        supabase.from("private_lessons").select("id, title, starts_at, location").eq("organizer_id", profileId).order("starts_at", { ascending: false }),
        supabase.from("participations").select("cypher_id"),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", profileId).eq("status", "accepted"),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", profileId),
      ]);
      if (profileRes.data) {
        const d = profileRes.data as any;
        setProfileData({ dancer_name: d.dancer_name ?? "", genres: (d.genres ?? []) as GenreKey[], instagram: d.instagram ?? null, dance_years: d.dance_years ?? null, age_group: d.age_group ?? null, gender: d.gender ?? null, avatar_url: d.avatar_url ?? null, is_private: d.is_private ?? false });
      }
      setFollowerCount(followersRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);
      if (!isOwn && currentUserId) {
        const { data: myFollow } = await supabase.from("follows").select("id, status").eq("follower_id", currentUserId).eq("following_id", profileId).maybeSingle();
        setFollowStatus((myFollow as any)?.status === "accepted" ? "accepted" : (myFollow as any)?.status === "pending" ? "pending" : "none");
      }
      const countMap: Record<string, number> = {};
      (allPartsRes.data ?? []).forEach((p: any) => { countMap[p.cypher_id] = (countMap[p.cypher_id] ?? 0) + 1; });
      if (hostedRes.data) {
        setHostedCyphers((hostedRes.data as any[]).map(c => ({ id: c.id, title: c.title, starts_at: c.starts_at, location: c.location, participant_count: countMap[c.id] ?? 0 })));
      }
      if (hostedLessonsRes.data) {
        setHostedLessons((hostedLessonsRes.data as any[]).map(l => ({ id: l.id, title: l.title, starts_at: l.starts_at, location: l.location })));
      }
      if (isOwn) {
        const { data: joinedData } = await supabase.from("participations")
          .select("cyphers:cypher_id(id, title, starts_at, location, profiles:organizer_id(dancer_name))")
          .eq("profile_id", profileId);
        if (joinedData) {
          setJoinedCyphers((joinedData as any[]).map(row => row.cyphers).filter(Boolean)
            .map((c: any) => ({ id: c.id, title: c.title, starts_at: c.starts_at, location: c.location, organizer_name: c.profiles?.dancer_name ?? "UNKNOWN" })));
        }
      }
      setLoading(false);
    }
    fetchAll();
  }, [profileId, currentUserId, isOwn]);

  const handleFollow = async () => {
    if (isOwn || followLoading || !currentUserId) return;
    setFollowLoading(true);
    if (followStatus === "accepted") {
      // フォロー解除
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", profileId);
      setFollowStatus("none");
      setFollowerCount(n => n - 1);
    } else if (followStatus === "pending") {
      // 申請キャンセル
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", profileId);
      setFollowStatus("none");
    } else {
      // 新規フォロー or 申請。status（鍵アカならpending）と相手への通知はDBトリガーが決める
      const { data, error } = await supabase.from("follows")
        .insert({ follower_id: currentUserId, following_id: profileId })
        .select("status")
        .single();
      if (!error && data) {
        const status = data.status === "pending" ? "pending" : "accepted";
        if (status === "accepted") setFollowerCount(n => n + 1);
        setFollowStatus(status);
      }
    }
    setFollowLoading(false);
  };

  const openFollowSheet = async (type: "followers" | "following") => {
    setFollowSheetLoading(true);
    setFollowSheet({ type, users: [] });
    if (type === "followers") {
      const { data } = await supabase.from("follows").select("follower_id, profiles:follower_id(dancer_name, avatar_url)").eq("following_id", profileId);
      setFollowSheet({ type, users: (data ?? []).map((r: any) => ({ id: r.follower_id, dancer_name: r.profiles?.dancer_name ?? "UNKNOWN", avatar_url: r.profiles?.avatar_url ?? null })) });
    } else {
      const { data } = await supabase.from("follows").select("following_id, profiles:following_id(dancer_name, avatar_url)").eq("follower_id", profileId);
      setFollowSheet({ type, users: (data ?? []).map((r: any) => ({ id: r.following_id, dancer_name: r.profiles?.dancer_name ?? "UNKNOWN", avatar_url: r.profiles?.avatar_url ?? null })) });
    }
    setFollowSheetLoading(false);
  };

  const handleOpenParticipants = async (cypher: HostedCypher) => {
    const { data } = await supabase.from("participations").select("profile_id, profiles:profile_id(dancer_name, avatar_url)").eq("cypher_id", cypher.id);
    setParticipantSheet({ title: cypher.title, participants: (data ?? []).map((row: any) => ({ profile_id: row.profile_id, dancer_name: row.profiles?.dancer_name ?? "UNKNOWN", avatar_url: row.profiles?.avatar_url ?? null })) });
  };

  const handleDeleteCypher = async () => {
    if (!deleteConfirmId) return;
    await supabase.from("participations").delete().eq("cypher_id", deleteConfirmId);
    await supabase.from("cypher_genres").delete().eq("cypher_id", deleteConfirmId);
    const { error } = await supabase.from("cyphers").delete().eq("id", deleteConfirmId).eq("organizer_id", currentUserId);
    if (!error) setHostedCyphers(prev => prev.filter(c => c.id !== deleteConfirmId));
    setDeleteConfirmId(null);
  };

  const name = profileData?.dancer_name || "DANCER";

  // 主催レッスン一覧（CYPHERタブ内に表示）
  const lessonRows = hostedLessons.length > 0 && (
    <div style={{ marginTop: "12px" }}>
      <div style={{ fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.35)", letterSpacing: "0.15em", margin: "0 0 6px 2px" }}>LESSON / レッスン</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {hostedLessons.map(l => { const { date, time } = formatDate(l.starts_at); const ended = timeUntil(l.starts_at) === "終了"; return (
          <div key={l.id} onClick={() => onLessonClick?.(l.id)} style={{ padding: "10px 14px", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderLeft: "3px solid #2563EB", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: onLessonClick ? "pointer" : "default", opacity: ended ? 0.5 : 1 }}>
            <div>
              <div style={{ fontSize: "14px", fontFamily: "'Bebas Neue',sans-serif", color: ended ? "rgba(0,0,0,0.4)" : "#111111" }}>{l.title}</div>
              <div style={{ fontSize: "10px", color: "rgba(0,0,0,0.4)", fontFamily: "'Space Mono',monospace", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}><Clock size={9} color="rgba(0,0,0,0.3)" />{date} {time}</div>
            </div>
            {ended
              ? <span style={{ fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.3)", padding: "2px 7px", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "3px" }}>終了</span>
              : <span style={{ fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "#2563EB", fontWeight: "bold", padding: "2px 7px", background: "rgba(37,99,235,0.08)", borderRadius: "3px" }}>LESSON</span>}
          </div>
        );})}
      </div>
    </div>
  );

  return (
    <div style={onBack
      ? { position: "fixed", inset: 0, zIndex: 150, background: "#FAFAFA", overflowY: "auto", animation: "slideInRight 0.22s ease-out" }
      : { paddingBottom: "80px", background: "#FAFAFA" }
    }>
      {/* ヘッダー */}
      <div style={{ padding: "32px 16px 20px", borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#FFFFFF" }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "rgba(0,0,0,0.06)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#111111", fontFamily: "'Space Mono',monospace", fontSize: "13px", fontWeight: "600", padding: "10px 16px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px" }}>
            <ChevronLeft size={18} strokeWidth={2.5} /> 戻る
          </button>
        )}
        {/* アバター */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "linear-gradient(135deg,#FF3D00,#FF6D00)", border: "3px solid #FFFFFF", boxShadow: "0 2px 10px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {profileData?.avatar_url
              ? <img src={profileData.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: "30px", fontFamily: "'Bebas Neue',sans-serif", color: "#fff" }}>{name[0]?.toUpperCase() ?? "?"}</span>
            }
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "10px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.35)", letterSpacing: "0.2em", marginBottom: "4px" }}>▶ DANCER PROFILE</div>
            <h2 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "24px", color: "#111111" }}>{name}</h2>
            <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
              <button onClick={() => openFollowSheet("followers")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: "11px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.5)" }}>
                  <strong style={{ color: "#111", fontSize: "13px" }}>{followerCount}</strong> フォロワー
                </span>
              </button>
              <button onClick={() => openFollowSheet("following")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: "11px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.5)" }}>
                  <strong style={{ color: "#111", fontSize: "13px" }}>{followingCount}</strong> フォロー中
                </span>
              </button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end", marginTop: "4px" }}>
            {isOwn && (
              <div style={{ position: "relative" }}>
                <button onClick={() => setMenuOpen(m => !m)}
                  style={{ background: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "8px", cursor: "pointer", padding: "8px 10px", display: "flex", alignItems: "center", color: "rgba(0,0,0,0.5)" }}>
                  <Menu size={16} />
                </button>
                {menuOpen && (<>
                  <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "10px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", overflow: "hidden", zIndex: 10, minWidth: "140px" }}>
                    <button onClick={() => { setMenuOpen(false); onEdit?.(); }}
                      style={{ width: "100%", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontFamily: "'Space Mono',monospace", color: "#111", textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                      <Pencil size={13} /> 編集
                    </button>
                    <button onClick={() => {
                        setMenuOpen(false);
                        const url = `${window.location.origin}/u/${profileId}`;
                        navigator.clipboard.writeText(url).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); });
                      }}
                      style={{ width: "100%", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontFamily: "'Space Mono',monospace", color: linkCopied ? "#16A34A" : "#111", textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                      <Link size={13} /> {linkCopied ? "コピーしました！" : "プロフィールリンクをコピー"}
                    </button>
                    <a href="/help" style={{ width: "100%", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontFamily: "'Space Mono',monospace", color: "#111", textDecoration: "none", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                      <BookOpen size={13} /> 使い方ガイド
                    </a>
                    <a href="/terms" style={{ width: "100%", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontFamily: "'Space Mono',monospace", color: "#111", textDecoration: "none", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                      <FileText size={13} /> 利用規約
                    </a>
                    <a href="https://docs.google.com/forms/d/e/1FAIpQLSdtORTcN86YUDCwq_v8f300PtwnmUENTAvGXs8AYvVS50IyGA/viewform" target="_blank" rel="noopener noreferrer" style={{ width: "100%", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontFamily: "'Space Mono',monospace", color: "#111", textDecoration: "none", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                      <MessageCircle size={13} /> 問い合わせ
                    </a>
                    <button onClick={() => { setMenuOpen(false); onLogout?.(); }}
                      style={{ width: "100%", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontFamily: "'Space Mono',monospace", color: "#FF3D00", textAlign: "left" }}>
                      <LogOut size={13} /> ログアウト
                    </button>
                  </div>
                </>)}
              </div>
            )}
            {!isOwn && currentUserId && (
              <button onClick={handleFollow} disabled={followLoading}
                style={{ border: followStatus !== "none" ? "1px solid rgba(0,0,0,0.15)" : "none", borderRadius: "8px", cursor: "pointer", padding: "9px 18px", background: followStatus !== "none" ? "transparent" : "#FF3D00", color: followStatus !== "none" ? "rgba(0,0,0,0.5)" : "#fff", fontFamily: "'Space Mono',monospace", fontSize: "11px", fontWeight: "bold", opacity: followLoading ? 0.6 : 1, flexShrink: 0 }}>
                {followStatus === "accepted" ? "フォロー中" : followStatus === "pending" ? "申請中..." : (profileData?.is_private ? "🔒 申請する" : "フォローする")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* メインタブ切り替え */}
      <div style={{ display: "flex", background: "#FFFFFF", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
        {(["profile", "cyphers"] as const).map(t => (
          <button key={t} onClick={() => setMainTab(t)}
            style={{ flex: 1, padding: "13px", border: "none", background: "transparent", borderBottom: `2px solid ${mainTab === t ? "#FF3D00" : "transparent"}`, color: mainTab === t ? "#FF3D00" : "rgba(0,0,0,0.4)", fontSize: "11px", fontFamily: "'Space Mono',monospace", cursor: "pointer", fontWeight: mainTab === t ? "bold" : "normal", letterSpacing: "0.08em" }}>
            {t === "profile" ? "PROFILE" : "CYPHER"}
          </button>
        ))}
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "rgba(0,0,0,0.35)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>LOADING...</div>
        ) : mainTab === "profile" ? (
          profileData && (profileData.instagram || profileData.age_group || profileData.dance_years != null || profileData.gender || profileData.genres.length > 0) ? (
            <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "10px", overflow: "hidden" }}>
              {profileData.instagram && (
                <a href={`https://instagram.com/${profileData.instagram}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px", borderBottom: (profileData.age_group || profileData.dance_years != null || profileData.gender || profileData.genres.length > 0) ? "1px solid rgba(0,0,0,0.07)" : "none", textDecoration: "none", background: "linear-gradient(90deg, rgba(168,85,247,0.05), transparent)" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="22" height="22" rx="6" stroke="rgba(0,0,0,0.5)" strokeWidth="1.8" fill="none"/>
                    <circle cx="12" cy="12" r="4.2" stroke="rgba(0,0,0,0.5)" strokeWidth="1.8" fill="none"/>
                    <circle cx="17.2" cy="6.8" r="1.1" fill="rgba(0,0,0,0.5)"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.35)", letterSpacing: "0.12em", marginBottom: "2px" }}>INSTAGRAM</div>
                    <div style={{ fontSize: "15px", fontFamily: "'Space Mono',monospace", color: "#A855F7", fontWeight: "bold" }}>@{profileData.instagram}</div>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: "14px", color: "#A855F7" }}>↗</span>
                </a>
              )}
              {(profileData.age_group || profileData.dance_years != null || profileData.gender || profileData.genres.length > 0) && (
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: profileData.genres.length > 0 ? "10px" : "0" }}>
                    {profileData.age_group && <span style={{ fontSize: "11px", padding: "3px 8px", background: "rgba(0,0,0,0.05)", borderRadius: "4px", color: "rgba(0,0,0,0.6)", fontFamily: "'Space Mono',monospace" }}>{profileData.age_group}</span>}
                    {profileData.dance_years != null && <span style={{ fontSize: "11px", padding: "3px 8px", background: "rgba(0,0,0,0.05)", borderRadius: "4px", color: "rgba(0,0,0,0.6)", fontFamily: "'Space Mono',monospace" }}>歴{profileData.dance_years}年</span>}
                    {profileData.gender && <span style={{ fontSize: "11px", padding: "3px 8px", background: "rgba(0,0,0,0.05)", borderRadius: "4px", color: "rgba(0,0,0,0.6)", fontFamily: "'Space Mono',monospace" }}>{profileData.gender}</span>}
                  </div>
                  {profileData.genres.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>{profileData.genres.map(g => <GenreBadge key={g} genre={g} />)}</div>}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px", color: "rgba(0,0,0,0.35)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>プロフィール情報がありません</div>
          )
        ) : (<>
          {/* CYPHERタブ：自分なら参加/主催の2タブ（過去はグレー）、他人なら主催のみ */}
          {isOwn ? (<>
            <div style={{ display: "flex", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "10px 10px 0 0", overflow: "hidden" }}>
              {(["joined", "hosted"] as const).map(t => (
                <button key={t} onClick={() => setCypherTab(t)}
                  style={{ flex: 1, padding: "13px", border: "none", background: "transparent", borderBottom: `2px solid ${cypherTab === t ? "#FF3D00" : "transparent"}`, color: cypherTab === t ? "#FF3D00" : "rgba(0,0,0,0.4)", fontSize: "11px", fontFamily: "'Space Mono',monospace", cursor: "pointer", fontWeight: cypherTab === t ? "bold" : "normal" }}>
                  {t === "joined" ? "参加" : "主催"}
                </button>
              ))}
            </div>
            <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderTop: "none", borderRadius: "0 0 10px 10px", marginTop: "-10px" }}>
              {cypherTab === "joined" ? (
                joinedCyphers.length === 0
                  ? <div style={{ textAlign: "center", padding: "32px", color: "rgba(0,0,0,0.35)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>まだ参加しているサイファーはありません</div>
                  : joinedCyphers.map(c => {
                      const { date, time } = formatDate(c.starts_at);
                      const isPast = new Date(c.starts_at) < new Date();
                      return (
                        <div key={c.id} onClick={() => onCypherClick?.(c.id)} style={{ padding: "12px 14px", borderBottom: "1px solid rgba(0,0,0,0.05)", opacity: isPast ? 0.45 : 1, cursor: onCypherClick ? "pointer" : "default" }}>
                          <div style={{ fontSize: "14px", fontFamily: "'Bebas Neue',sans-serif", color: "#111111" }}>{c.title}</div>
                          <div style={{ fontSize: "10px", color: "rgba(0,0,0,0.4)", fontFamily: "'Space Mono',monospace", marginBottom: "3px" }}>by {c.organizer_name}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "rgba(0,0,0,0.4)", fontFamily: "'Space Mono',monospace" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><Clock size={9} />{date} {time}</span>
                            {isPast && <span style={{ fontSize: "9px", padding: "1px 5px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", color: "rgba(0,0,0,0.35)" }}>終了</span>}
                          </div>
                        </div>
                      );})
              ) : (
                hostedCyphers.length === 0
                  ? <div style={{ textAlign: "center", padding: "32px", color: "rgba(0,0,0,0.35)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>まだサイファーを主催していません</div>
                  : hostedCyphers.map(c => {
                      const { date, time } = formatDate(c.starts_at);
                      const isPast = new Date(c.starts_at) < new Date();
                      return (
                        <div key={c.id} onClick={() => onCypherClick?.(c.id)} style={{ padding: "12px 14px", borderBottom: "1px solid rgba(0,0,0,0.05)", cursor: onCypherClick ? "pointer" : "default", opacity: isPast ? 0.45 : 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ fontSize: "14px", fontFamily: "'Bebas Neue',sans-serif", color: "#111111", flex: 1 }}>{c.title}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0, marginLeft: "8px" }}>
                              <span style={{ fontSize: "12px", fontFamily: "'Space Mono',monospace", color: isPast ? "rgba(0,0,0,0.3)" : "#FF3D00", fontWeight: "bold" }}>{c.participant_count}人</span>
                              {!isPast && <>
                                <button onClick={e => { e.stopPropagation(); onEditCypher?.(c.id); }} title="編集" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "rgba(0,0,0,0.3)", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}><Pencil size={13} /></button>
                                <button onClick={e => { e.stopPropagation(); setDeleteConfirmId(c.id); }} title="削除" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "rgba(0,0,0,0.25)", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={14} /></button>
                              </>}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "rgba(0,0,0,0.4)", fontFamily: "'Space Mono',monospace", marginTop: "3px" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><Clock size={9} />{date} {time}</span>
                            {isPast && <span style={{ fontSize: "9px", padding: "1px 5px", background: "rgba(0,0,0,0.05)", borderRadius: "3px", color: "rgba(0,0,0,0.35)" }}>終了</span>}
                          </div>
                        </div>
                      );})
              )}
            </div>
          </>) : (
            hostedCyphers.length === 0 && hostedLessons.length === 0
              ? <div style={{ textAlign: "center", padding: "40px", color: "rgba(0,0,0,0.35)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>まだ主催しているサイファー・レッスンはありません</div>
              : hostedCyphers.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {hostedCyphers.map(c => { const { date, time } = formatDate(c.starts_at); const ended = timeUntil(c.starts_at) === "終了"; return (
                    <div key={c.id} onClick={() => onCypherClick?.(c.id)} style={{ padding: "10px 14px", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: onCypherClick ? "pointer" : "default" }}>
                      <div>
                        <div style={{ fontSize: "14px", fontFamily: "'Bebas Neue',sans-serif", color: ended ? "rgba(0,0,0,0.4)" : "#111111" }}>{c.title}</div>
                        <div style={{ fontSize: "10px", color: "rgba(0,0,0,0.4)", fontFamily: "'Space Mono',monospace", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}><Clock size={9} color="rgba(0,0,0,0.3)" />{date} {time}</div>
                      </div>
                      {ended ? <span style={{ fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.3)", padding: "2px 7px", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "3px" }}>終了</span>
                             : <span style={{ fontSize: "11px", fontFamily: "'Space Mono',monospace", color: "#FF3D00", fontWeight: "bold" }}>{c.participant_count}人</span>}
                    </div>
                  );})}
                </div>
          )}
          {(!isOwn || cypherTab === "hosted") && lessonRows}
        </>)}
      </div>

      {/* 参加者一覧シート */}
      {participantSheet && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }} onClick={() => setParticipantSheet(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", margin: "0 auto", background: "#FFFFFF", borderRadius: "12px 12px 0 0", padding: "24px 20px 40px", maxHeight: "70vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.35)", letterSpacing: "0.15em", marginBottom: "4px" }}>PARTICIPANTS</div>
                <div style={{ fontSize: "22px", fontFamily: "'Bebas Neue',sans-serif", color: "#111111" }}>{participantSheet.title}</div>
              </div>
              <button onClick={() => setParticipantSheet(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.4)", padding: "4px" }}><X size={20} /></button>
            </div>
            {participantSheet.participants.length === 0
              ? <div style={{ textAlign: "center", padding: "32px", color: "rgba(0,0,0,0.35)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>まだ参加者はいません</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {participantSheet.participants.map(p => (
                    <button key={p.profile_id} onClick={() => { setParticipantSheet(null); onViewProfile?.(p.profile_id); }}
                      style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", background: "#F5F7FA", border: "none", borderRadius: "8px", cursor: "pointer", textAlign: "left", width: "100%" }}>
                      <div style={{ width: "38px", height: "38px", borderRadius: "50%", overflow: "hidden", background: "rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontFamily: "'Bebas Neue',sans-serif", color: "rgba(0,0,0,0.45)", flexShrink: 0 }}>
                        {p.avatar_url
                          ? <img src={p.avatar_url} alt={p.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : p.dancer_name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div style={{ fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 600, color: "#111111" }}>{p.dancer_name}</div>
                    </button>
                  ))}
                </div>
            }
          </div>
        </div>
      )}

      {/* フォロワー・フォロー一覧シート */}
      {followSheet && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setFollowSheet(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "360px", background: "#FFFFFF", borderRadius: "16px", padding: "24px 20px", maxHeight: "70vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.35)", letterSpacing: "0.15em", marginBottom: "4px" }}>
                  {followSheet.type === "followers" ? "FOLLOWERS" : "FOLLOWING"}
                </div>
                <div style={{ fontSize: "22px", fontFamily: "'Bebas Neue',sans-serif", color: "#111111" }}>
                  {followSheet.type === "followers" ? "フォロワー" : "フォロー中"}
                </div>
              </div>
              <button onClick={() => setFollowSheet(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.4)", padding: "4px" }}><X size={20} /></button>
            </div>
            {followSheetLoading
              ? <div style={{ textAlign: "center", padding: "32px", color: "rgba(0,0,0,0.35)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>読み込み中...</div>
              : followSheet.users.length === 0
                ? <div style={{ textAlign: "center", padding: "32px", color: "rgba(0,0,0,0.35)", fontFamily: "'Space Mono',monospace", fontSize: "12px" }}>まだいません</div>
                : <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {followSheet.users.map(u => (
                      <button key={u.id} onClick={() => { setFollowSheet(null); onViewProfile?.(u.id); }}
                        style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", background: "#F5F7FA", border: "none", borderRadius: "8px", cursor: "pointer", textAlign: "left", width: "100%" }}>
                        <div style={{ width: "38px", height: "38px", borderRadius: "50%", overflow: "hidden", background: "rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontFamily: "'Bebas Neue',sans-serif", color: "rgba(0,0,0,0.45)", flexShrink: 0 }}>
                          {u.avatar_url
                            ? <img src={u.avatar_url} alt={u.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : u.dancer_name[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div style={{ fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 600, color: "#111111" }}>{u.dancer_name}</div>
                      </button>
                    ))}
                  </div>
            }
          </div>
        </div>
      )}

      {/* サイファー削除確認モーダル */}
      {deleteConfirmId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setDeleteConfirmId(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#FFFFFF", borderRadius: "12px", padding: "28px 24px", width: "100%", maxWidth: "320px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>🗑️</div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "20px", color: "#111111", marginBottom: "8px" }}>サイファーを削除</div>
            <div style={{ fontSize: "13px", color: "rgba(0,0,0,0.5)", marginBottom: "24px", lineHeight: "1.6" }}>このサイファーを削除すると、参加者の記録もすべて消えます。本当に削除しますか？</div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: "12px", border: "1px solid rgba(0,0,0,0.15)", borderRadius: "8px", background: "none", cursor: "pointer", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "rgba(0,0,0,0.5)" }}>キャンセル</button>
              <button onClick={handleDeleteCypher} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", background: "#FF3D00", cursor: "pointer", fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#FFFFFF", fontWeight: "bold" }}>削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
