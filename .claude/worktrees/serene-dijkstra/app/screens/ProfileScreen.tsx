"use client";
import { useState } from "react";
import { Check, Star, LogOut } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { GENRES, GENRE_COLORS } from "../../lib/constants";
import type { GenreKey, ProfileState } from "../../lib/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function ProfileScreen({ user }: { user: SupabaseUser }) {
  const [profile, setProfile] = useState<ProfileState>({ dancer_name: "", genres: [] });
  const [saved, setSaved] = useState(false);
  const toggleGenre = (g: GenreKey) => { setProfile(p => ({ ...p, genres: p.genres.includes(g) ? p.genres.filter(x => x !== g) : [...p.genres, g] })); setSaved(false); };

  const handleSignOut = async () => { await supabase.auth.signOut(); };

  return (
    <div style={{ paddingBottom: "80px" }}>
      <div style={{ padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: "10px", fontFamily: "'Space Mono',monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", marginBottom: "4px" }}>▶ YOUR IDENTITY</div>
        <h2 style={{ margin: 0, fontFamily: "'Bebas Neue',sans-serif", fontSize: "32px", color: "#F5F5F5" }}>ダンサー設定</h2>
      </div>
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px" }}>
          {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width: "40px", height: "40px", borderRadius: "50%" }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", color: "#F5F5F5", fontFamily: "'Space Mono',monospace" }}>{user.user_metadata?.full_name ?? user.email}</div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono',monospace" }}>{user.email}</div>
          </div>
          <button onClick={handleSignOut} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "2px", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: "6px 8px", display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontFamily: "'Space Mono',monospace" }}>
            <LogOut size={12} /> ログアウト
          </button>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "9px", fontFamily: "'Space Mono',monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.4)", marginBottom: "6px", textTransform: "uppercase" as const }}>ダンサーネーム</label>
          <input style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "2px", color: "#F5F5F5", fontSize: "16px", fontFamily: "'Bebas Neue',sans-serif", outline: "none", boxSizing: "border-box" as const }} placeholder="DANCER NAME" value={profile.dancer_name} onChange={e => { setProfile(p => ({ ...p, dancer_name: e.target.value })); setSaved(false); }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "9px", fontFamily: "'Space Mono',monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.4)", marginBottom: "10px", textTransform: "uppercase" as const }}>得意ジャンル</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {GENRES.map(g => { const sel = profile.genres.includes(g); const col = GENRE_COLORS[g]; return (
              <button key={g} onClick={() => toggleGenre(g)} style={{ padding: "10px", border: sel ? `1px solid ${col}` : "1px solid rgba(255,255,255,0.1)", borderRadius: "2px", background: sel ? `${col}15` : "rgba(255,255,255,0.02)", color: sel ? col : "rgba(255,255,255,0.4)", fontSize: "11px", fontFamily: "'Space Mono',monospace", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {g}{sel && <Check size={11} />}
              </button>
            );})}
          </div>
        </div>
        <button onClick={() => setSaved(true)} style={{ width: "100%", padding: "13px", border: "none", borderRadius: "2px", background: saved ? "rgba(105,255,71,0.15)" : "linear-gradient(135deg,#FF3D00,#FF6D00)", color: saved ? "#69FF47" : "#fff", fontSize: "14px", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "0.15em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          {saved ? <><Check size={15} />SAVED!</> : <><Star size={15} />プロフィールを保存する</>}
        </button>
      </div>
    </div>
  );
}
