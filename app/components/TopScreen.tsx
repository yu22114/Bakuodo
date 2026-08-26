"use client";
import { useState, useEffect, useRef } from "react";
import { Bell, Search, X, SlidersHorizontal, Navigation, Loader, Plus, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { Cypher, PrivateLesson, GenreKey } from "../lib/types";
import { GENRES, GENRE_COLORS, genreLabel, timeUntil, formatDate, formatEndTime, calcDistanceM } from "../lib/constants";
import { CypherCard } from "./CypherCard";
import { PLCard } from "./PLCard";
import { SpotCard } from "./SpotCard";
import { Logo } from "./Logo";
import { showToast } from "./Toast";
import { Loading } from "./Loading";
import { useSwipeTabs } from "../lib/useSwipeTabs";

export type TopSection = "cypher" | "pl" | "event" | "spots";

// タブの並び順・色・ラベル。EVENTはレッスンと同じ仕組みで動く（DBのkind列で見分ける）
const SECTION_ORDER = ["cypher", "pl", "event", "spots"] as const;
const SECTION_COLOR: Record<TopSection, string> = {
  cypher: "#DC2626",
  pl: "#2563EB",
  event: "#EAB308",
  spots: "#16A34A",
};
const SECTION_LABEL: Record<TopSection, string> = {
  cypher: "CYPHER",
  pl: "LESSON",
  event: "EVENT",
  spots: "SPOTS",
};

// カード脇の余白の色。ジャンルではなくセクションそのものの色（SECTION_COLOR）を使い、
// 画面の上から色付きのライトで照らされているような、後光っぽいグラデーションにする。
// 実際に動かすのは .bd-glow-bg（page.tsx側のkeyframes）で、背景を広めに敷いた上で
// background-positionをゆっくりループさせている
const SECTION_BG: Record<TopSection, string> = {
  cypher: "radial-gradient(circle at center, rgba(220,38,38,0.55), rgba(220,38,38,0.1) 45%, #000000 75%)",
  pl: "radial-gradient(circle at center, rgba(37,99,235,0.55), rgba(37,99,235,0.1) 45%, #000000 75%)",
  event: "radial-gradient(circle at center, rgba(234,179,8,0.55), rgba(234,179,8,0.1) 45%, #000000 75%)",
  spots: "radial-gradient(circle at center, rgba(22,163,74,0.55), rgba(22,163,74,0.1) 45%, #000000 75%)",
};

export function TopScreen({ onNav, onCardClick, onPLClick, onViewProfile, user, refreshKey, dancerName, myAvatarUrl, unreadCount, onBell, section, onSectionChange, accountType }: {
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
  // 団体用アカウントではSPOTS機能を使わないため、タブごと隠す
  accountType?: string;
}) {
  const [slideDir, setSlideDir] = useState<1 | -1>(1);

  // 団体用アカウントの時だけSPOTS・P LESSONタブを除いた並び順を使う
  const visibleSections: readonly TopSection[] = accountType === "organization" ? SECTION_ORDER.filter(s => s !== "spots" && s !== "pl") : SECTION_ORDER;

  // 団体用に切り替えた直後など、隠れるタブを表示中のまま切り替わった場合は先頭のタブへ逃がす
  useEffect(() => {
    if (!visibleSections.includes(section)) onSectionChange(visibleSections[0]);
  }, [accountType, section]);

  const goToSection = (next: TopSection) => {
    const curIdx = visibleSections.indexOf(section);
    const nextIdx = visibleSections.indexOf(next);
    if (nextIdx === curIdx) return;
    setSlideDir(nextIdx > curIdx ? 1 : -1);
    onSectionChange(next);
  };

  // トラックパッドの2本指横スワイプはtouchではなくwheel(deltaX)で飛んでくるので別途拾う
  const wheelAccumRef = useRef(0);
  const wheelLockRef = useRef(false);
  const wheelResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSlide = (dir: 1 | -1) => {
    const nextIdx = visibleSections.indexOf(section) + dir;
    return nextIdx >= 0 && nextIdx < visibleSections.length;
  };
  const slideBy = (dir: 1 | -1) => {
    const curIdx = visibleSections.indexOf(section);
    const nextIdx = curIdx + dir;
    if (nextIdx < 0 || nextIdx >= visibleSections.length) return;
    goToSection(visibleSections[nextIdx]);
  };
  // 指の動きに追従する慣性・跳ね返り（バウンス）付きスワイプ
  const swipe = useSwipeTabs({ canSwipe: canSlide, onSwipe: slideBy });

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
  const [events, setEvents] = useState<PrivateLesson[]>([]);
  const [loading, setLoading] = useState(true);
  // 検索・フィルター
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<GenreKey[]>([]);
  // カレンダーで選んだ特定の日付（"YYYY-MM-DD"）。空文字なら未指定
  const [specificDate, setSpecificDate] = useState("");
  // ロゴを押すと月間カレンダーを開く（今日が何日かひと目で分かるように）
  const [showCalendar, setShowCalendar] = useState(false);
  // カレンダーで表示中の月。今月からのズレを月数で持つ（開くたびに0＝今月に戻す）
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);
  const [areaText, setAreaText] = useState("");
  // 現在地
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  // スポット申請フォーム（載っていない練習場所をユーザーが送る）
  const [spotForm, setSpotForm] = useState<{ name: string; location: string; note: string } | null>(null);
  const [spotSending, setSpotSending] = useState(false);
  // ロゴを押すと登録済みユーザー一覧を出す
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; dancer_name: string; avatar_url: string | null; instagram: string | null }[] | null>(null);
  const [userSearch, setUserSearch] = useState("");
  useEffect(() => {
    if (!showAllUsers) return;
    supabase.from("profiles").select("id, dancer_name, avatar_url, instagram").order("dancer_name", { ascending: true }).then(({ data }) => {
      setAllUsers((data as any[])?.map(p => ({ id: p.id, dancer_name: p.dancer_name || "UNKNOWN", avatar_url: p.avatar_url ?? null, instagram: p.instagram ?? null })) ?? []);
    });
  }, [showAllUsers]);

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
          id, title, organizer_id, starts_at, ends_at, location, description, max_members, price, target_level, visibility, requires_approval, kind,
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
          return { id: row.id, kind: (row.kind === "event" ? "event" : "lesson") as PrivateLesson["kind"], title: row.title, starts_at: row.starts_at, ends_at: row.ends_at ?? null, location: row.location, description: row.description ?? "", max_members: row.max_members, price: row.price ?? null, target_level: row.target_level ?? "all", visibility: row.visibility ?? "public", requires_approval: row.requires_approval ?? false, genres, organizer: { id: row.organizer_id, dancer_name: name, avatar: name[0]?.toUpperCase() ?? "?", avatar_url: row.profiles?.avatar_url ?? null, instagram: row.profiles?.instagram ?? null }, participant_count: plCountMap[row.id] ?? 0 };
        }).filter((l: PrivateLesson) => l.visibility === "public" || l.organizer.id === user.id || followingIds.has(l.organizer.id));
        // 同じテーブルから取ったものをkindで2つのタブに振り分ける
        setLessons(shapedPL.filter(l => l.kind === "lesson"));
        setEvents(shapedPL.filter(l => l.kind === "event"));
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

  // レッスン・イベント側もサイファーと同じ条件で絞り込む（ジャンル/日付/エリア）
  const matchPL = (l: PrivateLesson) => {
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
  };
  const filteredLessons = lessons.filter(matchPL);
  const filteredEvents = events.filter(matchPL);

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

  // スポット申請の送信。運営がSupabaseで中身を見てspotsに追加する運用
  const handleSubmitSpot = async () => {
    if (!spotForm || !spotForm.name.trim() || !spotForm.location.trim()) return;
    setSpotSending(true);
    const { error } = await supabase.from("spot_requests").insert({
      profile_id: user.id,
      name: spotForm.name.trim().slice(0, 100),
      location: spotForm.location.trim().slice(0, 200),
      note: spotForm.note.trim().slice(0, 500) || null,
    });
    setSpotSending(false);
    if (error) { showToast("送信に失敗しました。時間をおいて試してください"); return; }
    setSpotForm(null);
    showToast("スポットを申請しました！確認までしばらくお待ちください");
  };

  // スポットを距離順にソート
  const sortedSpots = userLocation
    ? [...spots].sort((a, b) => {
        const dA = (a.latitude && a.longitude) ? calcDistanceM(userLocation.lat, userLocation.lng, a.latitude, a.longitude) : Infinity;
        const dB = (b.latitude && b.longitude) ? calcDistanceM(userLocation.lat, userLocation.lng, b.latitude, b.longitude) : Infinity;
        return dA - dB;
      })
    : spots;
  const postCount = section === "pl" ? filteredLessons.length : section === "event" ? filteredEvents.length : filtered.length;

  // ヘッダー左上に出す今日の日付。ロゴだけだと寂しいので添える
  const today = new Date();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const todayLabel = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}(${weekdays[today.getDay()]})`;

  // ロゴを押した時に出す月間カレンダー用のマス目。月初の曜日ぶんだけ空マスを前に詰める
  // calendarMonthOffsetぶん今月からずらした月を表示する（前月・次月ボタンで変わる）
  const calendarViewDate = new Date(today.getFullYear(), today.getMonth() + calendarMonthOffset, 1);
  const firstWeekday = calendarViewDate.getDay();
  const daysInMonth = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0).getDate();
  const calendarCells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    // 画面全体をビューポート高さで固定し、下の「固定ヘッダー＋スクロール領域」に分ける。
    // 浮き島の下部ナビは position:fixed で別レイヤーなのでここでは特に気にしなくていい
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
    {/* ヘッダー〜タブ〜ジャンルチップはスクロールしない固定エリア */}
    <div style={{ flexShrink: 0 }}>
      {/* ヘッダー */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
          {/* 今日の日付は常に出しておく。左のカレンダーアイコンを押すと月間カレンダーが開く */}
          <button onClick={() => { setCalendarMonthOffset(0); setShowCalendar(true); }} aria-label="カレンダーを表示"
            style={{ justifySelf: "start", background: "none", border: "none", padding: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={18} color="rgba(255,255,255,0.5)" />
            <span style={{ fontSize: "16px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.02em" }}>{todayLabel}</span>
          </button>
          {/* ロゴを押すと登録済みユーザーが全員出てくる */}
          <h1 style={{ margin: 0, lineHeight: 0, textAlign: "center", animation: "bdLogoRollIn 1.8s cubic-bezier(0.33,1,0.68,1) both" }}>
            <button onClick={() => { setUserSearch(""); setShowAllUsers(true); }} aria-label="全ユーザーを表示"
              style={{ background: "none", border: "none", padding: 0, lineHeight: 0, cursor: "pointer" }}>
              <Logo size={52} />
            </button>
          </h1>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
            {/* 検索ボタン */}
            <button onClick={() => setSearchOpen(true)} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "6px" }}>
              <Search size={22} color={activeFilterCount > 0 ? "#DC2626" : "rgba(255,255,255,0.5)"} />
              {activeFilterCount > 0 && (
                <span style={{ position: "absolute", top: "2px", right: "2px", background: "#DC2626", color: "#fff", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", minWidth: "16px", height: "16px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", transform: "translate(4px,-4px)", lineHeight: 1 }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button onClick={onBell} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "6px" }}>
              <Bell size={22} color="rgba(255,255,255,0.5)" />
              {unreadCount > 0 && (
                <span style={{ position: "absolute", top: "2px", right: "2px", background: "#DC2626", color: "#fff", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", minWidth: "16px", height: "16px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", transform: "translate(4px,-4px)", lineHeight: 1 }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* セクション切り替え：四角い下線タブから、丸い枠の中で選択中だけ浮くセグメント風に */}
      <div style={{ padding: "10px 16px", background: "#0D0D0D", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", gap: "4px", background: "#1A1A1A", borderRadius: "14px", padding: "4px" }}>
          {visibleSections.map(key => { const label = SECTION_LABEL[key]; const color = SECTION_COLOR[key]; return (
            <button key={key} onClick={() => goToSection(key)}
              style={{ flex: 1, padding: "9px 4px", border: "none", borderRadius: "10px", background: section === key ? "#2A2A2A" : "transparent", boxShadow: section === key ? "0 1px 4px rgba(255,255,255,0.08)" : "none", color: section === key ? color : "rgba(255,255,255,0.55)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", fontWeight: section === key ? "bold" : "normal", letterSpacing: "0.06em", transition: "all 0.15s" }}>
              {/* 選んでいるタブだけ、文字を1つずつ左から順に上下させてウェーブっぽく見せる。
                  タブを選んだ時に1回だけ流れる（選び直すまで繰り返さない） */}
              {section === key
                ? [...label].map((ch, i) => (
                    // inline-blockだと半角スペースが潰れて単語がくっつくので&nbsp;に置き換える
                    <span key={i} style={{ display: "inline-block", animation: `bdLetterWave 1.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.125}s 1` }}>{ch === " " ? "\u00A0" : ch}</span>
                  ))
                : label}
            </button>
          ); })}
        </div>
      </div>

      {/* ジャンルチップ（横スクロール）。CYPHER/LESSON共通 */}
      {section !== "spots" && (
        <div style={{ display: "flex", gap: "6px", padding: "10px 16px", overflowX: "auto", scrollbarWidth: "none", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D" }}>
          {(["ALL", ...GENRES] as (GenreKey | "ALL")[]).map(g => {
            const sel = g === "ALL" ? selectedGenres.length === 0 : selectedGenres.includes(g as GenreKey);
            // ALLは「絞り込みなし」であって特定のジャンル/セクションではないので、
            // CYPHERタブと同じ色を使わず中立な色にする
            const col = g === "ALL" ? "#F0F0F0" : GENRE_COLORS[g as GenreKey];
            return (
              <button key={g} onClick={() => setSelectedGenres(prev => g === "ALL" ? [] : prev.includes(g as GenreKey) ? prev.filter(x => x !== g) : [...prev, g as GenreKey])}
                style={{ flexShrink: 0, padding: "5px 12px", border: sel ? `1px solid ${col}` : "1px solid rgba(255,255,255,0.14)", borderRadius: "20px", background: sel ? `${col}18` : "transparent", color: sel ? col : "rgba(255,255,255,0.55)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", fontWeight: sel ? "bold" : "normal" }}>
                {genreLabel(g)}
              </button>
            );
          })}
        </div>
      )}

      {/* 件数の表示はやめて、リストに使える高さを増やした。
          この行は絞り込み中だけ出る（解除ボタンの置き場所として残している） */}
      {section !== "spots" && activeFilterCount > 0 && (() => {
        const accent = SECTION_COLOR[section];
        return (
          <div style={{ display: "flex", padding: "4px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D0D0D", alignItems: "center" }}>
            <button onClick={() => { setSelectedGenres([]); setSpecificDate(""); setAreaText(""); }}
              style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px", background: `${accent}14`, border: `1px solid ${accent}33`, borderRadius: "12px", padding: "2px 8px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: accent, cursor: "pointer" }}>
              <X size={9} /> フィルター解除
            </button>
          </div>
        );
      })()}
    </div>

    {/* スクロールするのはここだけ。固定ヘッダーの残り高さ分だけ使う。
        カード脇の余白の色でセクションを見分けられるようにする（各タブの色の薄いやつ）。
        リストではなくこの器に色を敷くので、カードが少なくても下まで色が続く */}
    <div className="bd-scroll bd-glow-bg" onTouchStart={swipe.onTouchStart} onTouchMove={swipe.onTouchMove} onTouchEnd={swipe.onTouchEnd} onWheel={handleContentWheel}
      style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" as any, background: SECTION_BG[section], transition: "background 0.2s" }}>
      {/* 指の動きに追従する横スワイプ（慣性・跳ね返り）はこのラッパーが担当し、
          タブが切り替わった後の「その場で現れる」演出は内側のkey={section}が担当する */}
      <div style={swipe.style}>
      <div key={section} style={{ animation: `${slideDir === 1 ? "bdSlideFromRight" : "bdSlideFromLeft"} 0.2s ease-out` }}>
      {section === "spots" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px 16px" }}>
          {sortedSpots.length === 0
            ? <div style={{ textAlign: "center", padding: "40px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>スポット情報はまだありません</div>
            : sortedSpots.map(s => <SpotCard key={s.id} spot={s} user={user} userLocation={userLocation} onViewProfile={id => onViewProfile?.(id)} />)}
          {/* 載っていない練習場所をユーザーから教えてもらう窓口 */}
          <button onClick={() => setSpotForm({ name: "", location: "", note: "" })}
            style={{ padding: "14px", background: "transparent", border: "1px dashed rgba(22,163,74,0.5)", borderRadius: "10px", color: "#16A34A", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <Plus size={14} /> このリストにない場所を申請する
          </button>
        </div>
      ) : section === "pl" || section === "event" ? (() => {
        // レッスンとイベントはカードも絞り込みも同じ。出すデータと文言だけ切り替える
        const all = section === "pl" ? lessons : events;
        const shown = section === "pl" ? filteredLessons : filteredEvents;
        const noun = section === "pl" ? "プライベートレッスン" : "イベント";
        return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 16px" }}>
          {loading && all.length === 0
            ? <Loading />
            : !loading && all.length === 0
              ? <div style={{ textAlign: "center", padding: "40px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>まだ{noun}がありません</div>
              : !loading && shown.length === 0
                ? <div style={{ textAlign: "center", padding: "40px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>条件に合う{noun}がありません</div>
                : shown.map((l, i) => <PLCard key={l.id} lesson={l} index={i} onClick={() => onPLClick(l)} />)}
        </div>
        );
      })() : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 16px" }}>
          {/* 再フェッチ中は既存リストを出したままにする（全画面LOADINGのちらつき防止） */}
          {loading && cyphers.length === 0
            ? <Loading />
            : !loading && filtered.length === 0
              ? <div style={{ textAlign: "center", padding: "40px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>条件に合うサイファーがありません</div>
              : filtered.map((c, i) => <CypherCard key={c.id} cypher={c} index={i} onClick={() => onCardClick(c)} />)}
        </div>
      )}
      {/* 浮き島の下部ナビに隠れないための余白 */}
      <div style={{ height: "80px" }} />
      </div>
      </div>
    </div>

    {/* スポット申請フォーム */}
      {spotForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }} onClick={() => setSpotForm(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", margin: "0 auto", background: "#141414", borderRadius: "16px 16px 0 0", padding: "24px 20px 40px", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <span style={{ fontSize: "18px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", letterSpacing: "0.05em" }}>スポットを申請する</span>
              <button onClick={() => setSpotForm(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={20} /></button>
            </div>
            <div style={{ fontSize: "11px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", lineHeight: 1.6, marginBottom: "16px" }}>
              いつも踊っている場所を教えてください。運営が確認してからリストに追加します。
            </div>
            {([["name", "場所の名前", "例: 渋谷ハチ公前広場"], ["location", "住所・最寄り駅", "例: 渋谷区道玄坂 / 渋谷駅"], ["note", "補足（任意）", "例: 21時以降は静か。鏡あり"]] as const).map(([key, label, ph]) => (
              <div key={key} style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em", marginBottom: "6px" }}>{label}</div>
                <input value={spotForm[key]} onChange={e => setSpotForm(f => f && ({ ...f, [key]: e.target.value }))} placeholder={ph}
                  style={{ width: "100%", padding: "10px 12px", background: "#1A1A1A", color: "#F0F0F0", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <button onClick={handleSubmitSpot} disabled={spotSending || !spotForm.name.trim() || !spotForm.location.trim()}
              style={{ width: "100%", padding: "14px", border: "none", borderRadius: "8px", background: spotForm.name.trim() && spotForm.location.trim() ? "#16A34A" : "rgba(255,255,255,0.08)", color: spotForm.name.trim() && spotForm.location.trim() ? "#fff" : "rgba(255,255,255,0.3)", fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.15em", cursor: "pointer", opacity: spotSending ? 0.6 : 1 }}>
              {spotSending ? "送信中..." : "申請する"}
            </button>
          </div>
        </div>
      )}

    {/* 検索ドロワー */}
      {searchOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }} onClick={() => setSearchOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", margin: "0 auto", background: "#141414", borderRadius: "16px 16px 0 0", padding: "24px 20px 40px", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <SlidersHorizontal size={18} color="#F0F0F0" />
                <span style={{ fontSize: "18px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", letterSpacing: "0.05em" }}>{section === "pl" ? "プライベートレッスンを検索" : section === "event" ? "イベントを検索" : "サイファーを検索"}</span>
              </div>
              <button onClick={() => setSearchOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={20} /></button>
            </div>

            {/* エリア */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em", marginBottom: "8px" }}>AREA</div>
              <div style={{ position: "relative", marginBottom: "8px" }}>
                <Search size={14} color="rgba(255,255,255,0.35)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={areaText}
                  onChange={e => setAreaText(e.target.value)}
                  placeholder="例: 新宿、渋谷、横浜（部分一致）"
                  style={{ width: "100%", padding: "10px 12px 10px 36px", background: "#1A1A1A", color: "#F0F0F0", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                />
                {areaText && <button onClick={() => setAreaText("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "2px" }}><X size={14} /></button>}
              </div>
              <button onClick={handleUseLocation} disabled={locating}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: userLocation ? "rgba(22,163,74,0.08)" : "#1A1A1A", border: `1px solid ${userLocation ? "rgba(22,163,74,0.3)" : "rgba(255,255,255,0.12)"}`, borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", color: userLocation ? "#16A34A" : "rgba(255,255,255,0.55)", opacity: locating ? 0.6 : 1 }}>
                {locating ? <Loader size={13} style={{ animation: "spin 0.7s linear infinite" }} /> : <Navigation size={13} />}
                {locating ? "取得中..." : userLocation ? "現在地を使用中" : "現在地から検索"}
              </button>
            </div>

            {/* 日程 */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em", marginBottom: "8px" }}>DATE</div>
              {/* カレンダーで特定の日を選ぶ。選び直しは空欄に戻すボタンで */}
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="date"
                  value={specificDate}
                  onChange={e => setSpecificDate(e.target.value)}
                  style={{ flex: 1, padding: "10px 12px", background: specificDate ? "rgba(220,38,38,0.1)" : "#1A1A1A", border: specificDate ? "1px solid #DC2626" : "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", color: "#F0F0F0", colorScheme: "dark", outline: "none", boxSizing: "border-box" }}
                />
                {specificDate && (
                  <button onClick={() => setSpecificDate("")}
                    style={{ padding: "10px 14px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", background: "transparent", color: "rgba(255,255,255,0.55)", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>
                    クリア
                  </button>
                )}
              </div>
            </div>

            <button onClick={() => setSearchOpen(false)}
              style={{ width: "100%", padding: "14px", border: "none", borderRadius: "8px", background: "#DC2626", color: "#fff", fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.15em", cursor: "pointer" }}>
              {postCount}件 表示する
            </button>
            {activeFilterCount > 0 && (
              <button onClick={() => { setSelectedGenres([]); setSpecificDate(""); setAreaText(""); setSearchOpen(false); }}
                style={{ width: "100%", marginTop: "10px", padding: "12px", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "8px", background: "transparent", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>
                フィルターをリセット
              </button>
            )}
          </div>
        </div>
      )}

    {/* ロゴを押すと開く月間カレンダー。今日が何日かを一目で確認するだけのもの */}
      {showCalendar && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }} onClick={() => setShowCalendar(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", margin: "0 auto", background: "#141414", borderRadius: "16px 16px 0 0", padding: "24px 20px 40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button onClick={() => setCalendarMonthOffset(o => o - 1)} aria-label="前の月" style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><ChevronLeft size={20} /></button>
                <span style={{ fontSize: "18px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", letterSpacing: "0.05em" }}>{calendarViewDate.getFullYear()}年{calendarViewDate.getMonth() + 1}月</span>
                <button onClick={() => setCalendarMonthOffset(o => o + 1)} aria-label="次の月" style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><ChevronRight size={20} /></button>
              </div>
              <button onClick={() => setShowCalendar(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={20} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: "4px" }}>
              {weekdays.map(w => (
                <div key={w} style={{ textAlign: "center", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.45)", padding: "6px 0" }}>{w}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "4px" }}>
              {calendarCells.map((d, i) => {
                const isToday = calendarMonthOffset === 0 && d === today.getDate();
                return (
                  <div key={i} style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: isToday ? "#DC2626" : "transparent", color: d === null ? "transparent" : isToday ? "#fff" : "#F0F0F0", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: isToday ? 700 : 400 }}>
                    {d ?? "-"}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ロゴから開く、登録済みユーザーの全員一覧。左右・下は画面端から離して浮かせ、
          カード面はホーム画面のカードと同じメタリック調のグラデーションにする */}
      {showAllUsers && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }} onClick={() => setShowAllUsers(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "448px", margin: "0 auto", padding: "0 16px 16px", boxSizing: "border-box" }}>
          <div style={{ background: "linear-gradient(150deg, #2c2c2c 0%, #1a1a1a 25%, #242424 48%, #161616 70%, #282828 100%)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "16px", padding: "24px 20px", maxHeight: "75vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexShrink: 0 }}>
              <span style={{ fontSize: "18px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", letterSpacing: "0.05em" }}>全ユーザー{allUsers ? `（${allUsers.length}人）` : ""}</span>
              <button onClick={() => setShowAllUsers(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "4px" }}><X size={20} /></button>
            </div>
            {/* 名前で検索 */}
            <div style={{ position: "relative", marginBottom: "14px", flexShrink: 0 }}>
              <Search size={14} color="rgba(255,255,255,0.35)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="名前で検索"
                style={{ width: "100%", padding: "10px 12px 10px 36px", background: "#1A1A1A", color: "#F0F0F0", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
              />
              {userSearch && <button onClick={() => setUserSearch("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#F0F0F0", padding: "2px" }}><X size={14} /></button>}
            </div>
            <div className="bd-scroll" style={{ overflowY: "auto" }}>
              {allUsers === null ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "rgba(255,255,255,0.4)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>読み込み中...</div>
              ) : allUsers.filter(u => u.dancer_name.toLowerCase().includes(userSearch.trim().toLowerCase())).length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "rgba(255,255,255,0.4)", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px" }}>{userSearch.trim() ? "該当するユーザーがいません" : "ユーザーがいません"}</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {allUsers.filter(u => u.dancer_name.toLowerCase().includes(userSearch.trim().toLowerCase())).map(u => (
                    <button key={u.id} onClick={() => { setShowAllUsers(false); onViewProfile?.(u.id); }}
                      style={{ background: "none", border: "none", cursor: onViewProfile ? "pointer" : "default", padding: "8px 4px", display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", flexShrink: 0 }}>
                        {u.avatar_url ? <img src={u.avatar_url} alt={u.dancer_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : u.dancer_name[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0" }}>{u.dancer_name}</span>
                        {u.instagram && <span style={{ fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "#A855F7" }}>@{u.instagram}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
