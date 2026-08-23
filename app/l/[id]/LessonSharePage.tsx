"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { PrivateLesson } from "../../lib/types";
import { fetchLessonById } from "../../lib/fetchDetail";
import { joinLesson, cancelLesson } from "../../lib/participation";
import { showToast } from "../../components/Toast";
import { PLDetailModal } from "../../components/PLDetailModal";
import { ConfirmModal } from "../../components/ConfirmModal";
import { Loading } from "../../components/Loading";

// /l/[id] — 共有リンクから開くP LESSON・EVENT詳細（/c/[id]のレッスン版）。
// 未ログインでも閲覧でき、参加やコメントはログイン後にトップから行う。
export function LessonSharePage({ lessonId }: { lessonId: string }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [lesson, setLesson] = useState<PrivateLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user ?? null;
      setUser(u);
      const l = await fetchLessonById(lessonId);
      setLesson(l);
      if (u && l) {
        const { data: part } = await supabase
          .from("pl_participations").select("status")
          .eq("lesson_id", lessonId).eq("profile_id", u.id).maybeSingle();
        setJoined(!!part && part.status !== "pending");
        setPending(part?.status === "pending");
      }
      setLoading(false);
    }
    init();
  }, [lessonId]);

  const handleJoin = async (id: string) => {
    if (!user) {
      // 未ログインはトップへ（ログイン画面が出る）
      window.location.href = "/";
      return;
    }
    if (joined || pending) {
      setConfirmOpen(true);
      return;
    }
    const result = await joinLesson(user.id, id);
    if ("error" in result) { showToast(result.error); return; }
    if (result.status === "pending") { setPending(true); showToast("参加を申請しました"); }
    else { setJoined(true); showToast("参加しました！"); }
  };

  const handleConfirmCancel = async () => {
    if (user) {
      const { error } = await cancelLesson(user.id, lessonId);
      if (error) { showToast(error); setConfirmOpen(false); return; }
      setJoined(false);
      setPending(false);
    }
    setConfirmOpen(false);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Loading size={56} />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", minHeight: "100vh", background: "#000000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: "40px" }}>🕺</div>
        <p style={{ margin: 0, fontSize: "14px", color: "#F0F0F0", lineHeight: 1.7 }}>
          このレッスン・イベントは見つかりませんでした。<br />終了して削除されたか、限定公開の可能性があります。
        </p>
        <a href="/" style={{ padding: "12px 28px", background: "#DC2626", color: "#fff", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.12em" }}>
          爆踊をひらく
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", minHeight: "100vh", background: "#000000" }}>
      <PLDetailModal
        lesson={lesson}
        onClose={() => { window.location.href = "/"; }}
        joined={joined}
        pending={pending}
        onJoin={handleJoin}
        onViewProfile={id => { window.location.href = `/u/${id}`; }}
        user={user}
        keepOpenOnJoin
      />
      {confirmOpen && <ConfirmModal onConfirm={handleConfirmCancel} onCancel={() => setConfirmOpen(false)} />}
    </div>
  );
}
