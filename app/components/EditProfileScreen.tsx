"use client";
import { useState, useEffect } from "react";
import { Check, Star, LogOut, ChevronLeft, Camera } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { ProfileState } from "../lib/types";
import { GENRES, GENRE_COLORS } from "../lib/constants";
import { Loading } from "./Loading";
import { useSwipeBack } from "../lib/useSwipeBack";

const AVATAR_OUTPUT = 600; // 書き出す画像の一辺のサイズ(px)。高解像度の端末でも荒れないように大きめにする

// <img>タグに読み込ませてHTMLImageElementとして受け取るだけの小さなヘルパー。
// createImageBitmapと違い、HEICも含めてSafariが表示できる画像形式ならほぼ確実に読める
function loadImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像を読み込めませんでした"));
    img.src = URL.createObjectURL(blob);
  });
}

// iPhoneのHEIC/HEIFは一部ブラウザの標準機能では読み込めないため、サーバー側
// （/api/convert-heic）でJPEGに変換してから受け取るのを基本にしている。
// ただしVercelのサーバー関数はリクエストボディが約4.5MBまでという制限があり、
// 最近のiPhoneの高解像度HEIC写真はこれを超えることが珍しくない。超えるファイルを
// 送っても失敗するだけなので、その場合はサーバーに送らず、ブラウザ自身のHEIC
// デコード機能（Safariなど対応ブラウザで既にネイティブ対応）にそのまま任せる
async function convertHeicIfNeeded(file: File): Promise<Blob> {
  const isHeic = /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  if (!isHeic) return file;
  if (file.size > 4 * 1024 * 1024) return file;
  const res = await fetch("/api/convert-heic", { method: "POST", body: file });
  if (!res.ok) throw new Error(`HEIC変換に失敗しました (status ${res.status})`);
  return await res.blob();
}

export function EditProfileScreen({ user, onDancerNameChange, onAvatarChange, onAccountTypeChange, onBack }: {
  user: SupabaseUser;
  onDancerNameChange?: (name: string) => void;
  onAvatarChange?: (url: string) => void;
  onAccountTypeChange?: (type: string) => void;
  onBack?: () => void;
}) {
  const swipeBack = useSwipeBack(onBack);
  const [profile, setProfile] = useState<ProfileState>({ dancer_name: "", genres: [], instagram: "", dance_years: "", age_group: "", birth_year: "", gender: "", bio: "", playlist_url: "", team: "", account_type: "individual" });
  // 得意ジャンルの「その他」。固定一覧にない自由記入のジャンル名を1つだけ持てる
  const [otherGenreSelected, setOtherGenreSelected] = useState(false);
  const [otherGenreText, setOtherGenreText] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(true);
  // アカウント削除（危険な操作）
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const toggleGenre = (g: (typeof GENRES)[number]) => { setProfile(p => ({ ...p, genres: p.genres.includes(g) ? p.genres.filter(x => x !== g) : [...p.genres, g] })); setSaved(false); };
  const handleSignOut = async () => { await supabase.auth.signOut(); };

  // アプリ内アカウント削除。サーバー側（/api/delete-account）でプロフィールの匿名化と
  // ログイン無効化を行う。成功したらこちらでサインアウトする（以降はpage.tsx側の
  // onAuthStateChangeが検知してログイン画面に切り替える）
  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setDeleteError("ログイン情報の取得に失敗しました"); setDeleting(false); return; }
    try {
      const res = await fetch("/api/delete-account", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDeleteError(`削除に失敗しました: ${body.error ?? res.statusText}`);
        setDeleting(false);
        return;
      }
    } catch (e) {
      setDeleteError(`削除に失敗しました: ${e instanceof Error ? e.message : "不明なエラー"}`);
      setDeleting(false);
      return;
    }
    await supabase.auth.signOut();
  };

  useEffect(() => {
    async function fetchProfile() {
      const { data } = await supabase.from("profiles").select("dancer_name, genres, instagram, dance_years, age_group, birth_year, gender, bio, playlist_url, team, avatar_url, is_private, account_type").eq("id", user.id).single();
      if (data) {
        // 固定ジャンル一覧にない値＝「その他」で自由記入されたジャンル名として分けて持つ
        const rawGenres = (data.genres ?? []) as string[];
        const fixedGenres = rawGenres.filter(g => (GENRES as readonly string[]).includes(g)) as (typeof GENRES)[number][];
        const customGenre = rawGenres.find(g => !(GENRES as readonly string[]).includes(g));
        setOtherGenreSelected(!!customGenre);
        setOtherGenreText(customGenre ?? "");
        setProfile({
          dancer_name: data.dancer_name ?? "",
          genres: fixedGenres,
          instagram: data.instagram ?? "",
          dance_years: data.dance_years != null ? String(data.dance_years) : "",
          age_group: data.age_group ?? "",
          birth_year: (data as any).birth_year != null ? String((data as any).birth_year) : "",
          gender: data.gender ?? "",
          bio: (data as any).bio ?? "",
          playlist_url: (data as any).playlist_url ?? "",
          team: (data as any).team ?? "",
          account_type: (data as any).account_type === "organization" ? "organization" : "individual",
        });
        setAvatarUrl((data as any).avatar_url ?? null);
        setIsPrivate((data as any).is_private ?? false);
      }
      setLoading(false);
    }
    fetchProfile();
  }, [user.id]);

  // ファイルを選んだら、範囲選び（クロップ）画面は挟まず、中央の正方形で自動的に
  // 切り抜いてすぐアップロードする。以前は専用のクロップ画面（丸枠でドラッグ・ズーム）
  // を挟んでいたが、そのモーダルのbackdrop-filter（画面全体をぼかす処理）が、写真アプリで
  // メモリを使った直後のiPhone Safariでページごと落ちる原因になっていたため、無くした
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイルを選び直しても変化を検知できるようにリセット
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setAvatarError("ファイルサイズは10MB以下にしてください");
      return;
    }
    // file.typeが空になる端末・OSの組み合わせがあるため、拡張子でも判定できるようにする
    const looksLikeImage = file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i.test(file.name);
    if (!looksLikeImage) {
      setAvatarError("画像ファイルを選択してください");
      return;
    }
    setAvatarError("");
    setAvatarUploading(true);
    try {
      const source = await convertHeicIfNeeded(file);
      const img = await loadImageElement(source);
      // 中央の正方形（短い方の辺に合わせる）だけを切り抜く
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - side) / 2;
      const sy = (img.naturalHeight - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_OUTPUT;
      canvas.height = AVATAR_OUTPUT;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(img.src);
      if (!ctx) { setAvatarError("画像の処理に失敗しました"); setAvatarUploading(false); return; }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_OUTPUT, AVATAR_OUTPUT);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) { setAvatarError("画像の処理に失敗しました"); setAvatarUploading(false); return; }
      await uploadAvatarBlob(blob);
    } catch (err) {
      setAvatarError(`画像の読み込みに失敗しました: ${(err as any)?.message ?? String(err)}`);
      setAvatarUploading(false);
    }
  };

  // 切り抜いた画像（blob）をアップロードする
  const uploadAvatarBlob = async (blob: Blob) => {
    const path = `${user.id}.jpg`;
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (uploadErr) {
      setAvatarError(`アップロード失敗: ${uploadErr.message}`);
      setAvatarUploading(false);
      return;
    }
    const { data: { publicUrl: rawUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    // 同じファイル名で上書きすると古い画像がキャッシュされたままになることがあるため、
    // URLの末尾に更新時刻を付けてブラウザに新しい画像だと分からせる
    const publicUrl = `${rawUrl}?t=${Date.now()}`;
    // updateだとprofilesの行が存在しない場合にエラーなしでスルーされるためupsertを使う。
    // まだ一度もダンサーネームを保存していない新規ユーザーだと、行が無いのでinsert扱いになり
    // dancer_nameのNOT NULL制約に引っかかるので、保存済みの値（無ければ仮の名前）を一緒に送る
    const { error: updateErr } = await supabase.from("profiles").upsert({ id: user.id, dancer_name: profile.dancer_name || "DANCER", avatar_url: publicUrl }, { onConflict: "id" });
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
    // 固定ジャンル＋「その他」で入力した自由記入のジャンル名を1つの配列にまとめて保存する
    const genres: string[] = [...profile.genres, ...(otherGenreSelected && otherGenreText.trim() ? [otherGenreText.trim()] : [])];
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      dancer_name: profile.dancer_name,
      genres,
      instagram: profile.instagram || null,
      dance_years: profile.dance_years ? Number(profile.dance_years) : null,
      age_group: profile.age_group || null,
      birth_year: profile.birth_year ? Number(profile.birth_year) : null,
      gender: profile.gender || null,
      bio: profile.bio.trim() || null,
      playlist_url: profile.playlist_url.trim() || null,
      team: profile.team.trim() || null,
      is_private: isPrivate,
      account_type: profile.account_type,
    }, { onConflict: "id" });
    if (error) {
      console.error("profile save error:", error);
      setSaveError(`保存に失敗しました: ${error.message}`);
    } else {
      setSaved(true);
      if (profile.dancer_name) onDancerNameChange?.(profile.dancer_name);
      onAccountTypeChange?.(profile.account_type);
      // 保存できたことが分かるよう一瞬「SAVED!」を見せてから、自動でプロフィール画面へ戻る
      setTimeout(() => onBack?.(), 500);
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
    <div {...swipeBack} style={{ paddingBottom: "80px", background: "#000000" }}>
      <div style={{ padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D", display: "flex", alignItems: "center", gap: "16px" }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "linear-gradient(180deg, #303030, #1c1c1c)", boxShadow: "0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "600", padding: "10px 16px", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px", flexShrink: 0 }}>
            <ChevronLeft size={18} strokeWidth={2.5} /> 戻る
          </button>
        )}
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
            <input type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: "none" }} disabled={avatarUploading} />
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
        {/* 個人用・団体用の切り替え。長押しで別Googleアカウントに切り替えた時、
            どちらのプロフィールかひと目で分かるようにする */}
        <div>
          <label style={lbl}>アカウントの種類</label>
          <div style={{ display: "flex", gap: "8px" }}>
            {([["individual", "個人用"], ["organization", "団体用"]] as const).map(([value, label]) => {
              const sel = profile.account_type === value;
              return (
                <button key={value} onClick={() => { setProfile(p => ({ ...p, account_type: value })); setSaved(false); }}
                  style={{ flex: 1, padding: "10px", border: sel ? "1px solid #DC2626" : "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", background: sel ? "rgba(220,38,38,0.1)" : "transparent", color: sel ? "#DC2626" : "rgba(255,255,255,0.5)", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: sel ? "bold" : "normal", cursor: "pointer" }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div><label style={lbl}>自己紹介（任意）</label>
          <textarea style={{ ...inp, minHeight: "80px", resize: "vertical" } as React.CSSProperties} maxLength={300} placeholder="活動歴やクルー、好きなジャンルなど自由に書いてください" value={profile.bio} onChange={e => { setProfile(p => ({ ...p, bio: e.target.value })); setSaved(false); }} />
        </div>
        <div><label style={lbl}>ダンサーネーム</label>
          <input style={{ ...inp, fontSize: "15px" }} autoCapitalize="none" autoCorrect="off" placeholder="例: taro / 太郎" value={profile.dancer_name} onChange={e => { setProfile(p => ({ ...p, dancer_name: e.target.value })); setSaved(false); }} />
        </div>
        <div><label style={lbl}>チーム（任意）</label>
          <input style={inp} placeholder="例: w+i&s" value={profile.team} onChange={e => { setProfile(p => ({ ...p, team: e.target.value })); setSaved(false); }} />
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
        <div><label style={lbl}>生まれた年（西暦・任意）</label>
          <select style={inp} value={profile.birth_year} onChange={e => { setProfile(p => ({ ...p, birth_year: e.target.value })); setSaved(false); }}>
            <option value="">未設定</option>
            {Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
        </div>
        <div><label style={lbl}>Instagram（任意）</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#F0F0F0", fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif" }}>@</span>
            <input style={{ ...inp, paddingLeft: "28px" }} placeholder="username" value={profile.instagram} onChange={e => { setProfile(p => ({ ...p, instagram: e.target.value })); setSaved(false); }} />
          </div>
        </div>
        <div><label style={lbl}>プレイリスト（任意）</label>
          <input style={inp} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="Apple MusicやSpotifyのプレイリストURL" value={profile.playlist_url} onChange={e => { setProfile(p => ({ ...p, playlist_url: e.target.value })); setSaved(false); }} />
        </div>
        <div>
          <label style={lbl}>得意ジャンル</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {GENRES.map(g => { const sel = profile.genres.includes(g); const col = GENRE_COLORS[g]; return (
              <button key={g} onClick={() => toggleGenre(g)} style={{ padding: "10px", border: sel ? `1px solid ${col}` : "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", background: sel ? `${col}12` : "#141414", color: sel ? col : "rgba(255,255,255,0.45)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {g}{sel && <Check size={11} />}
              </button>
            ); })}
            <button onClick={() => { setOtherGenreSelected(v => !v); setSaved(false); }}
              style={{ padding: "10px", border: otherGenreSelected ? "1px solid #fff" : "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", background: otherGenreSelected ? "rgba(255,255,255,0.12)" : "#141414", color: otherGenreSelected ? "#fff" : "rgba(255,255,255,0.45)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              その他{otherGenreSelected && <Check size={11} />}
            </button>
          </div>
          {otherGenreSelected && (
            <input style={{ ...inp, marginTop: "8px" }} placeholder="ジャンル名を入力" maxLength={20} value={otherGenreText}
              onChange={e => { setOtherGenreText(e.target.value); setSaved(false); }} />
          )}
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

        {/* 危険な操作：アカウント削除。目立たないよう一番下に置く */}
        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <button onClick={() => setDeleteConfirmOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(220,38,38,0.7)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", padding: "4px", textDecoration: "underline", textUnderlineOffset: "2px" }}>
            アカウントを削除する
          </button>
        </div>
      </div>

      {/* アカウント削除の確認モーダル */}
      {deleteConfirmOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 260, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => !deleting && setDeleteConfirmOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderRadius: "12px", padding: "28px 24px", width: "100%", maxWidth: "320px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>⚠️</div>
            <div style={{ fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "18px", color: "#F0F0F0", marginBottom: "8px" }}>アカウントを削除</div>
            <div style={{ fontSize: "13px", color: "#F0F0F0", marginBottom: "20px", lineHeight: "1.6" }}>
              削除すると二度とログインできなくなり、プロフィール情報（名前・アイコン・自己紹介等）は消去されます。投稿した内容は履歴として残りますが、投稿者名は「退会したユーザー」と表示されます。この操作は元に戻せません。
            </div>
            {deleteError && <div style={{ marginBottom: "12px", fontSize: "11px", color: "#DC2626" }}>{deleteError}</div>}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting} style={{ flex: 1, padding: "12px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "8px", background: "none", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#F0F0F0" }}>キャンセル</button>
              <button onClick={handleDeleteAccount} disabled={deleting} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", background: "linear-gradient(135deg, #DC2626, #A61B1B)", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#FFFFFF", fontWeight: "bold", opacity: deleting ? 0.6 : 1 }}>{deleting ? "削除中..." : "削除する"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
