"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { showToast } from "./Toast";

// 投稿（CYPHER・LESSON/EVENT・NUMBER）の通報フォーム。見た目はプロフィールの「報告する」と同じ。
// DBは変えずに既存の reports に入れる：通報先は投稿者、どの投稿かは detail の先頭に書き込む。
// 内容の確認はSupabaseダッシュボードから運営が直接行う
export function ReportPostModal({ kind, postId, title, organizerId, reporterId, onClose }: {
  kind: string; // CYPHER / LESSON / EVENT / NUMBER
  postId: string;
  title: string;
  organizerId: string;
  reporterId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: reporterId,
      reported_user_id: organizerId,
      reason,
      detail: `[${kind}] ${title} (id: ${postId})` + (detail.trim() ? `\n${detail.trim()}` : ""),
    });
    setSubmitting(false);
    if (error) { showToast(`報告に失敗しました: ${error.message}`); return; }
    showToast("報告を受け付けました");
    onClose();
  };

  // 詳細画面の中の transform の影響を受けないよう、body直下に出す
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={e => { e.stopPropagation(); onClose(); }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderRadius: "16px", padding: "24px 20px", width: "100%", maxWidth: "340px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em" }}>REPORT</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", marginBottom: "14px" }}>この投稿を報告します</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
          {["不適切な内容・画像", "誹謗中傷・嫌がらせ", "スパム・勧誘", "虚偽の内容", "その他"].map(r => (
            <button key={r} onClick={() => setReason(r)}
              style={{ width: "100%", textAlign: "left", padding: "10px 12px", border: reason === r ? "1px solid #DC2626" : "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", background: reason === r ? "rgba(220,38,38,0.1)" : "#141414", color: reason === r ? "#DC2626" : "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>
              {r}
            </button>
          ))}
        </div>
        <textarea value={detail} onChange={e => setDetail(e.target.value)} placeholder="詳しい内容（任意）" maxLength={500} rows={3}
          style={{ width: "100%", padding: "10px 12px", background: "#141414", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
        <button onClick={handleSubmit} disabled={!reason || submitting}
          style={{ marginTop: "14px", width: "100%", padding: "11px", border: "none", borderRadius: "8px", background: reason ? "linear-gradient(135deg, #DC2626, #A61B1B)" : "rgba(255,255,255,0.08)", color: reason ? "#fff" : "rgba(255,255,255,0.3)", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", cursor: reason ? "pointer" : "default" }}>
          {submitting ? "送信中..." : "報告する"}
        </button>
      </div>
    </div>,
    document.body
  );
}
