"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Cypher, PrivateLesson } from "./lib/types";
import { fetchCypherById, fetchLessonById } from "./lib/fetchDetail";
import { joinCypher, cancelCypher, joinLesson, cancelLesson, type EventApplicationAnswers } from "./lib/participation";
import { showToast } from "./components/Toast";
import { LoginScreen } from "./components/LoginScreen";
import { TopScreen, type TopSection } from "./components/TopScreen";
import { PostScreen } from "./components/PostScreen";
import { PublicProfileScreen } from "./components/PublicProfileScreen";
import { EditProfileScreen } from "./components/EditProfileScreen";
import { EditCypherScreen } from "./components/EditCypherScreen";
import { EditLessonScreen } from "./components/EditLessonScreen";
import { CommunityScreen } from "./components/CommunityScreen";
import { FollowingActivityScreen } from "./components/FollowingActivityScreen";
import { CommunityBoardScreen } from "./components/CommunityBoardScreen";
import { DetailModal } from "./components/DetailModal";
import { PLDetailModal } from "./components/PLDetailModal";
import { ConfirmModal } from "./components/ConfirmModal";
import { NotificationScreen } from "./components/NotificationScreen";
import { BottomNav } from "./components/BottomNav";
import { Loading } from "./components/Loading";

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
  // マイページボタン長押し→アカウント切り替え確認（団体用・個人用など別Googleアカウントへの切り替え）
  const [showSwitchAccount, setShowSwitchAccount] = useState(false);
  // TopScreen再フェッチトリガー（参加/キャンセル後にインクリメント）
  const [refreshKey, setRefreshKey] = useState(0);
  // ダンサーネーム（ヘッダー表示用）
  const [dancerName, setDancerName] = useState("");
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  // アカウントの種類（個人用/団体用）。団体用ではホーム画面からSPOTS機能を隠す
  const [accountType, setAccountType] = useState("individual");
  // プロフィール遷移スタック（Instagram風の重ねて表示）
  const [profileStack, setProfileStack] = useState<string[]>([]);
  // 通知関連
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  // サイファー編集
  const [editCypherId, setEditCypherId] = useState<string | null>(null);
  // レッスン・イベント編集
  const [editLessonId, setEditLessonId] = useState<string | null>(null);
  // コミュニティ：どの掲示板を開いているか
  const [boardTarget, setBoardTarget] = useState<{ id: string; title: string } | null>(null);
  // トップで開いているセクション。LESSONを見ている時に投稿を押したら
  // レッスン作成フォームが開くようにするため、画面をまたいで保持する
  const [topSection, setTopSection] = useState<TopSection>("cypher");

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
      supabase.from("profiles").select("dancer_name, avatar_url, account_type").eq("id", u.id).single(),
      supabase.from("participations").select("cypher_id, status").eq("profile_id", u.id),
      supabase.from("pl_participations").select("lesson_id, status").eq("profile_id", u.id),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", u.id).eq("read", false),
    ]);
    const name = profileRes.data?.dancer_name || u.user_metadata?.full_name || "";
    if (name) setDancerName(name);
    setMyAvatarUrl((profileRes.data as any)?.avatar_url ?? null);
    setAccountType((profileRes.data as any)?.account_type === "organization" ? "organization" : "individual");
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

  // 別のGoogleアカウントに切り替える（団体用・個人用など）。サインアウト後、
  // 毎回アカウント選択画面を強制表示するprompt付きでログインを開き直す
  const handleSwitchAccount = async () => {
    setShowSwitchAccount(false);
    await supabase.auth.signOut();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : "",
        queryParams: { prompt: "select_account" },
      },
    });
  };

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

  const handlePLJoin = async (id: string, answers?: EventApplicationAnswers) => {
    if (!user) return;
    if (plJoined.includes(id) || plPending.includes(id)) {
      const { error } = await cancelLesson(user.id, id);
      if (error) { showToast(error); return; }
      setPlJoined(j => j.filter(x => x !== id));
      setPlPending(p => p.filter(x => x !== id));
      setRefreshKey(k => k + 1);
      return;
    }
    const result = await joinLesson(user.id, id, answers);
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
    (editCypherId ? 1 : 0) + (editLessonId ? 1 : 0) + (boardTarget ? 1 : 0) + (confirmId ? 1 : 0) + profileStack.length;
  const overlayStateRef = useRef({ detail, plDetail, showNotifications, editCypherId, editLessonId, boardTarget, confirmId, profileStack });
  overlayStateRef.current = { detail, plDetail, showNotifications, editCypherId, editLessonId, boardTarget, confirmId, profileStack };
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
      if (s.confirmId || s.editCypherId || s.editLessonId || s.boardTarget || s.showNotifications || s.profileStack.length > 0 || s.plDetail || s.detail) {
        // 履歴エントリはすでに消費されているので、countの差分処理をスキップさせる
        prevOverlayCountRef.current -= 1;
        if (s.confirmId) setConfirmId(null);
        else if (s.editCypherId) setEditCypherId(null);
        else if (s.editLessonId) setEditLessonId(null);
        else if (s.boardTarget) setBoardTarget(null);
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
        body,html{background:#000000;color:#F0F0F0;-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{display:none}
        /* 一覧だけはスクロールバーを出す。中身が多いほどつまみが小さくなるので、
           今どのへんを見ているかが分かる。太さと色だけ指定して動きは端末任せ */
        .bd-scroll::-webkit-scrollbar{display:block;width:6px}
        .bd-scroll::-webkit-scrollbar-track{background:transparent}
        .bd-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.22);border-radius:3px}
        .bd-scroll{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.22) transparent}
        textarea{font-family:inherit}
        select{appearance:none;-webkit-appearance:none}
        @keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes bdSlideFromRight{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
        @keyframes bdSlideFromLeft{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:translateX(0)}}
        /* 「参加する」ボタンを押した瞬間の演出。ボタン自体は軽くポップし、
           周りの縁が輪になって外へ広がりながら消える */
        @keyframes bdJoinPop{0%{transform:scale(0.88)}55%{transform:scale(1.05)}100%{transform:scale(1)}}
        @keyframes bdJoinRing{0%{transform:scale(1);opacity:0.7}100%{transform:scale(1.12);opacity:0}}
        /* 画面を開いた時、ロゴが左から転がってきて中央に止まる。
           回転量は「移動距離÷半径」に合わせると滑らず転がって見えるので、
           ロゴのサイズごとに角度を変える（同じ距離なら大きい球ほど回転は少ない） */
        @keyframes bdLogoRollIn{from{transform:translateX(-200px) rotate(-440deg)}to{transform:translateX(0) rotate(0deg)}}
        @keyframes bdLogoRollInLg{from{transform:translateX(-200px) rotate(-174deg)}to{transform:translateX(0) rotate(0deg)}}
        /* カードが下からふわっと浮かび上がってくる。1枚ずつ少しずつ遅らせて出す */
        @keyframes bdCardFloatIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        /* 選択中タブの文字が客席ウェーブみたいに1文字ずつ上下する。各文字の animation-delay をずらして波にする */
        /* 「ぽこっ」と跳ねてすぐ止まる区間を作り、残りは静止させることで
           滑らかな波ではなく1文字ずつ弾む感じにする */
        @keyframes bdLetterWave{0%,55%,100%{transform:translateY(0)}25%{transform:translateY(-3.5px)}40%{transform:translateY(0)}}
        /* タッチ端末はホバーできないので、PCでホバー時だけ出る色付き影を常時出す */
        @media (hover: none) {
          .bd-glow-card { box-shadow: 0 6px 12px rgba(0,0,0,0.05), 0 18px 36px var(--bd-glow, transparent) !important; }
          .bd-glow-card-blue { box-shadow: 0 6px 12px rgba(0,0,0,0.05), 0 18px 36px rgba(37,99,235,0.18) !important; }
        }
        /* カード裏の光がゆっくり漂うように、大きめに敷いた背景の位置を動かし続ける。
           background(ショートハンド)を毎回inlineで指定し直すのでposition/sizeは
           !importantで固定しないと初期値に戻されてしまう */
        @keyframes bdGlowDrift {
          0%   { background-position: 15% -10%; }
          50%  { background-position: 85% 40%; }
          100% { background-position: 15% -10%; }
        }
        .bd-glow-bg { background-size: 220% 220% !important; animation: bdGlowDrift 18s ease-in-out infinite; }
      `}</style>

      <div style={{ maxWidth: "480px", margin: "0 auto", minHeight: "100vh", background: "#000000" }}>
        {authLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
            <Loading size={64} />
          </div>
        ) : !user ? (
          <LoginScreen />
        ) : (
          <>
            {screen === "top"     && <TopScreen onNav={setScreen} onCardClick={setDetail} onPLClick={setPlDetail} onViewProfile={id => setProfileStack(s => [...s, id])} user={user} refreshKey={refreshKey} dancerName={dancerName} myAvatarUrl={myAvatarUrl} unreadCount={unreadCount} onBell={() => setShowNotifications(true)} section={topSection} onSectionChange={setTopSection} accountType={accountType} />}
            {screen === "following" && <FollowingActivityScreen user={user} onCardClick={setDetail} onPLClick={setPlDetail} onViewProfile={id => setProfileStack(s => [...s, id])} refreshKey={refreshKey} />}
            {screen === "post"    && <PostScreen onNav={setScreen} user={user} initialTab={topSection === "pl" || topSection === "event" ? topSection : "cypher"} accountType={accountType} />}
            {screen === "profile" && <PublicProfileScreen profileId={user.id} currentUserId={user.id} onEdit={() => setScreen("edit")} onLogout={() => supabase.auth.signOut()} onViewProfile={id => setProfileStack(s => [...s, id])} onCypherClick={openCypherDetail} onLessonClick={openLessonDetail} onEditCypher={id => setEditCypherId(id)} onEditLesson={id => setEditLessonId(id)} />}
            {screen === "community" && <CommunityScreen user={user} onOpenBoard={setBoardTarget} onViewProfile={id => setProfileStack(s => [...s, id])} accountType={accountType} />}
            {screen === "edit"    && <EditProfileScreen user={user} onDancerNameChange={setDancerName} onAvatarChange={setMyAvatarUrl} onAccountTypeChange={setAccountType} onBack={() => setScreen("profile")} />}
            <BottomNav current={screen} onNav={s => { setScreen(s); setProfileStack([]); }} onProfileLongPress={() => setShowSwitchAccount(true)} />
            {detail && <DetailModal cypher={detail} onClose={() => setDetail(null)} joined={joined.includes(detail.id)} pending={pendingJoins.includes(detail.id)} onJoin={handleJoin} onViewProfile={id => { setProfileStack(s => [...s, id]); }} user={user} />}
            {plDetail && <PLDetailModal lesson={plDetail} onClose={() => setPlDetail(null)} joined={plJoined.includes(plDetail.id)} pending={plPending.includes(plDetail.id)} onJoin={handlePLJoin} onViewProfile={id => { setProfileStack(s => [...s, id]); }} user={user} />}
            {confirmId && <ConfirmModal onConfirm={handleConfirmCancel} onCancel={() => setConfirmId(null)} />}
            {showSwitchAccount && (
              <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setShowSwitchAccount(false)}>
                <div onClick={e => e.stopPropagation()} style={{ background: "#141414", borderRadius: "12px", padding: "28px 24px", maxWidth: "300px", width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                  <p style={{ margin: "0 0 8px", fontSize: "18px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", letterSpacing: "0.05em" }}>アカウントを切り替えますか？</p>
                  <p style={{ margin: "0 0 24px", fontSize: "12px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", lineHeight: 1.7 }}>一度サインアウトし、Googleのアカウント選択画面を開きます。<br />団体用・個人用など、別のGoogleアカウントでログインし直せます。</p>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => setShowSwitchAccount(false)} style={{ flex: 1, padding: "11px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "6px", background: "transparent", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>戻る</button>
                    <button onClick={handleSwitchAccount} style={{ flex: 1, padding: "11px", border: "none", borderRadius: "6px", background: "#DC2626", color: "#fff", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", fontWeight: "bold" }}>切り替える</button>
                  </div>
                </div>
              </div>
            )}
            {editCypherId && (
              <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "#000000", overflowY: "auto", animation: "slideInRight 0.22s ease-out" }}>
                <EditCypherScreen
                  cypherId={editCypherId}
                  user={user}
                  onBack={() => setEditCypherId(null)}
                  onSaved={() => { setEditCypherId(null); setRefreshKey(k => k + 1); }}
                />
              </div>
            )}
            {editLessonId && (
              <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "#000000", overflowY: "auto", animation: "slideInRight 0.22s ease-out" }}>
                <EditLessonScreen
                  lessonId={editLessonId}
                  user={user}
                  onBack={() => setEditLessonId(null)}
                  onSaved={() => { setEditLessonId(null); setRefreshKey(k => k + 1); }}
                />
              </div>
            )}
            {boardTarget && (
              <CommunityBoardScreen
                board={boardTarget}
                user={user}
                onBack={() => setBoardTarget(null)}
                onViewProfile={id => setProfileStack(s => [...s, id])}
              />
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
