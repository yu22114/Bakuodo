"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Cypher, PrivateLesson } from "./lib/types";
import { fetchCypherById, fetchLessonById } from "./lib/fetchDetail";
import { joinCypher, cancelCypher, joinLesson, cancelLesson } from "./lib/participation";
import { showToast } from "./components/Toast";
import { LoginScreen } from "./components/LoginScreen";
import { TopScreen } from "./components/TopScreen";
import { PostScreen } from "./components/PostScreen";
import { PublicProfileScreen } from "./components/PublicProfileScreen";
import { EditProfileScreen } from "./components/EditProfileScreen";
import { EditCypherScreen } from "./components/EditCypherScreen";
import { DetailModal } from "./components/DetailModal";
import { PLDetailModal } from "./components/PLDetailModal";
import { ConfirmModal } from "./components/ConfirmModal";
import { NotificationScreen } from "./components/NotificationScreen";
import { BottomNav } from "./components/BottomNav";

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function BakuOdori() {
  const [screen, setScreen] = useState("top");
  const [joined, setJoined] = useState<string[]>([]);
  const [pendingJoins, setPendingJoins] = useState<string[]>([]);
  const [plDetail, setPlDetail] = useState<PrivateLesson | null>(null);
  const [plJoined, setPlJoined] = useState<string[]>([]);
  const [plPending, setPlPending] = useState<string[]>([]);
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

  // ログイン後にダンサーネームと参加済みサイファー・レッスン一覧・未読通知数をDBから取得
  const fetchUserData = async (u: SupabaseUser) => {
    const [profileRes, partsRes, plPartsRes, notifRes] = await Promise.all([
      supabase.from("profiles").select("dancer_name, avatar_url").eq("id", u.id).single(),
      supabase.from("participations").select("cypher_id, status").eq("profile_id", u.id),
      supabase.from("pl_participations").select("lesson_id, status").eq("profile_id", u.id),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", u.id).eq("read", false),
    ]);
    const name = profileRes.data?.dancer_name || u.user_metadata?.full_name || "";
    if (name) setDancerName(name);
    setMyAvatarUrl((profileRes.data as any)?.avatar_url ?? null);
    if (partsRes.data) {
      setJoined(partsRes.data.filter((p: any) => p.status !== "pending").map((p: any) => p.cypher_id));
      setPendingJoins(partsRes.data.filter((p: any) => p.status === "pending").map((p: any) => p.cypher_id));
    }
    if (plPartsRes.data) {
      setPlJoined(plPartsRes.data.filter((p: any) => p.status !== "pending").map((p: any) => p.lesson_id));
      setPlPending(plPartsRes.data.filter((p: any) => p.status === "pending").map((p: any) => p.lesson_id));
    }
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
    const cypher = await fetchCypherById(cypherId);
    if (cypher) setDetail(cypher);
  };

  // レッスンIDからフルデータを取得してPLDetailModalを開く（プロフィールのレッスン一覧用）
  const openLessonDetail = async (lessonId: string) => {
    const lesson = await fetchLessonById(lessonId);
    if (lesson) setPlDetail(lesson);
  };

  // 参加ボタン。status（承認制）・定員・通知はDBトリガーが処理する
  const handleJoin = async (id: string) => {
    if (!user) return;
    if (joined.includes(id) || pendingJoins.includes(id)) {
      setConfirmId(id);
      return;
    }
    const result = await joinCypher(user.id, id);
    if ("error" in result) { showToast(result.error); return; }
    if (result.status === "pending") {
      setPendingJoins(p => [...p, id]);
    } else {
      setJoined(j => [...j, id]);
      setRefreshKey(k => k + 1);
    }
  };

  const handlePLJoin = async (id: string) => {
    if (!user) return;
    if (plJoined.includes(id) || plPending.includes(id)) {
      const { error } = await cancelLesson(user.id, id);
      if (error) { showToast(error); return; }
      setPlJoined(j => j.filter(x => x !== id));
      setPlPending(p => p.filter(x => x !== id));
      setRefreshKey(k => k + 1);
      return;
    }
    const result = await joinLesson(user.id, id);
    if ("error" in result) { showToast(result.error); return; }
    if (result.status === "pending") {
      setPlPending(p => [...p, id]);
    } else {
      setPlJoined(j => [...j, id]);
      setRefreshKey(k => k + 1);
    }
  };

  // キャンセル確定（主催者への通知はDBトリガーが処理する）
  const handleConfirmCancel = async () => {
    if (confirmId && user) {
      const { error } = await cancelCypher(user.id, confirmId);
      if (error) { showToast(error); setConfirmId(null); return; }
      setJoined(j => j.filter(x => x !== confirmId));
      setPendingJoins(p => p.filter(x => x !== confirmId));
      setRefreshKey(k => k + 1);
    }
    setConfirmId(null);
  };

  // ─── ブラウザバックでオーバーレイを閉じる ─────────────────────────────
  // モバイルの戻るジェスチャーでサイトから離脱してしまうのを防ぐ。
  // オーバーレイが開くたびに履歴を1つ積み、popstateで最前面だけ閉じる。
  const overlayCount =
    (detail ? 1 : 0) + (plDetail ? 1 : 0) + (showNotifications ? 1 : 0) +
    (editCypherId ? 1 : 0) + (confirmId ? 1 : 0) + profileStack.length;
  const overlayStateRef = useRef({ detail, plDetail, showNotifications, editCypherId, confirmId, profileStack });
  overlayStateRef.current = { detail, plDetail, showNotifications, editCypherId, confirmId, profileStack };
  const prevOverlayCountRef = useRef(0);
  const suppressPopRef = useRef(0);

  useEffect(() => {
    const prev = prevOverlayCountRef.current;
    if (overlayCount > prev) {
      for (let i = prev; i < overlayCount; i++) history.pushState({ bdOverlay: true }, "");
    } else if (overlayCount < prev) {
      // UI操作で閉じた分の履歴エントリを消化する（このpopstateは無視）
      suppressPopRef.current += prev - overlayCount;
      history.go(overlayCount - prev);
    }
    prevOverlayCountRef.current = overlayCount;
  }, [overlayCount]);

  useEffect(() => {
    const onPop = () => {
      if (suppressPopRef.current > 0) { suppressPopRef.current--; return; }
      const s = overlayStateRef.current;
      if (s.confirmId || s.editCypherId || s.showNotifications || s.profileStack.length > 0 || s.plDetail || s.detail) {
        // 履歴エントリはすでに消費されているので、countの差分処理をスキップさせる
        prevOverlayCountRef.current -= 1;
        if (s.confirmId) setConfirmId(null);
        else if (s.editCypherId) setEditCypherId(null);
        else if (s.showNotifications) { setShowNotifications(false); setUnreadCount(0); }
        else if (s.profileStack.length > 0) setProfileStack(st => st.slice(0, -1));
        else if (s.plDetail) setPlDetail(null);
        else if (s.detail) setDetail(null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body,html{background:#FAFAFA;color:#111111;-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{display:none}
        textarea{font-family:inherit}
        select{appearance:none;-webkit-appearance:none}
        @keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes bdSlideFromRight{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
        @keyframes bdSlideFromLeft{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:translateX(0)}}
        /* 画面を開いた時、ロゴが左から転がってきて中央に止まる。
           回転量は移動距離÷半径に合わせてあるので、滑らずに転がって見える */
        @keyframes bdLogoRollIn{from{transform:translateX(-200px) rotate(-440deg)}to{transform:translateX(0) rotate(0deg)}}
      `}</style>

      <div style={{ maxWidth: "480px", margin: "0 auto", minHeight: "100vh", background: "#FAFAFA" }}>
        {authLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
            <div style={{ fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "24px", color: "rgba(0,0,0,0.3)", letterSpacing: "0.2em" }}>LOADING...</div>
          </div>
        ) : !user ? (
          <LoginScreen />
        ) : (
          <>
            {screen === "top"     && <TopScreen onNav={setScreen} onCardClick={setDetail} onPLClick={setPlDetail} onViewProfile={id => setProfileStack(s => [...s, id])} user={user} refreshKey={refreshKey} dancerName={dancerName} myAvatarUrl={myAvatarUrl} unreadCount={unreadCount} onBell={() => setShowNotifications(true)} />}
            {screen === "post"    && <PostScreen onNav={setScreen} user={user} />}
            {screen === "profile" && <PublicProfileScreen profileId={user.id} currentUserId={user.id} onEdit={() => setScreen("edit")} onLogout={() => supabase.auth.signOut()} onViewProfile={id => setProfileStack(s => [...s, id])} onCypherClick={openCypherDetail} onLessonClick={openLessonDetail} onEditCypher={id => setEditCypherId(id)} />}
            {screen === "edit"    && <EditProfileScreen user={user} onDancerNameChange={setDancerName} onAvatarChange={setMyAvatarUrl} onBack={() => setScreen("profile")} />}
            <BottomNav current={screen} onNav={s => { setScreen(s); setProfileStack([]); }} />
            {detail && <DetailModal cypher={detail} onClose={() => setDetail(null)} joined={joined.includes(detail.id)} pending={pendingJoins.includes(detail.id)} onJoin={handleJoin} onViewProfile={id => { setProfileStack(s => [...s, id]); }} user={user} />}
            {plDetail && <PLDetailModal lesson={plDetail} onClose={() => setPlDetail(null)} joined={plJoined.includes(plDetail.id)} pending={plPending.includes(plDetail.id)} onJoin={handlePLJoin} onViewProfile={id => { setProfileStack(s => [...s, id]); }} user={user} />}
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
                onLessonClick={openLessonDetail}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
