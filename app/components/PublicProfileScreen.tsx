"use client";
import { useState, useEffect } from "react";
import { Clock, X, Pencil, Trash2, LogOut, Menu, ChevronLeft, Link, BookOpen, FileText, MessageCircle, Music, Download } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { GenreKey } from "../lib/types";
import { formatDate, timeUntil } from "../lib/constants";
import { GenreBadge } from "./GenreBadge";
import { Loading } from "./Loading";
import { showToast } from "./Toast";

export function PublicProfileScreen({ profileId, currentUserId, onBack, onEdit, onLogout, onViewProfile, onCypherClick, onLessonClick, onEditCypher }: {
  profileId: string;
  currentUserId: string;
  onBack?: () => void;
  onEdit?: () => void;
  onLogout?: () => void;
  onViewProfile?: (id: string) => void;
  onCypherClick?: (cypherId: string) => void;
  onLessonClick?: (lessonId: string) => void;
  onEditCypher?: (cypherId: string) => void;
}) {
  const isOwn = profileId === currentUserId;
  type ProfileData = { dancer_name: string; genres: GenreKey[]; instagram: string | null; dance_years: number | null; age_group: string | null; gender: string | null; bio: string | null; playlist_url: string | null; avatar_url: string | null; is_private: boolean };
  type HostedCypher = { id: string; title: string; starts_at: string; location: string; participant_count: number };
  type JoinedCypher = { id: string; title: string; starts_at: string; location: string; organizer_name: string };
  type HostedLesson = { id: string; title: string; starts_at: string; location: string; kind: "lesson" | "event" };

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [followStatus, setFollowStatus] = useState<"none" | "pending" | "accepted">("none");
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [hostedCyphers, setHostedCyphers] = useState<HostedCypher[]>([]);
  const [hostedLessons, setHostedLessons] = useState<HostedLesson[]>([]);
  const [joinedCyphers, setJoinedCyphers] = useState<JoinedCypher[]>([]);
  const [cypherTab, setCypherTab] = useState<"joined" | "hosted">("joined");
  const [loading, setLoading] = useState(true);
  const [participantSheet, setParticipantSheet] = useState<{ title: string; participants: Array<{ profile_id: string; dancer_name: string; avatar_url: string | null }> } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; kind: "cypher" | "lesson" } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [followSheet, setFollowSheet] = useState<{ type: "followers" | "following"; users: { id: string; dancer_name: string; avatar_url: string | null }[] } | null>(null);
  const [followSheetLoading, setFollowSheetLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrSaving, setQrSaving] = useState(false);
  const [qrComposite, setQrComposite] = useState<string | null>(null);

  // QRコードの中心に爆踊ロゴを合成する。誤り訂正レベルを最高（H）にしてQRを生成しているので、
  // 中央の一部が隠れても読み取れる。canvasでQR画像とロゴ画像を重ねてPNGにする
  useEffect(() => {
    if (!showQR) { setQrComposite(null); return; }
    const profileUrl = `${window.location.origin}/u/${profileId}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=440x440&ecc=H&data=${encodeURIComponent(profileUrl)}`;
    let cancelled = false;

    const loadImage = (src: string, crossOrigin?: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        if (crossOrigin) img.crossOrigin = crossOrigin;
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    (async () => {
      try {
        const [qrImg, logoImg] = await Promise.all([loadImage(qrSrc, "anonymous"), loadImage("/logo.jpg")]);
        if (cancelled) return;
        const size = 440;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // QRコードは黒白で生成し、黒いモジュール部分だけオレンジ→赤のグラデーションに塗り替える
        const moduleCanvas = document.createElement("canvas");
        moduleCanvas.width = size;
        moduleCanvas.height = size;
        const moduleCtx = moduleCanvas.getContext("2d");
        if (!moduleCtx) return;
        moduleCtx.drawImage(qrImg, 0, 0, size, size);
        const imageData = moduleCtx.getImageData(0, 0, size, size);
        const pixels = imageData.data;
        for (let i = 0; i < pixels.length; i += 4) {
          // 白っぽい背景部分は透明にして、黒いモジュールだけ残す
          const luminance = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
          if (luminance > 200) pixels[i + 3] = 0;
        }
        moduleCtx.putImageData(imageData, 0, 0);
        moduleCtx.globalCompositeOperation = "source-in";
        const gradient = moduleCtx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, "#F97316"); // オレンジ
        gradient.addColorStop(1, "#DC2626"); // 赤
        moduleCtx.fillStyle = gradient;
        moduleCtx.fillRect(0, 0, size, size);

        // 白背景を敷いてから、色付けしたモジュールを重ねる
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(moduleCanvas, 0, 0);

        // 中央に白丸の台座を敷いてからロゴを丸くくり抜いて重ねる
        const cx = size / 2;
        const cy = size / 2;
        const bgRadius = size * 0.15;
        const logoRadius = size * 0.13;
        ctx.beginPath();
        ctx.arc(cx, cy, bgRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, logoRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImg, cx - logoRadius, cy - logoRadius, logoRadius * 2, logoRadius * 2);
        ctx.restore();

        if (!cancelled) setQrComposite(canvas.toDataURL("image/png"));
      } catch {
        // 合成に失敗しても素のQRコードが表示されるので何もしない
      }
    })();

    return () => { cancelled = true; };
  }, [showQR, profileId]);

  // QRコード画像を写真に保存できるようにする。外部APIの画像はdownload属性を無視されがちなので、
  // 一度blobとして取得してから保存する。スマホはWeb Share APIがあれば「写真に保存」までできる
  const handleSaveQR = async (qrSrc: string) => {
    setQrSaving(true);
    try {
      const res = await fetch(qrSrc);
      const blob = await res.blob();
      const file = new File([blob], "bakuodo-profile-qr.png", { type: blob.type || "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bakuodo-profile-qr.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      // シェアシートを閉じただけ（AbortError）の場合はエラー扱いしない
      if ((e as any)?.name !== "AbortError") showToast("QRコードの保存に失敗しました");
    }
    setQrSaving(false);
  };

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const [profileRes, hostedRes, hostedLessonsRes, allPartsRes, followersRes, followingRes] = await Promise.all([
        supabase.from("profiles").select("dancer_name, genres, instagram, dance_years, age_group, gender, bio, playlist_url, avatar_url, is_private").eq("id", profileId).single(),
        supabase.from("cyphers").select("id, title, starts_at, location").eq("organizer_id", profileId).order("starts_at", { ascending: false }),
        supabase.from("private_lessons").select("id, title, starts_at, location, kind").eq("organizer_id", profileId).order("starts_at", { ascending: false }),
        supabase.from("participations").select("cypher_id"),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", profileId).eq("status", "accepted"),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", profileId),
      ]);
      if (profileRes.data) {
        const d = profileRes.data as any;
        setProfileData({ dancer_name: d.dancer_name ?? "", genres: (d.genres ?? []) as GenreKey[], instagram: d.instagram ?? null, dance_years: d.dance_years ?? null, age_group: d.age_group ?? null, gender: d.gender ?? null, bio: d.bio ?? null, playlist_url: d.playlist_url ?? null, avatar_url: d.avatar_url ?? null, is_private: d.is_private ?? false });
      }
      setFollowerCount(followersRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);
      if (!isOwn && currentUserId) {
        const { data: myFollow } = await supabase.from("follows").select("id, status").eq("follower_id", currentUserId).eq("following_id", profileId).maybeSingle();
        setFollowStatus((myFollow as any)?.status === "accepted" ? "accepted" : (myFollow as any)?.status === "pending" ? "pending" : "none");
      }
      const countMap: Record<string, number> = {};
      (allPartsRes.data ?? []).forEach((p: any) => { countMap[p.cypher_id] = (countMap[p.cypher_id] ?? 0) + 1; });
      if (hostedRes.data) {
        setHostedCyphers((hostedRes.data as any[]).map(c => ({ id: c.id, title: c.title, starts_at: c.starts_at, location: c.location, participant_count: countMap[c.id] ?? 0 })));
      }
      if (hostedLessonsRes.data) {
        setHostedLessons((hostedLessonsRes.data as any[]).map(l => ({ id: l.id, title: l.title, starts_at: l.starts_at, location: l.location, kind: l.kind === "event" ? "event" : "lesson" })));
      }
      if (isOwn) {
        const { data: joinedData } = await supabase.from("participations")
          .select("cyphers:cypher_id(id, title, starts_at, location, profiles:organizer_id(dancer_name))")
          .eq("profile_id", profileId);
        if (joinedData) {
          setJoinedCyphers((joinedData as any[]).map(row => row.cyphers).filter(Boolean)
            .map((c: any) => ({ id: c.id, title: c.title, starts_at: c.starts_at, location: c.location, organizer_name: c.profiles?.dancer_name ?? "UNKNOWN" })));
        }
      }
      setLoading(false);
    }
    fetchAll();
  }, [profileId, currentUserId, isOwn]);

  const handleFollow = async () => {
    if (isOwn || followLoading || !currentUserId) return;
    setFollowLoading(true);
    if (followStatus === "accepted") {
      // フォロー解除
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", profileId);
      setFollowStatus("none");
      setFollowerCount(n => n - 1);
    } else if (followStatus === "pending") {
      // 申請キャンセル
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", profileId);
      setFollowStatus("none");
    } else {
      // 新規フォロー or 申請。status（鍵アカならpending）と相手への通知はDBトリガーが決める
      const { data, error } = await supabase.from("follows")
        .insert({ follower_id: currentUserId, following_id: profileId })
        .select("status")
        .single();
      if (!error && data) {
        const status = data.status === "pending" ? "pending" : "accepted";
        if (status === "accepted") setFollowerCount(n => n + 1);
        setFollowStatus(status);
      }
    }
    setFollowLoading(false);
  };

  const openFollowSheet = async (type: "followers" | "following") => {
    setFollowSheetLoading(true);
    setFollowSheet({ type, users: [] });
    if (type === "followers") {
      const { data } = await supabase.from("follows").select("follower_id, profiles:follower_id(dancer_name, avatar_url)").eq("following_id", profileId);
      setFollowSheet({ type, users: (data ?? []).map((r: any) => ({ id: r.follower_id, dancer_name: r.profiles?.dancer_name ?? "UNKNOWN", avatar_url: r.profiles?.avatar_url ?? null })) });
    } else {
      const { data } = await supabase.from("follows").select("following_id, profiles:following_id(dancer_name, avatar_url)").eq("follower_id", profileId);
      setFollowSheet({ type, users: (data ?? []).map((r: any) => ({ id: r.following_id, dancer_name: r.profiles?.dancer_name ?? "UNKNOWN", avatar_url: r.profiles?.avatar_url ?? null })) });
    }
    setFollowSheetLoading(false);
  };

  const handleOpenParticipants = async (cypher: HostedCypher) => {
    const { data } = await supabase.from("participations").select("profile_id, profiles:profile_id(dancer_name, avatar_url)").eq("cypher_id", cypher.id);
    setParticipantSheet({ title: cypher.title, participants: (data ?? []).map((row: any) => ({ profile_id: row.profile_id, dancer_name: row.profiles?.dancer_name ?? "UNKNOWN", avatar_url: row.profiles?.avatar_url ?? null })) });
  };

  // サイファーもレッスンも、FK制約があるので関連レコードを先に消す
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { id, kind } = deleteConfirm;
    if (kind === "cypher") {
      await supabase.from("participations").delete().eq("cypher_id", id);
      await supabase.from("cypher_genres").delete().eq("cypher_id", id);
      const { error } = await supabase.from("cyphers").delete().eq("id", id).eq("organizer_id", currentUserId);
      if (!error) setHostedCyphers(prev => prev.filter(c => c.id !== id));
    } else {
      await supabase.from("pl_participations").delete().eq("lesson_id", id);
      await supabase.from("pl_genres").delete().eq("lesson_id", id);
      const { error } = await supabase.from("private_lessons").delete().eq("id", id).eq("organizer_id", currentUserId);
      if (!error) setHostedLessons(prev => prev.filter(l => l.id !== id));
    }
    setDeleteConfirm(null);
  };

  const name = profileData?.dancer_name || "DANCER";

  // レッスン・イベント1件分のカード（他人のプロフィールの主催一覧と、自分の主催タブのP LESSON/EVENT区分の両方で使う）
  const renderLessonRow = (l: HostedLesson) => {
    const { date, time } = formatDate(l.starts_at);
    const ended = timeUntil(l.starts_at) === "終了";
    const isEv = l.kind === "event";
    const accent = isEv ? "#EAB308" : "#2563EB";
    return (
      <div key={l.id} onClick={() => onLessonClick?.(l.id)} style={{ padding: "10px 14px", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderLeft: "3px solid " + accent, borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: onLessonClick ? "pointer" : "default", opacity: ended ? 0.5 : 1 }}>
        <div>
          <div style={{ fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: ended ? "rgba(255,255,255,0.45)" : "#F0F0F0" }}>{l.title}</div>
          <div style={{ fontSize: "10px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}><Clock size={9} color="rgba(255,255,255,0.35)" />{date} {time}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          {ended
            ? <span style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", padding: "2px 7px", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "3px" }}>終了</span>
            : <span style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: accent, fontWeight: "bold", padding: "2px 7px", background: accent + "14", borderRadius: "3px" }}>{isEv ? "EVENT" : "PRIVATE"}</span>}
          {/* 自分のレッスンには削除ボタン（終了後も消せる） */}
          {isOwn && (
            <button onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: l.id, kind: "lesson" }); }} title="削除"
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#F0F0F0", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={14} /></button>
          )}
        </div>
      </div>
    );
  };

  // 主催タブ：CYPHER / P LESSON / EVENT で見出しを分けて表示するための振り分け
  const hostedPlList = hostedLessons.filter(l => l.kind === "lesson");
  const hostedEventList = hostedLessons.filter(l => l.kind === "event");

  // 主催レッスン・イベント一覧（他人のプロフィールでは種類を分けずまとめて出す）
  const lessonRows = hostedLessons.length > 0 && (
    <div style={{ marginTop: "12px" }}>
      <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em", margin: "0 0 6px 2px" }}>LESSON &amp; EVENT / レッスン・イベント</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {hostedLessons.map(renderLessonRow)}
      </div>
    </div>
  );

  return (
    <div style={onBack
      ? { position: "fixed", inset: 0, zIndex: 150, background: "#000000", overflow: "hidden", display: "flex", flexDirection: "column", animation: "slideInRight 0.22s ease-out" }
      : { height: "100dvh", overflow: "hidden", display: "flex", flexDirection: "column", background: "#000000" }
    }>
      {/* ヘッダー。Instagramと同じ並びにする：
          上段＝アイコンと数字が横並び、その下に名前、いちばん下に横長のボタン
          「参加/主催」より下のカード一覧だけがスクロールするよう、ここは固定（flexShrink:0） */}
      <div style={{ padding: "16px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          {onBack ? (
            <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "13px", fontWeight: "600", padding: "10px 16px", display: "flex", alignItems: "center", gap: "4px", minHeight: "44px" }}>
              <ChevronLeft size={18} strokeWidth={2.5} /> 戻る
            </button>
          ) : (
            <div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.2em" }}>▶ プロフィール</div>
          )}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {isOwn && (
              <div style={{ position: "relative" }}>
                <button onClick={() => setMenuOpen(m => !m)}
                  style={{ background: "none", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "8px", cursor: "pointer", padding: "8px 10px", display: "flex", alignItems: "center", color: "#F0F0F0" }}>
                  <Menu size={16} />
                </button>
                {menuOpen && (<>
                  <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#1E1E1E", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "10px", boxShadow: "0 4px 20px rgba(0,0,0,0.4)", overflow: "hidden", zIndex: 10, minWidth: "140px" }}>
                    {/* 「編集」はヘッダーの横長ボタンに移したのでメニューからは外した */}
                    <button onClick={() => {
                        setMenuOpen(false);
                        const url = `${window.location.origin}/u/${profileId}`;
                        navigator.clipboard.writeText(url).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); });
                      }}
                      style={{ width: "100%", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: linkCopied ? "#16A34A" : "#F0F0F0", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <Link size={13} /> {linkCopied ? "コピーしました！" : "プロフィールリンクをコピー"}
                    </button>
                    <a href="/help" style={{ width: "100%", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <BookOpen size={13} /> 使い方ガイド
                    </a>
                    <a href="/terms" style={{ width: "100%", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <FileText size={13} /> 利用規約
                    </a>
                    <a href="https://docs.google.com/forms/d/e/1FAIpQLSdtORTcN86YUDCwq_v8f300PtwnmUENTAvGXs8AYvVS50IyGA/viewform" target="_blank" rel="noopener noreferrer" style={{ width: "100%", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <MessageCircle size={13} /> 問い合わせ
                    </a>
                    <button onClick={() => { setMenuOpen(false); onLogout?.(); }}
                      style={{ width: "100%", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#DC2626", textAlign: "left" }}>
                      <LogOut size={13} /> ログアウト
                    </button>
                  </div>
                </>)}
              </div>
            )}
          </div>
        </div>

        {/* アバターは左、名前とその真下に数字（開催が先頭）を右側にまとめる */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
          <div style={{ width: "82px", height: "82px", borderRadius: "50%", background: "linear-gradient(135deg,#DC2626,#F87171)", border: "3px solid #141414", boxShadow: "0 2px 10px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            {profileData?.avatar_url
              ? <img src={profileData.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: "30px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#fff" }}>{name[0]?.toUpperCase() ?? "?"}</span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "12px", color: "#F0F0F0" }}>{name}</h2>
            {/* space-betweenにして「開催」を左端＝名前の真下に揃える */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px" }}>
              {([
                ["開催", hostedCyphers.length + hostedLessons.length, undefined],
                ["フォロワー", followerCount, () => openFollowSheet("followers")],
                ["フォロー中", followingCount, () => openFollowSheet("following")],
              ] as const).map(([label, count, onClick]) => (
                <button key={label} onClick={onClick} disabled={!onClick}
                  style={{ background: "none", border: "none", padding: "4px 6px", cursor: onClick ? "pointer" : "default", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                  <span style={{ fontSize: "17px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>{count}</span>
                  <span style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0" }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {profileData?.bio && (
          <p style={{ margin: "8px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.7)", fontFamily: "'Noto Sans JP',sans-serif", lineHeight: 1.6, whiteSpace: "pre-line" }}>{profileData.bio}</p>
        )}

        {/* Instagram・プレイリストは横幅を半分にして、残りにその他項目のバッジを並べる */}
        {profileData && (profileData.instagram || profileData.playlist_url || profileData.age_group || profileData.dance_years != null || profileData.gender || profileData.genres.length > 0) && (
          <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "flex-start" }}>
            {/* 他項目のバッジを先に、Instagram・プレイリストは下の行に表示する */}
            {(profileData.age_group || profileData.dance_years != null || profileData.gender || profileData.genres.length > 0) && (
              <div style={{ flexBasis: "100%", display: "flex", flexWrap: "wrap", alignContent: "flex-start", gap: "6px" }}>
                {profileData.age_group && <span style={{ fontSize: "11px", padding: "3px 9px", background: "rgba(255,255,255,0.08)", borderRadius: "20px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>{profileData.age_group}</span>}
                {profileData.dance_years != null && <span style={{ fontSize: "11px", padding: "3px 9px", background: "rgba(255,255,255,0.08)", borderRadius: "20px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>歴{profileData.dance_years}年</span>}
                {profileData.gender && <span style={{ fontSize: "11px", padding: "3px 9px", background: "rgba(255,255,255,0.08)", borderRadius: "20px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>{profileData.gender}</span>}
                {profileData.genres.map(g => <GenreBadge key={g} genre={g} />)}
              </div>
            )}
            {/* gap(8px)ぶんを差し引いた50%にして、2つがきっちり横並びになるようにする */}
            {/* 「プロフィールを編集」ボタンと同じ枠サイズ（padding/borderRadius）に揃え、
                INSTAGRAM/SPOTIFYなどのラベル文字は出さない */}
            {profileData.instagram && (
              <a href={`https://instagram.com/${profileData.instagram}`} target="_blank" rel="noopener noreferrer"
                style={{ flex: "0 1 calc(50% - 4px)", minWidth: "130px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "6px 10px", borderRadius: "8px", border: "1px solid rgba(168,85,247,0.35)", textDecoration: "none", background: "rgba(168,85,247,0.1)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="22" height="22" rx="6" stroke="#A855F7" strokeWidth="1.8" fill="none"/>
                  <circle cx="12" cy="12" r="4.2" stroke="#A855F7" strokeWidth="1.8" fill="none"/>
                  <circle cx="17.2" cy="6.8" r="1.1" fill="#A855F7"/>
                </svg>
                <span style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: "#A855F7", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{profileData.instagram}</span>
              </a>
            )}
            {profileData.playlist_url && (() => {
              // URLからApple Music / Spotifyを見分けて色を変える
              const color = profileData.playlist_url.includes("spotify.com") ? "#1DB954"
                : profileData.playlist_url.includes("music.apple.com") ? "#FA243C"
                : "#F0F0F0";
              return (
                <a href={profileData.playlist_url} target="_blank" rel="noopener noreferrer"
                  style={{ flex: "0 1 calc(50% - 4px)", minWidth: "130px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "6px 10px", borderRadius: "8px", border: `1px solid ${color}59`, textDecoration: "none", background: `${color}1A` }}>
                  <Music size={14} color={color} />
                  <span style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color, fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>プレイリストを聴く</span>
                </a>
              );
            })()}
          </div>
        )}

        {/* 横長のボタン（インスタと同じ位置）。自分のプロフィールでは編集とシェアを並べる */}
        {isOwn ? (
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button onClick={() => onEdit?.()}
              style={{ flex: 1, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "8px", background: "transparent", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>
              プロフィールを編集
            </button>
            <button onClick={() => setShowQR(true)}
              style={{ flex: 1, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "8px", background: "transparent", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>
              プロフィールをシェア
            </button>
          </div>
        ) : currentUserId && (
          <button onClick={handleFollow} disabled={followLoading}
            style={{ width: "100%", marginTop: "8px", padding: "8px", border: followStatus !== "none" ? "1px solid rgba(255,255,255,0.16)" : "none", borderRadius: "8px", background: followStatus !== "none" ? "transparent" : "#DC2626", color: followStatus !== "none" ? "rgba(255,255,255,0.55)" : "#fff", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px", fontWeight: "bold", cursor: "pointer", opacity: followLoading ? 0.6 : 1 }}>
            {followStatus === "accepted" ? "フォロー中" : followStatus === "pending" ? "申請中..." : (profileData?.is_private ? "🔒 申請する" : "フォローする")}
          </button>
        )}
      </div>

      {/* 参加/主催 切り替えタブ。ここは固定し、下のカード一覧だけがスクロールする */}
      {!loading && isOwn && (
        <div style={{ padding: "6px 16px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "4px", background: "#1A1A1A", borderRadius: "12px", padding: "3px" }}>
            {(["joined", "hosted"] as const).map(t => (
              <button key={t} onClick={() => setCypherTab(t)}
                style={{ flex: 1, padding: "5px 4px", border: "none", borderRadius: "9px", background: cypherTab === t ? "#2A2A2A" : "transparent", boxShadow: cypherTab === t ? "0 1px 4px rgba(255,255,255,0.08)" : "none", color: cypherTab === t ? "#DC2626" : "rgba(255,255,255,0.55)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", fontWeight: cypherTab === t ? "bold" : "normal", transition: "all 0.15s" }}>
                {t === "joined" ? "参加" : "主催"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* カード一覧。ここだけ上下スクロールできる */}
      <div className="bd-scroll" style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" as any, padding: "6px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {loading ? (
          <Loading />
        ) : (<>
          {/* 開催・参加した記録：自分なら参加/主催の2タブ（過去はグレー）、他人なら主催のみ */}
          {isOwn ? (
            cypherTab === "joined" ? (
              <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", overflow: "hidden" }}>
                {joinedCyphers.length === 0
                  ? <div style={{ textAlign: "center", padding: "32px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>まだ参加しているサイファーはありません</div>
                  : joinedCyphers.map(c => {
                      const { date, time } = formatDate(c.starts_at);
                      const isPast = new Date(c.starts_at) < new Date();
                      return (
                        <div key={c.id} onClick={() => onCypherClick?.(c.id)} style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", opacity: isPast ? 0.45 : 1, cursor: onCypherClick ? "pointer" : "default" }}>
                          <div style={{ fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>{c.title}</div>
                          <div style={{ fontSize: "10px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", marginBottom: "3px" }}>by {c.organizer_name}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><Clock size={9} />{date} {time}</span>
                            {isPast && <span style={{ fontSize: "9px", padding: "1px 5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", color: "#F0F0F0" }}>終了</span>}
                          </div>
                        </div>
                      );})}
              </div>
            ) : (
              // 主催タブ：CYPHER / P LESSON / EVENT を種類ごとに見出しを分けて表示する
              hostedCyphers.length === 0 && hostedLessons.length === 0
                ? <div style={{ textAlign: "center", padding: "32px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>まだ主催しているサイファー・レッスンはありません</div>
                : (<>
                    {hostedCyphers.length > 0 && (
                      <div style={{ marginBottom: (hostedPlList.length > 0 || hostedEventList.length > 0) ? "12px" : 0 }}>
                        <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em", margin: "0 0 6px 2px" }}>CYPHER / サイファー</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {hostedCyphers.map(c => {
                            const { date, time } = formatDate(c.starts_at);
                            const isPast = new Date(c.starts_at) < new Date();
                            return (
                              // 編集・削除の2つ分ボタンがある分レッスン側より右側が広いので、タイトルは折返し禁止＋省略記号で
                              // ボタンを押し出さないようにする
                              <div key={c.id} onClick={() => onCypherClick?.(c.id)} style={{ padding: "10px 14px", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderLeft: "3px solid #DC2626", borderRadius: "8px", cursor: onCypherClick ? "pointer" : "default", opacity: isPast ? 0.45 : 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", marginTop: "2px" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><Clock size={9} color="rgba(255,255,255,0.35)" />{date} {time}</span>
                                    {isPast && <span style={{ fontSize: "9px", padding: "1px 5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", color: "#F0F0F0" }}>終了</span>}
                                  </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0, marginLeft: "8px" }}>
                                  <span style={{ fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: isPast ? "rgba(255,255,255,0.35)" : "#DC2626", fontWeight: "bold" }}>{c.participant_count}人</span>
                                  {/* 編集は開催前だけ。削除は終わったものにも出す
                                      （テストで作ったサイファーを後片付けできるように） */}
                                  {!isPast && <button onClick={e => { e.stopPropagation(); onEditCypher?.(c.id); }} title="編集" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#F0F0F0", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}><Pencil size={13} /></button>}
                                  <button onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: c.id, kind: "cypher" }); }} title="削除" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#F0F0F0", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={14} /></button>
                                </div>
                              </div>
                            );})}
                        </div>
                      </div>
                    )}
                    {hostedPlList.length > 0 && (
                      <div style={{ marginBottom: hostedEventList.length > 0 ? "12px" : 0 }}>
                        <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em", margin: "0 0 6px 2px" }}>P LESSON / プライベートレッスン</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {hostedPlList.map(renderLessonRow)}
                        </div>
                      </div>
                    )}
                    {hostedEventList.length > 0 && (
                      <div>
                        <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em", margin: "0 0 6px 2px" }}>EVENT / イベント</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {hostedEventList.map(renderLessonRow)}
                        </div>
                      </div>
                    )}
                  </>)
            )
          ) : (
            hostedCyphers.length === 0 && hostedLessons.length === 0
              ? <div style={{ textAlign: "center", padding: "40px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>まだ主催しているサイファー・レッスンはありません</div>
              : hostedCyphers.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {hostedCyphers.map(c => { const { date, time } = formatDate(c.starts_at); const ended = timeUntil(c.starts_at) === "終了"; return (
                    <div key={c.id} onClick={() => onCypherClick?.(c.id)} style={{ padding: "10px 14px", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: onCypherClick ? "pointer" : "default" }}>
                      <div>
                        <div style={{ fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: ended ? "rgba(255,255,255,0.45)" : "#F0F0F0" }}>{c.title}</div>
                        <div style={{ fontSize: "10px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}><Clock size={9} color="rgba(255,255,255,0.35)" />{date} {time}</div>
                      </div>
                      {ended ? <span style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", padding: "2px 7px", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "3px" }}>終了</span>
                             : <span style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "#DC2626", fontWeight: "bold" }}>{c.participant_count}人</span>}
                    </div>
                  );})}
                </div>
          )}
          {!isOwn && lessonRows}
          {/* 下の固定ナビに隠れないための余白（自分のプロフィールタブ表示時のみ） */}
          {!onBack && <div style={{ height: "80px", flexShrink: 0 }} />}
        </>)}
      </div>

      {/* 参加者一覧シート */}
      {participantSheet && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }} onClick={() => setParticipantSheet(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", margin: "0 auto", background: "#141414", borderRadius: "12px 12px 0 0", padding: "24px 20px 40px", maxHeight: "70vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em", marginBottom: "4px" }}>PARTICIPANTS</div>
                <div style={{ fontSize: "22px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>{participantSheet.title}</div>
              </div>
              <button onClick={() => setParticipantSheet(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={20} /></button>
            </div>
            {participantSheet.participants.length === 0
              ? <div style={{ textAlign: "center", padding: "32px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>まだ参加者はいません</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {participantSheet.participants.map(p => (
                    <button key={p.profile_id} onClick={() => { setParticipantSheet(null); onViewProfile?.(p.profile_id); }}
                      style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", background: "#1A1A1A", border: "none", borderRadius: "8px", cursor: "pointer", textAlign: "left", width: "100%" }}>
                      <div style={{ width: "38px", height: "38px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", flexShrink: 0 }}>
                        {p.avatar_url
                          ? <img src={p.avatar_url} alt={p.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : p.dancer_name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div style={{ fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 600, color: "#F0F0F0" }}>{p.dancer_name}</div>
                    </button>
                  ))}
                </div>
            }
          </div>
        </div>
      )}

      {/* フォロワー・フォロー一覧シート */}
      {followSheet && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setFollowSheet(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "360px", background: "#141414", borderRadius: "16px", padding: "24px 20px", maxHeight: "70vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em", marginBottom: "4px" }}>
                  {followSheet.type === "followers" ? "FOLLOWERS" : "FOLLOWING"}
                </div>
                <div style={{ fontSize: "22px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>
                  {followSheet.type === "followers" ? "フォロワー" : "フォロー中"}
                </div>
              </div>
              <button onClick={() => setFollowSheet(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={20} /></button>
            </div>
            {followSheetLoading
              ? <div style={{ textAlign: "center", padding: "32px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>読み込み中...</div>
              : followSheet.users.length === 0
                ? <div style={{ textAlign: "center", padding: "32px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>まだいません</div>
                : <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {followSheet.users.map(u => (
                      <button key={u.id} onClick={() => { setFollowSheet(null); onViewProfile?.(u.id); }}
                        style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", background: "#1A1A1A", border: "none", borderRadius: "8px", cursor: "pointer", textAlign: "left", width: "100%" }}>
                        <div style={{ width: "38px", height: "38px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", flexShrink: 0 }}>
                          {u.avatar_url
                            ? <img src={u.avatar_url} alt={u.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : u.dancer_name[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div style={{ fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 600, color: "#F0F0F0" }}>{u.dancer_name}</div>
                      </button>
                    ))}
                  </div>
            }
          </div>
        </div>
      )}

      {/* 削除確認モーダル（サイファー・レッスン共通） */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setDeleteConfirm(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#141414", borderRadius: "12px", padding: "28px 24px", width: "100%", maxWidth: "320px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>🗑️</div>
            <div style={{ fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "20px", color: "#F0F0F0", marginBottom: "8px" }}>{deleteConfirm.kind === "cypher" ? "サイファーを削除" : "レッスンを削除"}</div>
            <div style={{ fontSize: "13px", color: "#F0F0F0", marginBottom: "24px", lineHeight: "1.6" }}>削除すると{deleteConfirm.kind === "cypher" ? "参加者" : "申込"}の記録もすべて消えます。開催履歴からも消えます。本当に削除しますか？</div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "12px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "8px", background: "none", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#F0F0F0" }}>キャンセル</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", background: "#DC2626", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "11px", color: "#FFFFFF", fontWeight: "bold" }}>削除する</button>
            </div>
          </div>
        </div>
      )}

      {/* プロフィールシェア用QRコード */}
      {showQR && (() => {
        const profileUrl = `${window.location.origin}/u/${profileId}`;
        // ロゴ合成がまだ終わっていない間は素のQRコードを表示し、できあがり次第差し替える
        const qrImageSrc = qrComposite || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&ecc=H&data=${encodeURIComponent(profileUrl)}`;
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setShowQR(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#141414", borderRadius: "16px", padding: "24px 20px", width: "100%", maxWidth: "320px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em" }}>SHARE PROFILE</div>
                <button onClick={() => setShowQR(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={18} /></button>
              </div>
              <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", display: "inline-block", lineHeight: 0 }}>
                <img src={qrImageSrc} alt="プロフィールのQRコード" width={220} height={220} />
              </div>
              <div style={{ marginTop: "14px", fontSize: "11px", color: "rgba(255,255,255,0.55)", fontFamily: "'Noto Sans JP',sans-serif", wordBreak: "break-all" }}>{profileUrl}</div>
              <button
                onClick={() => handleSaveQR(qrImageSrc)}
                disabled={qrSaving}
                style={{ marginTop: "14px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "#F0F0F0", border: "none", borderRadius: "8px", padding: "8px 10px", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#141414", cursor: qrSaving ? "default" : "pointer", opacity: qrSaving ? 0.6 : 1 }}
              >
                <Download size={14} />
                {qrSaving ? "保存中..." : "写真に保存"}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
