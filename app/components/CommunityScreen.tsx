"use client";
import { useState, useEffect } from "react";
import { Plus, X, Check } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { timeAgo } from "../lib/constants";
import { Loading } from "./Loading";

type Board = { id: string; title: string; created_at: string; creator: { dancer_name: string } | null };

// 「コミュニティ」タブ：みんなが自由に作れる掲示板の一覧。
// 右上の「＋」でタイトルを入力して新しい掲示板を作り、タップすると中身（CommunityBoardScreen）が開く
export function CommunityScreen({ user, onOpenBoard }: {
  user: SupabaseUser;
  onOpenBoard: (board: { id: string; title: string }) => void;
}) {
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchBoards = async () => {
    const { data } = await supabase
      .from("community_boards")
      .select("id, title, created_at, creator:creator_id(dancer_name)")
      .order("created_at", { ascending: false });
    setBoards((data as any[])?.map(b => ({ ...b, creator: b.creator ?? null })) ?? []);
  };

  useEffect(() => { fetchBoards(); }, []);

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title || creating) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("community_boards")
      .insert({ title, creator_id: user.id })
      .select("id, title").single();
    setCreating(false);
    if (!error && data) {
      setShowCreate(false);
      setNewTitle("");
      fetchBoards();
      onOpenBoard(data as any);
    }
  };

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flexShrink: 0, padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "32px", color: "#F0F0F0" }}>コミュニティ</h2>
          <div style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>みんなの掲示板</div>
        </div>
        <button onClick={() => setShowCreate(true)} aria-label="掲示板を作る"
          style={{ background: "#DC2626", border: "none", borderRadius: "10px", cursor: "pointer", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "4px" }}>
          <Plus size={20} color="#fff" />
        </button>
      </div>

      <div className="bd-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {boards === null ? (
          <Loading />
        ) : boards.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 16px", color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>
            まだ掲示板がありません。右上の＋から作ってみましょう
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {boards.map(b => (
              <div key={b.id} onClick={() => onOpenBoard(b)}
                style={{ padding: "12px 14px", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderLeft: "3px solid #DC2626", borderRadius: "8px", cursor: "pointer" }}>
                <div style={{ fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>{b.title}</div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans JP',sans-serif", marginTop: "3px" }}>
                  {b.creator?.dancer_name ?? "UNKNOWN"} ・ {timeAgo(b.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ height: "80px" }} />
      </div>

      {/* 掲示板を作る */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setShowCreate(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#141414", borderRadius: "16px", padding: "24px 20px", width: "100%", maxWidth: "320px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em" }}>NEW BOARD</div>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={18} /></button>
            </div>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
              placeholder="掲示板のタイトル"
              maxLength={50}
              autoFocus
              style={{ width: "100%", padding: "10px 12px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }}
            />
            <button onClick={handleCreate} disabled={!newTitle.trim() || creating}
              style={{ marginTop: "14px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", border: "none", borderRadius: "8px", background: newTitle.trim() ? "#DC2626" : "rgba(255,255,255,0.08)", color: newTitle.trim() ? "#fff" : "rgba(255,255,255,0.3)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "bold", cursor: newTitle.trim() ? "pointer" : "default" }}>
              <Check size={14} /> {creating ? "作成中..." : "作成する"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
