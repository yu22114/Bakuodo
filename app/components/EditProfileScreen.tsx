"use client";
import { useState, useEffect } from "react";
import { Check, Star, LogOut, ChevronLeft, Camera } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { ProfileState } from "../lib/types";
import { GENRES, GENRE_COLORS } from "../lib/constants";
import { Loading } from "./Loading";

export function EditProfileScreen({ user, onDancerNameChange, onAvatarChange, onBack }: {
  user: SupabaseUser;
  onDancerNameChange?: (name: string) => void;
  onAvatarChange?: (url: string) => void;
  onBack?: () => void;
}) {
  const [profile, setProfile] = useState<ProfileState>({ dancer_name: "", genres: [], instagram: "", dance_years: "", age_group: "", gender: "", bio: "" });
  const [isPrivate, setIsPrivate] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(true);

  const toggleGenre = (g: (typeof GENRES)[number]) => { setProfile(p => ({ ...p, genres: p.genres.includes(g) ? p.genres.filter(x => x !== g) : [...p.genres, g] })); setSaved(false); };
  const handleSignOut = async () => { await supabase.auth.signOut(); };

  useEffect(() => {
    async function fetchProfile() {
      const { data } = await supabase.from("profiles").select("dancer_name, genres, instagram, dance_years, age_group, gender, bio, avatar_url, is_private").eq("id", user.id).single();
      if (data) {
        setProfile({
          dancer_name: data.dancer_name ?? "",
          genres: (data.genres ?? []) as (typeof GENRES)[number][],
          instagram: data.instagram ?? "",
          dance_years: data.dance_years != null ? String(data.dance_years) : "",
          age_group: data.age_group ?? "",
          gender: data.gender ?? "",
          bio: (data as any).bio ?? "",
        });
        setAvatarUrl((data as any).avatar_url ?? null);
        setIsPrivate((data as any).is_private ?? false);
      }
      setLoading(false);
    }
    fetchProfile();
  }, [user.id]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("ファイルサイズは5MB以下にしてください");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setAvatarError("画像ファイルを選択してください");
      return;
    }
    setAvatarUploading(true);
    setAvatarError("");
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadErr) {
      setAvatarError(`アップロード失敗: ${uploadErr.message}`);
      setAvatarUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    // updateだとprofilesの行が存在しない場合にエラーなしでスルーされるためupsertを使う
    const { error: updateErr } = await supabase.from("profiles").upsert({ id: user.id, avatar_url: publicUrl }, { onConflict: "id" });
    if (updateErr) {
      setAvatarError(`DB更新失敗: ${updateErr.message}`);
      setAvatarUploading(false);
      return;
    }
    setAvatarUrl(publicUrl);
    onAvatarChange?.(publicUrl);
    setAvatarUploading(false);
  };

  const handleSave = async () => {
    setSaveError("");
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      dancer_name: profile.dancer_name,
      genres: profile.genres,
      instagram: profile.instagram || null,
      dance_years: profile.dance_years ? Number(profile.dance_years) : null,
      age_group: profile.age_group || null,
      gender: profile.gender || null,
      bio: profile.bio.trim() || null,
      is_private: isPrivate,
    }, { onConflict: "id" });
    if (error) {
      console.error("profile save error:", error);
      setSaveError(`保存に失敗しました: ${error.message}`);
    } else {
      setSaved(true);
      if (profile.dancer_name) onDancerNameChange?.(profile.dancer_name);
    }
  };

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.15em", color: "#F0F0F0", marginBottom: "6px", textTransform: "uppercase" as const };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <Loading />
    </div>
  );

  return (
    <div style={{ paddingBottom: "80px", background: "#000000" }}>
      <div style={{ padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D" }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "600", padding: "10px 16px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px" }}>
            <ChevronLeft size={18} strokeWidth={2.5} /> 戻る
          </button>
        )}
        <div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.2em", marginBottom: "4px" }}>▶ EDIT PROFILE</div>
        <h2 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "32px", color: "#F0F0F0" }}>ダンサー設定</h2>
      </div>
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* アバター写真 */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <label style={{ position: "relative", cursor: "pointer" }}>
            <div style={{ width: "84px", height: "84px", borderRadius: "50%", background: "linear-gradient(135deg,#DC2626,#F87171)", border: "3px solid #141414", boxShadow: "0 2px 10px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: "32px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#fff" }}>{profile.dancer_name[0]?.toUpperCase() || "?"}</span>
              }
            </div>
            <div style={{ position: "absolute", bottom: "2px", right: "2px", width: "28px", height: "28px", borderRadius: "50%", background: avatarUploading ? "rgba(255,255,255,0.3)" : "#2A2A2A", border: "2px solid #000000", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {avatarUploading
                ? <div style={{ width: "10px", height: "10px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                : <Camera size={13} color="#fff" />
              }
            </div>
            <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} disabled={avatarUploading} />
          </label>
        </div>
        {avatarError && <div style={{ padding: "8px 12px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "6px", color: "#DC2626", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", textAlign: "center" }}>{avatarError}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}>
          {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width: "40px", height: "40px", borderRadius: "50%" }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "13px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold" }}>{user.user_metadata?.full_name ?? "ダンサー"}</div>
          </div>
          <button onClick={handleSignOut} style={{ background: "none", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "4px", color: "#F0F0F0", cursor: "pointer", padding: "6px 10px", display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif" }}>
            <LogOut size={12} /> ログアウト
          </button>
        </div>
        <div><label style={lbl}>ダンサーネーム</label>
          <input style={{ ...inp, fontSize: "15px" }} autoCapitalize="none" autoCorrect="off" placeholder="例: taro / 太郎" value={profile.dancer_name} onChange={e => { setProfile(p => ({ ...p, dancer_name: e.target.value })); setSaved(false); }} />
        </div>
        <div><label style={lbl}>自己紹介（任意）</label>
          <textarea style={{ ...inp, minHeight: "80px", resize: "vertical" } as React.CSSProperties} maxLength={300} placeholder="活動歴やクルー、好きなジャンルなど自由に書いてください" value={profile.bio} onChange={e => { setProfile(p => ({ ...p, bio: e.target.value })); setSaved(false); }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div><label style={lbl}>ダンス歴（年）</label>
            <input style={inp} type="number" min="0" placeholder="例: 3" value={profile.dance_years} onChange={e => { setProfile(p => ({ ...p, dance_years: e.target.value })); setSaved(false); }} />
          </div>
          <div><label style={lbl}>年代</label>
            <select style={inp} value={profile.age_group} onChange={e => { setProfile(p => ({ ...p, age_group: e.target.value })); setSaved(false); }}>
              <option value="">未設定</option>
              {["10代", "20代", "30代", "40代", "50代以上"].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={lbl}>性別（任意）</label>
          <div style={{ display: "flex", gap: "8px" }}>
            {["男性", "女性", "その他", "未回答"].map(g => {
              const sel = profile.gender === g;
              return (
                <button key={g} onClick={() => { setProfile(p => ({ ...p, gender: p.gender === g ? "" : g })); setSaved(false); }}
                  style={{ padding: "8px 12px", border: sel ? "1px solid #DC2626" : "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", background: sel ? "rgba(220,38,38,0.1)" : "transparent", color: sel ? "#DC2626" : "rgba(255,255,255,0.5)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>
                  {g}
                </button>
              );
            })}
          </div>
        </div>
        <div><label style={lbl}>Instagram（任意）</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#F0F0F0", fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif" }}>@</span>
            <input style={{ ...inp, paddingLeft: "28px" }} placeholder="username" value={profile.instagram} onChange={e => { setProfile(p => ({ ...p, instagram: e.target.value })); setSaved(false); }} />
          </div>
        </div>
        <div>
          <label style={lbl}>得意ジャンル</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {GENRES.map(g => { const sel = profile.genres.includes(g); const col = GENRE_COLORS[g]; return (
              <button key={g} onClick={() => toggleGenre(g)} style={{ padding: "10px", border: sel ? `1px solid ${col}` : "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", background: sel ? `${col}12` : "#141414", color: sel ? col : "rgba(255,255,255,0.45)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {g}{sel && <Check size={11} />}
              </button>
            ); })}
          </div>
        </div>
        {/* 鍵アカ設定 */}
        <button onClick={() => { setIsPrivate(v => !v); setSaved(false); }}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", cursor: "pointer", textAlign: "left" }}>
          <div>
            <div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
              🔒 鍵アカウント
            </div>
            <div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginTop: "3px" }}>
              ONにするとフォローに承認が必要になります
            </div>
          </div>
          <div style={{ width: "44px", height: "26px", borderRadius: "13px", background: isPrivate ? "#DC2626" : "rgba(255,255,255,0.16)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
            <div style={{ position: "absolute", top: "3px", left: isPrivate ? "21px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)", transition: "left 0.2s" }} />
          </div>
        </button>
        {saveError && <div style={{ padding: "10px 12px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "6px", color: "#DC2626", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif" }}>{saveError}</div>}
        <button onClick={handleSave} style={{ width: "100%", padding: "13px", border: "none", borderRadius: "6px", background: saved ? "rgba(22,163,74,0.12)" : "#DC2626", color: saved ? "#16A34A" : "#fff", fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.15em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          {saved ? <><Check size={15} />SAVED!</> : <><Star size={15} />プロフィールを保存する</>}
        </button>
      </div>
    </div>
  );
}
