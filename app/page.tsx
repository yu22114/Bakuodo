"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Cypher } from "./lib/types";
import { LoginScreen } from "./components/LoginScreen";
import { TopScreen } from "./components/TopScreen";
import { PostScreen } from "./components/PostScreen";
import { PublicProfileScreen } from "./components/PublicProfileScreen";
import { EditProfileScreen } from "./components/EditProfileScreen";
import { EditCypherScreen } from "./components/EditCypherScreen";
import { DetailModal } from "./components/DetailModal";
import { ConfirmModal } from "./components/ConfirmModal";
import { NotificationScreen } from "./components/NotificationScreen";
import { BottomNav } from "./components/BottomNav";

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function BakuOdori() {
  const [screen, setScreen] = useState("top");
  const [joined, setJoined] = useState<string[]>([]);
  const [detail, setDetail] = useState<Cypher | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  // TopScreen再フェッチトリガー（参加/キャンセル後にインクリメント）
  const [refreshKey, setRefreshKey] = useState(0);
  // ダンサーネーム（ヘッダー表示用）
  const [dancerName, setDancerName] = useState("");
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  // プロフィール遷移スタック（Instagram風の重ねて表示）
  const [profileStack, setProfileStack] = useState<string[]>([]);
  // 通知関連
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  // サイファー編集
  const [editCypherId, setEditCypherId] = useState<string | null>(null);

  // ログイン時にprofilesレコードを自動作成（存在しない場合のみ）
  const ensureProfile = async (u: SupabaseUser) => {
    await supabase.from("profiles").upsert(
      { id: u.id, dancer_name: u.user_metadata?.full_name ?? "" },
      { onConflict: "id", ignoreDuplicates: true }
    );
  };

  // ログイン後にダンサーネームと参加済みサイファー一覧・未読通知数をDBから取得
  const fetchUserData = async (u: SupabaseUser) => {
    const [profileRes, partsRes, notifRes] = await Promise.all([
      supabase.from("profiles").select("dancer_name, avatar_url").eq("id", u.id).single(),
      supabase.from("participations").select("cypher_id").eq("profile_id", u.id),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", u.id).eq("read", false),
    ]);
    const name = profileRes.data?.dancer_name || u.user_metadata?.full_name || "";
    if (name) setDancerName(name);
    setMyAvatarUrl((profileRes.data as any)?.avatar_url ?? null);
    if (partsRes.data) setJoined(partsRes.data.map((p: any) => p.cypher_id));
    setUnreadCount(notifRes.count ?? 0);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) { ensureProfile(u); fetchUserData(u); }
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) { ensureProfile(u); fetchUserData(u); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // サイファーIDからフルデータを取得してDetailModalを開く
  const openCypherDetail = async (cypherId: string) => {
    const { data: row } = await supabase.from("cyphers").select(`
      id, title, organizer_id, starts_at, ends_at, location, description, max_members, status,
      profiles:organizer_id ( dancer_name, avatar_url ),
      cypher_genres ( genres:genre_id ( name ) )
    `).eq("id", cypherId).single();
    if (!row) return;
    const name = (row as any).profiles?.dancer_name ?? "UNKNOWN";
    const genres: import("./lib/types").GenreKey[] = ((row as any).cypher_genres ?? [])
      .map((cg: any) => cg.genres?.name as import("./lib/types").GenreKey)
      .filter(Boolean);
    const { count: partCount } = await supabase
      .from("participations").select("id", { count: "exact", head: true }).eq("cypher_id", cypherId);
    const cypher: Cypher = {
      id: (row as any).id,
      title: (row as any).title,
      starts_at: (row as any).starts_at,
      ends_at: (row as any).ends_at ?? null,
      location: (row as any).location,
      description: (row as any).description ?? "",
      max_members: (row as any).max_members,
      status: (row as any).status,
      genres,
      organizer: { id: (row as any).organizer_id, dancer_name: name, avatar: name[0]?.toUpperCase() ?? "?", avatar_url: (row as any).profiles?.avatar_url ?? null },
      participant_count: partCount ?? 0,
      hot: (partCount ?? 0) >= 5,
    };
    setDetail(cypher);
  };

  // 参加ボタン：DBにINSERT → joinedに追加 → カード再フェッチ → 主催者に通知
  const handleJoin = async (id: string) => {
    if (!user) return;
    if (joined.includes(id)) {
      setConfirmId(id);
    } else {
      const { data: cypherCheck } = await supabase.from("cyphers").select("organizer_id, max_members").eq("id", id).single();
      if (cypherCheck?.max_members) {
        const { count: partCount } = await supabase
          .from("participations").select("id", { count: "exact", head: true }).eq("cypher_id", id);
        if (partCount !== null && partCount >= cypherCheck.max_members) {
          alert("このサイファーは定員に達しています");
          return;
        }
      }
      const { error } = await supabase.from("participations").insert({ cypher_id: id, profile_id: user.id });
      if (error) { console.error("join error:", error); return; }
      setJoined(j => [...j, id]);
      setRefreshKey(k => k + 1);
      const { data: cypherData } = await supabase.from("cyphers").select("organizer_id").eq("id", id).single();
      const organizerId = cypherData?.organizer_id;
      if (organizerId && organizerId !== user.id) {
        await supabase.from("notifications").insert({ user_id: organizerId, cypher_id: id, actor_id: user.id, type: "join" });
      }
    }
  };

  // キャンセル確定：DBからDELETE → joinedから除去 → カード再フェッチ → 主催者に通知
  const handleConfirmCancel = async () => {
    if (confirmId && user) {
      const { error } = await supabase.from("participations").delete()
        .eq("cypher_id", confirmId).eq("profile_id", user.id);
      if (error) { console.error("cancel error:", error); setConfirmId(null); return; }
      setJoined(j => j.filter(x => x !== confirmId));
      setRefreshKey(k => k + 1);
      const { data: cypherData } = await supabase.from("cyphers").select("organizer_id").eq("id", confirmId).single();
      const organizerId = cypherData?.organizer_id;
      if (organizerId && organizerId !== user.id) {
        await supabase.from("notifications").insert({ user_id: organizerId, cypher_id: confirmId, actor_id: user.id, type: "leave" });
      }
    }
    setConfirmId(null);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body,html{background:#FAFAFA;color:#111111;-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{display:none}
        textarea{font-family:inherit}
        select{appearance:none;-webkit-appearance:none}
        @keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ maxWidth: "480px", margin: "0 auto", minHeight: "100vh", background: "#FAFAFA" }}>
        {authLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "24px", color: "rgba(0,0,0,0.3)", letterSpacing: "0.2em" }}>LOADING...</div>
          </div>
        ) : !user ? (
          <LoginScreen />
        ) : (
          <>
            {screen === "top"     && <TopScreen onNav={setScreen} onCardClick={setDetail} user={user} refreshKey={refreshKey} dancerName={dancerName} myAvatarUrl={myAvatarUrl} unreadCount={unreadCount} onBell={() => setShowNotifications(true)} />}
            {screen === "post"    && <PostScreen onNav={setScreen} user={user} />}
            {screen === "profile" && <PublicProfileScreen profileId={user.id} currentUserId={user.id} onEdit={() => setScreen("edit")} onLogout={() => supabase.auth.signOut()} onViewProfile={id => setProfileStack(s => [...s, id])} onCypherClick={openCypherDetail} onEditCypher={id => setEditCypherId(id)} />}
            {screen === "edit"    && <EditProfileScreen user={user} onDancerNameChange={setDancerName} onAvatarChange={setMyAvatarUrl} onBack={() => setScreen("profile")} />}
            <BottomNav current={screen} onNav={s => { setScreen(s); setProfileStack([]); }} />
            {detail && <DetailModal cypher={detail} onClose={() => setDetail(null)} joined={joined.includes(detail.id)} onJoin={handleJoin} onViewProfile={id => { setProfileStack(s => [...s, id]); }} user={user} />}
            {confirmId && <ConfirmModal onConfirm={handleConfirmCancel} onCancel={() => setConfirmId(null)} />}
            {editCypherId && (
              <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "#FAFAFA", overflowY: "auto", animation: "slideInRight 0.22s ease-out" }}>
                <EditCypherScreen
                  cypherId={editCypherId}
                  user={user}
                  onBack={() => setEditCypherId(null)}
                  onSaved={() => { setEditCypherId(null); setRefreshKey(k => k + 1); }}
                />
              </div>
            )}
            {showNotifications && (
              <NotificationScreen
                currentUserId={user.id}
                onBack={() => { setShowNotifications(false); setUnreadCount(0); }}
                onViewProfile={id => setProfileStack(s => [...s, id])}
              />
            )}
            {profileStack.length > 0 && (
              <PublicProfileScreen
                profileId={profileStack[profileStack.length - 1]}
                currentUserId={user.id}
                onBack={() => setProfileStack(s => s.slice(0, -1))}
                onViewProfile={id => setProfileStack(s => [...s, id])}
                onCypherClick={openCypherDetail}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
