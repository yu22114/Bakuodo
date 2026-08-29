"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { DanceNumber } from "../../lib/types";
import { fetchNumberById } from "../../lib/fetchDetail";
import { joinNumber, cancelNumber, type NumberApplicationAnswers } from "../../lib/participation";
import { showToast } from "../../components/Toast";
import { NumberDetailModal } from "../../components/NumberDetailModal";
import { Loading } from "../../components/Loading";

// /n/[id] — 共有リンクから開くNUMBER詳細（/c/[id]と同じ作り）。
// 未ログインでも閲覧でき、参加・編集・削除はログイン後に行う
export function NumberSharePage({ numberId }: { numberId: string }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [numberData, setNumberData] = useState<DanceNumber | null>(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user ?? null;
      setUser(u);
      const n = await fetchNumberById(numberId);
      setNumberData(n);
      if (u && n) {
        const { data: part } = await supabase
          .from("number_participations").select("id")
          .eq("number_id", numberId).eq("profile_id", u.id).maybeSingle();
        setJoined(!!part);
      }
      setLoading(false);
    }
    init();
  }, [numberId]);

  const handleJoin = async (id: string, answers?: NumberApplicationAnswers) => {
    if (!user) {
      // 未ログインはトップへ（ログイン画面が出る）
      window.location.href = "/";
      return;
    }
    if (joined) {
      const { error } = await cancelNumber(user.id, id);
      if (error) { showToast(error); return; }
      setJoined(false);
      showToast("キャンセルしました");
      return;
    }
    const { error } = await joinNumber(user.id, id, answers);
    if (error) { showToast(error); return; }
    setJoined(true);
    showToast("参加しました！");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Loading size={56} />
      </div>
    );
  }

  if (!numberData) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", minHeight: "100vh", background: "#000000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: "40px" }}>🕺</div>
        <p style={{ margin: 0, fontSize: "14px", color: "#F0F0F0", lineHeight: 1.7 }}>
          このNUMBERは見つかりませんでした。<br />終了して削除された可能性があります。
        </p>
        <a href="/" style={{ padding: "12px 28px", background: "#EC4899", color: "#fff", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.12em" }}>
          爆踊をひらく
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", minHeight: "100vh", background: "#000000" }}>
      <NumberDetailModal
        number={numberData}
        onClose={() => { window.location.href = "/"; }}
        joined={joined}
        onJoin={handleJoin}
        onViewProfile={id => { window.location.href = `/u/${id}`; }}
        onEdit={() => { window.location.href = "/"; }}
        onDeleted={() => { window.location.href = "/"; }}
        user={user}
        keepOpenOnJoin
      />
    </div>
  );
}
