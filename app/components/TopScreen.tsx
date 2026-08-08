"use client";
import { useState, useEffect, useRef } from "react";
import { Radio, Bell, Search, X, SlidersHorizontal, Navigation, Loader } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { Cypher, PrivateLesson, GenreKey } from "../lib/types";
import { GENRES, GENRE_COLORS, timeUntil, formatDate, formatEndTime, calcDistanceM } from "../lib/constants";
import { CypherCard } from "./CypherCard";
import { PLCard } from "./PLCard";
import { SpotCard } from "./SpotCard";
import { Logo } from "./Logo";
import { showToast } from "./Toast";
import { Loading } from "./Loading";

export type TopSection = "cypher" | "pl" | "spots";

export function TopScreen({ onNav, onCardClick, onPLClick, onViewProfile, user, refreshKey, dancerName, myAvatarUrl, unreadCount, onBell, section, onSectionChange }: {
  onNav: (s: string) => void;
  onCardClick: (c: Cypher) => void;
  onPLClick: (l: PrivateLesson) => void;
  onViewProfile?: (id: string) => void;
  user: SupabaseUser;
  refreshKey: number;
  dancerName: string;
  myAvatarUrl: string | null;
  unreadCount: number;
  onBell: () => void;
  // 表示中のセクションはpage.tsxが持つ。投稿画面を開いた時にどちらの
  // 作成フォームを出すか決めるのに使うため、画面を離れても覚えておきたい
  section: TopSection;
  onSectionChange: (s: TopSection) => void;
}) {
  const SECTION_ORDER = ["cypher", "pl", "spots"] as const;
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const goToSection = (next: TopSection) => {
    const curIdx = SECTION_ORDER.indexOf(section);
    const nextIdx = SECTION_ORDER.indexOf(next);
    if (nextIdx === curIdx) return;
    setSlideDir(nextIdx > curIdx ? 1 : -1);
    onSectionChange(next);
  };

  const handleContentTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleContentTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // 横移動が閾値未満、または縦移動の方が大きい場合はスクロール操作とみなして無視
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    slideBy(dx < 0 ? 1 : -1);
  };

  // トラックパッドの2本指横スワイプはtouchではなくwheel(deltaX)で飛んでくるので別途拾う
  const wheelAccumRef = useRef(0);
  const wheelLockRef = useRef(false);
  const wheelResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slideBy = (dir: 1 | -1) => {
    const curIdx = SECTION_ORDER.indexOf(section);
    const nextIdx = curIdx + dir;
    if (nextIdx < 0 || nextIdx >= SECTION_ORDER.length) return;
    goToSection(SECTION_ORDER[nextIdx]);
  };

  const handleContentWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // 縦スクロールは触らない
    if (wheelLockRef.current) return;
    wheelAccumRef.current += e.deltaX;
    // 指を離してしばらく経ったら溜めをリセット（別ジェスチャー扱いにする）
    if (wheelResetRef.current) clearTimeout(wheelResetRef.current);
    wheelResetRef.current = setTimeout(() => { wheelAccumRef.current = 0; }, 150);
    if (Math.abs(wheelAccumRef.current) < 80) return;
    const dir = wheelAccumRef.current > 0 ? 1 : -1;
    wheelAccumRef.current = 0;
    // 1ジェスチャーで2枚も3枚も飛ばないよう、切り替え直後は少し無視する
    wheelLockRef.current = true;
    setTimeout(() => { wheelLockRef.current = false; }, 500);
    slideBy(dir);
  };
  const [spots, setSpots] = useState<{ id: string; name: string; location: string; description: string | null; latitude: number | null; longitude: number | null }[]>([]);
  const [cyphers, setCyphers] = useState<Cypher[]>([]);
  const [lessons, setLessons] = useState<PrivateLesson[]>([]);
  const [loading, setLoading] = useState(true);
  // 検索・フィルター
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<GenreKey[]>([]);
  // カレンダーで選んだ特定の日付（"YYYY-MM-DD"）。空文字なら未指定
  const [specificDate, setSpecificDate] = useState("");
  // ヘッダーのロゴから開くカレンダー（検索ドロワーの日付と同じ値を使う）
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [areaText, setAreaText] = useState("");
  // 現在地
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    async function fetchCyphers() {
      setLoading(true);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const now = new Date().toISOString();
      const [cypherRes, countRes, followRes] = await Promise.all([
        supabase
          .from("cyphers")
          .select(`
            id, title, organizer_id, starts_at, ends_at, location, description, max_members, status, visibility, requires_approval, studio_fee,
            profiles:organizer_id ( dancer_name, avatar_url, instagram ),
            cypher_genres ( genres:genre_id ( name ) )
          `)
          // これから始まるもの＋開催中のもの（深夜跨ぎでも終了時刻までは表示する）
          .or(`starts_at.gte.${oneHourAgo},ends_at.gte.${now}`)
          .order("starts_at"),
        // 参加者数は集計ビューから取得（participations全件を読まない）
        supabase.from("cypher_participant_counts").select("cypher_id, approved_count"),
        supabase.from("follows").select("following_id").eq("follower_id", user.id).eq("status", "accepted"),
      ]);
      if (cypherRes.error) { console.error(cypherRes.error); setLoading(false); return; }

      const countMap: Record<string, number> = {};
      (countRes.data ?? []).forEach((p: any) => {
        countMap[p.cypher_id] = p.approved_count ?? 0;
      });

      const followingIds = new Set((followRes.data ?? []).map((f: any) => f.following_id));

      const shaped: Cypher[] = (cypherRes.data ?? []).map((row: any) => {
        const name = row.profiles?.dancer_name ?? "UNKNOWN";
        const genres: GenreKey[] = (row.cypher_genres ?? []).map((cg: any) => cg.genres?.name as GenreKey).filter(Boolean);
        const count = countMap[row.id] ?? 0;
        return { id: row.id, title: row.title, starts_at: row.starts_at, ends_at: row.ends_at ?? null, location: row.location, description: row.description ?? "", max_members: row.max_members, status: row.status, visibility: row.visibility ?? "public", requires_approval: row.requires_approval ?? false, studio_fee: row.studio_fee ?? null, genres, organizer: { id: row.organizer_id, dancer_name: name, avatar: name[0]?.toUpperCase() ?? "?", avatar_url: row.profiles?.avatar_url ?? null, instagram: row.profiles?.instagram ?? null }, participant_count: count, hot: count >= 5 };
      }).filter((c: any) =>
        // プライベートサイファーは自分が主催 or フォロワーのみ表示
        c.visibility === "public" || c.organizer.id === user.id || followingIds.has(c.organizer.id)
      );

      shaped.sort((a, b) => {
        const aF = followingIds.has(a.organizer.id) ? 0 : 1;
        const bF = followingIds.has(b.organizer.id) ? 0 : 1;
        if (aF !== bF) return aF - bF;
        return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
      });
      setCyphers(shaped);

      // PLフェッチ
      const [plRes, plCountRes] = await Promise.all([
        supabase.from("private_lessons").select(`
          id, title, organizer_id, starts_at, ends_at, location, description, max_members, price, target_level, visibility, requires_approval,
          profiles:organizer_id ( dancer_name, avatar_url, instagram ),
          pl_genres ( genres:genre_id ( name ) )
        `).or(`starts_at.gte.${oneHourAgo},ends_at.gte.${now}`).order("starts_at"),
        supabase.from("pl_participant_counts").select("lesson_id, approved_count"),
      ]);
      if (plRes.data) {
        const plCountMap: Record<string, number> = {};
        (plCountRes.data ?? []).forEach((p: any) => { plCountMap[p.lesson_id] = p.approved_count ?? 0; });
        const shapedPL: PrivateLesson[] = (plRes.data ?? []).map((row: any) => {
          const name = row.profiles?.dancer_name ?? "UNKNOWN";
          const genres: GenreKey[] = (row.pl_genres ?? []).map((cg: any) => cg.genres?.name as GenreKey).filter(Boolean);
          return { id: row.id, title: row.title, starts_at: row.starts_at, ends_at: row.ends_at ?? null, location: row.location, description: row.description ?? "", max_members: row.max_members, price: row.price ?? null, target_level: row.target_level ?? "all", visibility: row.visibility ?? "public", requires_approval: row.requires_approval ?? false, genres, organizer: { id: row.organizer_id, dancer_name: name, avatar: name[0]?.toUpperCase() ?? "?", avatar_url: row.profiles?.avatar_url ?? null, instagram: row.profiles?.instagram ?? null }, participant_count: plCountMap[row.id] ?? 0 };
        }).filter((l: PrivateLesson) => l.visibility === "public" || l.organizer.id === user.id || followingIds.has(l.organizer.id));
        setLessons(shapedPL);
      }

      setLoading(false);
    }
    fetchCyphers();

    // スポット一覧は変わらないので一度だけ取得
    supabase.from("spots").select("id, name, location, description, latitude, longitude").order("created_at").then(({ data }) => {
      if (data) setSpots(data);
    });
  }, [refreshKey]);

  const filtered = cyphers.filter(c => {
    if (selectedGenres.length > 0 && !selectedGenres.some(g => c.genres.includes(g))) return false;
    if (specificDate) {
      // <input type="date">はローカルタイムゾーンでYYYY-MM-DDを返すので、
      // starts_atも同じくローカルの年月日に直してから文字列比較する
      const d = new Date(c.starts_at);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (dStr !== specificDate) return false;
    }
    if (areaText.trim()) {
      if (!c.location.toLowerCase().includes(areaText.trim().toLowerCase())) return false;
    }
    return true;
  });

  // レッスン側もサイファーと同じ条件で絞り込む（ジャンル/日付/エリア）
  const filteredLessons = lessons.filter(l => {
    if (selectedGenres.length > 0 && !selectedGenres.some(g => l.genres.includes(g))) return false;
    if (specificDate) {
      const d = new Date(l.starts_at);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (dStr !== specificDate) return false;
    }
    if (areaText.trim()) {
      if (!l.location.toLowerCase().includes(areaText.trim().toLowerCase())) return false;
    }
    return true;
  });

  const activeFilterCount = (selectedGenres.length > 0 ? 1 : 0) + (specificDate ? 1 : 0) + (areaText.trim() ? 1 : 0);

  // 現在地取得 → 逆ジオコードでエリア名をareaTextに反映
  const handleUseLocation = async () => {
    if (!navigator.geolocation) { showToast("この端末では位置情報が使えません"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setUserLocation({ lat, lng });
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja`);
        const data = await res.json();
        const addr = data.address;
        // 市区町村レベルの名前を取得（suburb > city_district > neighbourhood > city > town）
        const area = addr.suburb ?? addr.city_district ?? addr.neighbourhood ?? addr.city ?? addr.town ?? addr.county ?? "";
        if (area) setAreaText(area);
      } catch { /* 逆ジオコード失敗しても位置情報はセット済み */ }
      setLocating(false);
    }, () => {
      showToast("位置情報の取得に失敗しました。ブラウザの設定を確認してください");
      setLocating(false);
    });
  };

  // スポットを距離順にソート
  const sortedSpots = userLocation
    ? [...spots].sort((a, b) => {
        const dA = (a.latitude && a.longitude) ? calcDistanceM(userLocation.lat, userLocation.lng, a.latitude, a.longitude) : Infinity;
        const dB = (b.latitude && b.longitude) ? calcDistanceM(userLocation.lat, userLocation.lng, b.latitude, b.longitude) : Infinity;
        return dA - dB;
      })
    : spots;
  const postCount = section === "pl" ? filteredLessons.length : filtered.length;

  // ヘッダー左上に出す今日の日付。ロゴだけだと寂しいので添える
  const today = new Date();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const todayLabel = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}(${weekdays[today.getDay()]})`;

  return (
    // 画面全体をビューポート高さで固定し、下の「固定ヘッダー＋スクロール領域」に分ける。
    // 浮き島の下部ナビは position:fixed で別レイヤーなのでここでは特に気にしなくていい
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
    {/* ヘッダー〜ジャンルチップ〜POSTSバーはスクロールしない固定エリア */}
    <div style={{ flexShrink: 0 }}>
      {/* ヘッダー */}
      <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#FFFFFF" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
          <div style={{ fontSize: "16px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "rgba(0,0,0,0.4)", letterSpacing: "0.02em" }}>{todayLabel}</div>
          {/* ロゴをタップするとカレンダーが開いて日付で絞り込める。
              日付入力は見えない状態でロゴの真下に置き、ネイティブのピッカーをそこに出す */}
          <h1 style={{ margin: 0, lineHeight: 0, textAlign: "center", position: "relative", animation: "bdLogoRollIn 1.8s cubic-bezier(0.33,1,0.68,1) both" }}>
            <button onClick={() => dateInputRef.current?.showPicker?.()} aria-label="日付で絞り込む"
              style={{ background: "none", border: "none", padding: 0, lineHeight: 0, cursor: "pointer" }}>
              <Logo size={52} />
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={specificDate}
              onChange={e => setSpecificDate(e.target.value)}
              tabIndex={-1}
              aria-hidden
              style={{ position: "absolute", left: "50%", bottom: 0, width: "1px", height: "1px", opacity: 0, border: "none", padding: 0, pointerEvents: "none" }}
            />
          </h1>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
            {/* 検索ボタン */}
            <button onClick={() => setSearchOpen(true)} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "6px" }}>
              <Search size={22} color={activeFilterCount > 0 ? "#FF3D00" : "rgba(0,0,0,0.45)"} />
              {activeFilterCount > 0 && (
                <span style={{ position: "absolute", top: "2px", right: "2px", background: "#FF3D00", color: "#fff", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", minWidth: "16px", height: "16px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", transform: "translate(4px,-4px)", lineHeight: 1 }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button onClick={onBell} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "6px" }}>
              <Bell size={22} color="rgba(0,0,0,0.45)" />
              {unreadCount > 0 && (
                <span style={{ position: "absolute", top: "2px", right: "2px", background: "#FF3D00", color: "#fff", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", minWidth: "16px", height: "16px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", transform: "translate(4px,-4px)", lineHeight: 1 }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* セクション切り替え：四角い下線タブから、丸い枠の中で選択中だけ浮くセグメント風に */}
      <div style={{ padding: "10px 16px", background: "#FFFFFF", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", gap: "4px", background: "#F5F7FA", borderRadius: "14px", padding: "4px" }}>
          {([["cypher", "CYPHER", "#FF3D00"], ["pl", "LESSON", "#2563EB"], ["spots", "SPOTS", "#16A34A"]] as const).map(([key, label, color]) => (
            <button key={key} onClick={() => goToSection(key)}
              style={{ flex: 1, padding: "9px 4px", border: "none", borderRadius: "10px", background: section === key ? "#FFFFFF" : "transparent", boxShadow: section === key ? "0 1px 4px rgba(0,0,0,0.12)" : "none", color: section === key ? color : "rgba(0,0,0,0.5)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", fontWeight: section === key ? "bold" : "normal", letterSpacing: "0.06em", transition: "all 0.15s" }}>
              {/* 選んでいるタブだけ、文字を1つずつ左から順に上下させてウェーブっぽく見せる */}
              {section === key
                ? [...label].map((ch, i) => (
                    <span key={i} style={{ display: "inline-block", animation: `bdLetterWave 1.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.125}s infinite` }}>{ch}</span>
                  ))
                : label}
            </button>
          ))}
        </div>
      </div>

      {/* ジャンルチップ（横スクロール）。CYPHER/LESSON共通 */}
      {(section === "cypher" || section === "pl") && (
        <div style={{ display: "flex", gap: "6px", padding: "10px 16px", overflowX: "auto", scrollbarWidth: "none", borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#FFFFFF" }}>
          {(["ALL", ...GENRES] as (GenreKey | "ALL")[]).map(g => {
            const sel = g === "ALL" ? selectedGenres.length === 0 : selectedGenres.includes(g as GenreKey);
            // ALLは「絞り込みなし」であって特定のジャンル/セクションではないので、
            // CYPHERタブと同じ色を使わず中立な色にする
            const col = g === "ALL" ? "#111111" : GENRE_COLORS[g as GenreKey];
            return (
              <button key={g} onClick={() => setSelectedGenres(prev => g === "ALL" ? [] : prev.includes(g as GenreKey) ? prev.filter(x => x !== g) : [...prev, g as GenreKey])}
                style={{ flexShrink: 0, padding: "5px 12px", border: sel ? `1px solid ${col}` : "1px solid rgba(0,0,0,0.12)", borderRadius: "20px", background: sel ? `${col}18` : "transparent", color: sel ? col : "rgba(0,0,0,0.55)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", fontWeight: sel ? "bold" : "normal" }}>
                {g}
              </button>
            );
          })}
        </div>
      )}

      {/* POSTS（CYPHER/LESSON共通）。ここも固定エリアに含める */}
      {(section === "cypher" || section === "pl") && (() => {
        const accent = section === "pl" ? "#2563EB" : "#FF3D00";
        return (
          <div style={{ display: "flex", padding: "10px 16px", gap: "20px", borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#FFFFFF", alignItems: "center" }}>
            {[{ label: "POSTS", value: postCount, icon: <Radio size={10} /> }].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: accent }}>{s.icon}</span>
                <span style={{ fontSize: "18px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#111111" }}>{s.value}</span>
                <span style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111111" }}>{s.label}</span>
              </div>
            ))}
            {activeFilterCount > 0 && (
              <button onClick={() => { setSelectedGenres([]); setSpecificDate(""); setAreaText(""); }}
                style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px", background: `${accent}14`, border: `1px solid ${accent}33`, borderRadius: "12px", padding: "3px 10px", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: accent, cursor: "pointer" }}>
                <X size={10} /> フィルター解除
              </button>
            )}
          </div>
        );
      })()}
    </div>

    {/* スクロールするのはここだけ。固定ヘッダーの残り高さ分だけ使う */}
    <div onTouchStart={handleContentTouchStart} onTouchEnd={handleContentTouchEnd} onWheel={handleContentWheel}
      style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" as any }}>
      <div key={section} style={{ animation: `${slideDir === 1 ? "bdSlideFromRight" : "bdSlideFromLeft"} 0.2s ease-out` }}>
      {section === "spots" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px 16px", background: "linear-gradient(180deg, rgba(22,163,74,0.04) 0%, #F5F7FA 120px)" }}>
          {sortedSpots.length === 0
            ? <div style={{ textAlign: "center", padding: "40px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>スポット情報はまだありません</div>
            : sortedSpots.map(s => <SpotCard key={s.id} spot={s} user={user} userLocation={userLocation} onViewProfile={id => onViewProfile?.(id)} />)}
        </div>
      ) : section === "pl" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 16px", background: "linear-gradient(180deg, rgba(37,99,235,0.04) 0%, #F5F7FA 120px)" }}>
          {loading && lessons.length === 0
            ? <Loading />
            : !loading && lessons.length === 0
              ? <div style={{ textAlign: "center", padding: "40px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>まだプライベートレッスンがありません</div>
              : !loading && filteredLessons.length === 0
                ? <div style={{ textAlign: "center", padding: "40px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>条件に合うレッスンがありません</div>
                : filteredLessons.map((l, i) => <PLCard key={l.id} lesson={l} index={i} onClick={() => onPLClick(l)} />)}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 16px", background: "#F5F7FA" }}>
          {/* 再フェッチ中は既存リストを出したままにする（全画面LOADINGのちらつき防止） */}
          {loading && cyphers.length === 0
            ? <Loading />
            : !loading && filtered.length === 0
              ? <div style={{ textAlign: "center", padding: "40px", color: "#111111", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>条件に合うサイファーがありません</div>
              : filtered.map((c, i) => <CypherCard key={c.id} cypher={c} index={i} onClick={() => onCardClick(c)} />)}
        </div>
      )}
      {/* 浮き島の下部ナビに隠れないための余白 */}
      <div style={{ height: "80px" }} />
      </div>
    </div>

    {/* 検索ドロワー */}
      {searchOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }} onClick={() => setSearchOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", margin: "0 auto", background: "#FFFFFF", borderRadius: "16px 16px 0 0", padding: "24px 20px 40px", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <SlidersHorizontal size={18} color="#111" />
                <span style={{ fontSize: "18px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#111", letterSpacing: "0.05em" }}>{section === "pl" ? "レッスンを検索" : "サイファーを検索"}</span>
              </div>
              <button onClick={() => setSearchOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#111111", padding: "4px" }}><X size={20} /></button>
            </div>

            {/* エリア */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111111", letterSpacing: "0.15em", marginBottom: "8px" }}>AREA</div>
              <div style={{ position: "relative", marginBottom: "8px" }}>
                <Search size={14} color="rgba(0,0,0,0.3)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={areaText}
                  onChange={e => setAreaText(e.target.value)}
                  placeholder="例: 新宿、渋谷、横浜（部分一致）"
                  style={{ width: "100%", padding: "10px 12px 10px 36px", background: "#F5F7FA", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                />
                {areaText && <button onClick={() => setAreaText("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#111111", padding: "2px" }}><X size={14} /></button>}
              </div>
              <button onClick={handleUseLocation} disabled={locating}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: userLocation ? "rgba(22,163,74,0.08)" : "#F5F7FA", border: `1px solid ${userLocation ? "rgba(22,163,74,0.3)" : "rgba(0,0,0,0.1)"}`, borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: userLocation ? "#16A34A" : "rgba(0,0,0,0.5)", opacity: locating ? 0.6 : 1 }}>
                {locating ? <Loader size={13} style={{ animation: "spin 0.7s linear infinite" }} /> : <Navigation size={13} />}
                {locating ? "取得中..." : userLocation ? "現在地を使用中" : "現在地から検索"}
              </button>
            </div>

            {/* 日程 */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#111111", letterSpacing: "0.15em", marginBottom: "8px" }}>DATE</div>
              {/* カレンダーで特定の日を選ぶ。選び直しは空欄に戻すボタンで */}
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="date"
                  value={specificDate}
                  onChange={e => setSpecificDate(e.target.value)}
                  style={{ flex: 1, padding: "10px 12px", background: specificDate ? "rgba(255,61,0,0.06)" : "#F5F7FA", border: specificDate ? "1px solid #FF3D00" : "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", color: "#111111", outline: "none", boxSizing: "border-box" }}
                />
                {specificDate && (
                  <button onClick={() => setSpecificDate("")}
                    style={{ padding: "10px 14px", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", background: "transparent", color: "rgba(0,0,0,0.5)", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>
                    クリア
                  </button>
                )}
              </div>
            </div>

            <button onClick={() => setSearchOpen(false)}
              style={{ width: "100%", padding: "14px", border: "none", borderRadius: "8px", background: "#FF3D00", color: "#fff", fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.15em", cursor: "pointer" }}>
              {postCount}件 表示する
            </button>
            {activeFilterCount > 0 && (
              <button onClick={() => { setSelectedGenres([]); setSpecificDate(""); setAreaText(""); setSearchOpen(false); }}
                style={{ width: "100%", marginTop: "10px", padding: "12px", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "8px", background: "transparent", color: "#111111", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>
                フィルターをリセット
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
