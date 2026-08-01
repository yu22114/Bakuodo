"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Cypher } from "../../lib/types";
import { fetchCypherById } from "../../lib/fetchDetail";
import { joinCypher, cancelCypher } from "../../lib/participation";
import { showToast } from "../../components/Toast";
import { DetailModal } from "../../components/DetailModal";
import { ConfirmModal } from "../../components/ConfirmModal";
import { Loading } from "../../components/Loading";

// /c/[id] — 共有リンクから開くサイファー詳細。
// 未ログインでも閲覧でき、参加やコメントはログイン後にトップから行う。
export function CypherSharePage({ cypherId }: { cypherId: string }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [cypher, setCypher] = useState<Cypher | null>(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user ?? null;
      setUser(u);
      const c = await fetchCypherById(cypherId);
      setCypher(c);
      if (u && c) {
        const { data: part } = await supabase
          .from("participations").select("status")
          .eq("cypher_id", cypherId).eq("profile_id", u.id).maybeSingle();
        setJoined(!!part && part.status !== "pending");
        setPending(part?.status === "pending");
      }
      setLoading(false);
    }
    init();
  }, [cypherId]);

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
    const result = await joinCypher(user.id, id);
    if ("error" in result) { showToast(result.error); return; }
    if (result.status === "pending") { setPending(true); showToast("参加を申請しました"); }
    else { setJoined(true); showToast("参加しました！"); }
  };

  const handleConfirmCancel = async () => {
    if (user) {
      const { error } = await cancelCypher(user.id, cypherId);
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

  if (!cypher) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", minHeight: "100vh", background: "#FAFAFA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: "40px" }}>🕺</div>
        <p style={{ margin: 0, fontSize: "14px", color: "#111111", lineHeight: 1.7 }}>
          このサイファーは見つかりませんでした。<br />終了して削除されたか、限定公開の可能性があります。
        </p>
        <a href="/" style={{ padding: "12px 28px", background: "#FF3D00", color: "#fff", borderRadius: "8px", textDecoration: "none", fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.12em" }}>
          爆踊をひらく
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", minHeight: "100vh", background: "#FAFAFA" }}>
      <DetailModal
        cypher={cypher}
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
