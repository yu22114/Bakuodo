"use client";
import { useState, useEffect } from "react";
import { MapPin, Clock, Users, Zap, Plus, User, Check, X, Star, Radio, Flame, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type GenreKey = "Breaking" | "Popping" | "Locking" | "Waacking" | "House" | "Krump" | "Hip-Hop";

interface Cypher {
  id: string; title: string; starts_at: string; location: string;
  genres: GenreKey[]; organizer: { id: string; dancer_name: string; avatar: string };
  participant_count: number; max_members: number | null;
  status: string; description: string; hot: boolean;
}
interface FormState {
  title: string; date: string; start_time: string; end_time: string;
  location: string; genres: GenreKey[]; description: string;
  max_members: string; payment: string;
}
interface ProfileState {
  dancer_name: string; genres: GenreKey[];
  instagram: string; dance_years: string; age_group: string; gender: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
// Voguingを削除
const GENRES: GenreKey[] = ["Breaking","Popping","Locking","Waacking","House","Krump","Hip-Hop"];
// 白背景でも見やすい色に調整
const GENRE_COLORS: Record<GenreKey, string> = {
  Breaking:"#FF3D00", Popping:"#0891B2", Locking:"#D97706",
  Waacking:"#A855F7", House:"#16A34A", Krump:"#EA580C", "Hip-Hop":"#2563EB",
};

// 30分刻みの時間選択肢を生成
const TIME_OPTIONS = Array.from({length: 48}, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2,"0")}:${m}`;
});

// ─── UTILS ────────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  const d = new Date(iso);
  const weekdays = ["日","月","火","水","木","金","土"];
  return {
    date: `${d.getMonth()+1}/${d.getDate()}(${weekdays[d.getDay()]})`,
    time: `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`,
  };
}

// 開催日を過ぎていたら「終了」を返す
function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - new Date().getTime();
  if (diff < 0) return "終了";
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}日後`;
  if (h > 0) return `${h}時間後`;
  return "まもなく";
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: typeof window !== "undefined" ? window.location.origin : "" },
    });
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px", background:"#FFFFFF" }}>
      <div style={{ marginBottom:"48px", textAlign:"center" }}>
        <h1 style={{ margin:0, fontSize:"72px", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.1em", background:"linear-gradient(135deg,#FF3D00,#FF6D00,#D97706)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", lineHeight:1 }}>爆踊</h1>
        <p style={{ margin:"8px 0 0", fontSize:"12px", color:"rgba(0,0,0,0.4)", fontFamily:"'Space Mono',monospace", letterSpacing:"0.1em" }}>今日、ここで、踊ろう。</p>
      </div>
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        style={{ display:"flex", alignItems:"center", gap:"12px", padding:"14px 24px", background:"#FFFFFF", border:"1px solid rgba(0,0,0,0.15)", borderRadius:"6px", cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1, fontSize:"14px", fontFamily:"'Space Mono',monospace", fontWeight:"bold", color:"#111111", width:"100%", maxWidth:"320px", justifyContent:"center", transition:"all 0.2s", boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
          <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
          <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
          <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
        </svg>
        {loading ? "ログイン中..." : "Googleでログイン"}
      </button>
      <p style={{ marginTop:"24px", fontSize:"10px", color:"rgba(0,0,0,0.3)", fontFamily:"'Space Mono',monospace", textAlign:"center", lineHeight:1.8 }}>
        ログインすることで利用規約に<br/>同意したものとみなします
      </p>
    </div>
  );
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function GenreBadge({ genre, size = "sm" }: { genre: GenreKey; size?: "sm" | "md" }) {
  const color = GENRE_COLORS[genre];
  return (
    <span style={{ border:`1px solid ${color}`, color, fontSize:size==="sm"?"10px":"12px", padding:size==="sm"?"2px 8px":"4px 12px", borderRadius:"3px", fontFamily:"'Space Mono',monospace", letterSpacing:"0.05em", textTransform:"uppercase", whiteSpace:"nowrap", background:`${color}12` }}>
      {genre}
    </span>
  );
}

function ParticipantBar({ count, max }: { count: number; max: number | null }) {
  const pct = max ? Math.min((count / max) * 100, 100) : 50;
  const color = pct > 80 ? "#FF3D00" : pct > 50 ? "#D97706" : "#16A34A";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
      <div style={{ flex:1, height:"4px", background:"rgba(0,0,0,0.08)", borderRadius:"2px", overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color }} />
      </div>
      <span style={{ fontSize:"11px", color, fontFamily:"'Space Mono',monospace", minWidth:"60px", textAlign:"right", fontWeight:"bold" }}>
        {count}{max ? `/${max}` : ""} 人
      </span>
    </div>
  );
}

// キャンセル確認モーダル
function ConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#FFFFFF", borderRadius:"12px", padding:"28px 24px", maxWidth:"300px", width:"100%", boxShadow:"0 8px 32px rgba(0,0,0,0.15)" }}>
        <p style={{ margin:"0 0 8px", fontSize:"18px", fontFamily:"'Bebas Neue',sans-serif", color:"#111111", letterSpacing:"0.05em" }}>キャンセルしますか？</p>
        <p style={{ margin:"0 0 24px", fontSize:"12px", color:"rgba(0,0,0,0.5)", fontFamily:"'Space Mono',monospace", lineHeight:1.7 }}>参加をキャンセルします。<br/>本当によろしいですか？</p>
        <div style={{ display:"flex", gap:"10px" }}>
          <button onClick={onCancel} style={{ flex:1, padding:"11px", border:"1px solid rgba(0,0,0,0.15)", borderRadius:"6px", background:"transparent", color:"rgba(0,0,0,0.6)", fontSize:"12px", fontFamily:"'Space Mono',monospace", cursor:"pointer" }}>戻る</button>
          <button onClick={onConfirm} style={{ flex:1, padding:"11px", border:"none", borderRadius:"6px", background:"#FF3D00", color:"#fff", fontSize:"12px", fontFamily:"'Space Mono',monospace", cursor:"pointer", fontWeight:"bold" }}>キャンセルする</button>
        </div>
      </div>
    </div>
  );
}

// カードにはJOIN不可、クリックで詳細モーダルを開くのみ
function CypherCard({ cypher, onClick }: { cypher: Cypher; onClick: () => void }) {
  const { date, time } = formatDate(cypher.starts_at);
  const until = timeUntil(cypher.starts_at);
  const [hover, setHover] = useState(false);
  const color = GENRE_COLORS[cypher.genres[0]] ?? "#FF3D00";
  const isEnded = until === "終了";
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background:"#FFFFFF", border:`1px solid ${cypher.hot && !isEnded ? "rgba(255,61,0,0.25)" : "rgba(0,0,0,0.08)"}`, borderRadius:"8px", padding:"16px", cursor:"pointer", transition:"all 0.2s ease", transform:hover?"translateY(-1px)":"none", position:"relative", overflow:"hidden", boxShadow:hover?"0 4px 16px rgba(0,0,0,0.08)":"0 1px 4px rgba(0,0,0,0.04)", opacity:isEnded?0.55:1 }}>
      {cypher.hot && !isEnded && <div style={{ position:"absolute", top:0, right:0, background:"#FF3D00", padding:"3px 10px", fontSize:"9px", fontFamily:"'Space Mono',monospace", color:"#fff", fontWeight:"bold", borderBottomLeftRadius:"4px" }}>🔥 HOT</div>}
      {isEnded && <div style={{ position:"absolute", top:0, right:0, background:"rgba(0,0,0,0.1)", padding:"3px 10px", fontSize:"9px", fontFamily:"'Space Mono',monospace", color:"rgba(0,0,0,0.45)", fontWeight:"bold", borderBottomLeftRadius:"4px" }}>終了</div>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px" }}>
        <div style={{ flex:1, paddingRight:"44px" }}>
          <h3 style={{ margin:0, fontSize:"15px", fontWeight:700, color:"#111111", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em", lineHeight:1.2 }}>{cypher.title}</h3>
          <div style={{ fontSize:"10px", color:"rgba(0,0,0,0.4)", marginTop:"2px", fontFamily:"'Space Mono',monospace" }}>by {cypher.organizer.dancer_name}</div>
        </div>
        <div style={{ width:"36px", height:"36px", borderRadius:"4px", background:`linear-gradient(135deg,${color}22,${color}44)`, border:`1px solid ${color}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", fontWeight:"bold", color, fontFamily:"'Bebas Neue',sans-serif", flexShrink:0 }}>
          {cypher.organizer.avatar}
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:"5px", marginBottom:"12px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          <Clock size={11} color="rgba(0,0,0,0.35)" />
          <span style={{ fontSize:"11px", color:"rgba(0,0,0,0.6)", fontFamily:"'Space Mono',monospace" }}>{date} {time}</span>
          <span style={{ fontSize:"9px", padding:"1px 6px", background:isEnded?"rgba(0,0,0,0.06)":"rgba(255,61,0,0.08)", borderRadius:"3px", color:isEnded?"rgba(0,0,0,0.4)":"#FF3D00", fontFamily:"'Space Mono',monospace", fontWeight:"bold" }}>{until}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          <MapPin size={11} color="rgba(0,0,0,0.35)" />
          <span style={{ fontSize:"11px", color:"rgba(0,0,0,0.6)", fontFamily:"'Space Mono',monospace" }}>{cypher.location}</span>
        </div>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:"5px", marginBottom:"12px" }}>
        {cypher.genres.map(g => <GenreBadge key={g} genre={g} />)}
      </div>
      <ParticipantBar count={cypher.participant_count} max={cypher.max_members} />
    </div>
  );
}

// 参加者プロフィールの型
interface ParticipantProfile {
  profile_id: string;
  dancer_name: string;
  genres: GenreKey[];
  instagram: string | null;
  dance_years: number | null;
  age_group: string | null;
  gender: string | null;
}

// 参加者プロフィールを表示するミニシート
function ParticipantSheet({ participant, onClose }: { participant: ParticipantProfile; onClose: () => void }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#FFFFFF", borderRadius:"12px", padding:"24px", maxWidth:"300px", width:"100%", boxShadow:"0 8px 32px rgba(0,0,0,0.15)" }}>
        {/* アバター */}
        <div style={{ display:"flex", alignItems:"center", gap:"14px", marginBottom:"16px" }}>
          <div style={{ width:"52px", height:"52px", borderRadius:"50%", background:"linear-gradient(135deg,#FF3D00,#FF6D00)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", fontFamily:"'Bebas Neue',sans-serif", color:"#fff", flexShrink:0 }}>
            {participant.dancer_name[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <div style={{ fontSize:"18px", fontFamily:"'Bebas Neue',sans-serif", color:"#111111", letterSpacing:"0.05em" }}>{participant.dancer_name || "UNKNOWN"}</div>
            {participant.instagram && <div style={{ fontSize:"11px", color:"#A855F7", fontFamily:"'Space Mono',monospace" }}>@{participant.instagram}</div>}
          </div>
        </div>
        {/* 詳細情報 */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginBottom:"16px" }}>
          {participant.age_group && <span style={{ fontSize:"11px", padding:"3px 8px", background:"rgba(0,0,0,0.05)", borderRadius:"4px", color:"rgba(0,0,0,0.6)", fontFamily:"'Space Mono',monospace" }}>{participant.age_group}</span>}
          {participant.dance_years != null && <span style={{ fontSize:"11px", padding:"3px 8px", background:"rgba(0,0,0,0.05)", borderRadius:"4px", color:"rgba(0,0,0,0.6)", fontFamily:"'Space Mono',monospace" }}>歴{participant.dance_years}年</span>}
          {participant.gender && <span style={{ fontSize:"11px", padding:"3px 8px", background:"rgba(0,0,0,0.05)", borderRadius:"4px", color:"rgba(0,0,0,0.6)", fontFamily:"'Space Mono',monospace" }}>{participant.gender}</span>}
        </div>
        {participant.genres?.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:"5px", marginBottom:"16px" }}>
            {participant.genres.map(g => <GenreBadge key={g} genre={g} />)}
          </div>
        )}
        <button onClick={onClose} style={{ width:"100%", padding:"10px", border:"1px solid rgba(0,0,0,0.12)", borderRadius:"6px", background:"transparent", color:"rgba(0,0,0,0.5)", fontSize:"12px", fontFamily:"'Space Mono',monospace", cursor:"pointer" }}>閉じる</button>
      </div>
    </div>
  );
}

function DetailModal({ cypher, onClose, joined, onJoin }: { cypher: Cypher | null; onClose: () => void; joined: boolean; onJoin: (id: string) => void }) {
  if (!cypher) return null;
  const { date, time } = formatDate(cypher.starts_at);
  const isEnded = timeUntil(cypher.starts_at) === "終了";
  const [participants, setParticipants] = useState<ParticipantProfile[]>([]);
  const [participantsFetched, setParticipantsFetched] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantProfile | null>(null);
  // 主催者プロフィール：取得失敗時はcypherの情報で初期化しておく
  const [organizerProfile, setOrganizerProfile] = useState<ParticipantProfile>({
    profile_id: cypher.organizer.id,
    dancer_name: cypher.organizer.dancer_name,
    genres: [],
    instagram: null,
    dance_years: null,
    age_group: null,
    gender: null,
  });

  // 参加者一覧をDBから取得（joined変化時にも再取得）
  useEffect(() => {
    async function fetchParticipants() {
      const { data } = await supabase
        .from("participations")
        .select("profile_id, profiles:profile_id ( dancer_name, genres, instagram, dance_years, age_group, gender )")
        .eq("cypher_id", cypher.id);
      if (data) {
        setParticipants(data.map((row: any) => ({
          profile_id: row.profile_id,
          dancer_name: row.profiles?.dancer_name ?? "UNKNOWN",
          genres: (row.profiles?.genres ?? []) as GenreKey[],
          instagram: row.profiles?.instagram ?? null,
          dance_years: row.profiles?.dance_years ?? null,
          age_group: row.profiles?.age_group ?? null,
          gender: row.profiles?.gender ?? null,
        })));
        setParticipantsFetched(true);
      }
    }
    fetchParticipants();
  }, [cypher.id, joined]);

  // 主催者のプロフィールをDBから取得（追加情報があれば上書き）
  useEffect(() => {
    async function fetchOrganizer() {
      const { data } = await supabase
        .from("profiles")
        .select("dancer_name, genres, instagram, dance_years, age_group, gender")
        .eq("id", cypher.organizer.id)
        .single();
      if (data) {
        setOrganizerProfile({
          profile_id: cypher.organizer.id,
          dancer_name: data.dancer_name ?? cypher.organizer.dancer_name,
          genres: (data.genres ?? []) as GenreKey[],
          instagram: data.instagram ?? null,
          dance_years: data.dance_years ?? null,
          age_group: data.age_group ?? null,
          gender: data.gender ?? null,
        });
      }
    }
    fetchOrganizer();
  }, [cypher.organizer.id]);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.4)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:"480px", margin:"0 auto", background:"#FFFFFF", border:"1px solid rgba(0,0,0,0.08)", borderBottom:"none", borderRadius:"12px 12px 0 0", padding:"24px 20px 40px", boxShadow:"0 -4px 24px rgba(0,0,0,0.1)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px" }}>
          <h2 style={{ margin:0, fontSize:"24px", fontFamily:"'Bebas Neue',sans-serif", color:"#111111", lineHeight:1.1, flex:1 }}>{cypher.title}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(0,0,0,0.4)", cursor:"pointer", padding:"4px", marginLeft:"12px" }}><X size={20} /></button>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginBottom:"16px" }}>
          {cypher.genres.map(g => <GenreBadge key={g} genre={g} size="md" />)}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"16px" }}>
          <div style={{ display:"flex", gap:"10px", fontSize:"13px", color:"rgba(0,0,0,0.65)", fontFamily:"'Space Mono',monospace", alignItems:"center" }}><Clock size={14} color="rgba(0,0,0,0.4)" /> {date} {time}</div>
          <div style={{ display:"flex", gap:"10px", fontSize:"13px", color:"rgba(0,0,0,0.65)", fontFamily:"'Space Mono',monospace", alignItems:"center" }}><MapPin size={14} color="rgba(0,0,0,0.4)" /> {cypher.location}</div>
          {/* 主催者名クリックでプロフィール表示 */}
          <button onClick={() => organizerProfile && setSelectedParticipant(organizerProfile)}
            style={{ display:"flex", gap:"10px", fontSize:"13px", color:"rgba(0,0,0,0.65)", fontFamily:"'Space Mono',monospace", alignItems:"center", background:"none", border:"none", cursor:organizerProfile?"pointer":"default", padding:0, textAlign:"left", textDecoration:organizerProfile?"underline dotted":"none", textUnderlineOffset:"3px" }}>
            <User size={14} color="rgba(0,0,0,0.4)" /> 主催: {cypher.organizer.dancer_name}
          </button>
        </div>
        {cypher.description && <p style={{ fontSize:"13px", color:"rgba(0,0,0,0.55)", lineHeight:1.7, marginBottom:"20px", fontFamily:"'Space Mono',monospace" }}>{cypher.description}</p>}
        {/* DB取得後は参加者リストの実数を表示、取得前はcypherの値を使う */}
        <ParticipantBar count={participantsFetched ? participants.length : cypher.participant_count} max={cypher.max_members} />

        {/* 参加者アイコン一覧 */}
        {participants.length > 0 && (
          <div style={{ marginTop:"16px" }}>
            <div style={{ fontSize:"9px", fontFamily:"'Space Mono',monospace", color:"rgba(0,0,0,0.35)", letterSpacing:"0.15em", marginBottom:"8px" }}>PARTICIPANTS</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
              {participants.map(p => (
                <button key={p.profile_id} onClick={() => setSelectedParticipant(p)}
                  style={{ width:"40px", height:"40px", borderRadius:"50%", background:"linear-gradient(135deg,#FF3D00,#FF6D00)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", fontFamily:"'Bebas Neue',sans-serif", color:"#fff", flexShrink:0 }}
                  title={p.dancer_name}>
                  {p.dancer_name[0]?.toUpperCase() ?? "?"}
                </button>
              ))}
            </div>
          </div>
        )}

        {isEnded ? (
          <div style={{ marginTop:"20px", padding:"14px", background:"rgba(0,0,0,0.04)", borderRadius:"6px", textAlign:"center", fontSize:"13px", color:"rgba(0,0,0,0.4)", fontFamily:"'Space Mono',monospace" }}>
            このサイファーは終了しました
          </div>
        ) : (
          <button onClick={() => { onJoin(cypher.id); if (!joined) onClose(); }}
            style={{ marginTop:"20px", width:"100%", padding:"14px", border:"none", borderRadius:"6px", background:joined?"rgba(22,163,74,0.1)":"#FF3D00", color:joined?"#16A34A":"#fff", fontSize:"14px", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.15em", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
            {joined ? <><Check size={16} /> 参加済み — キャンセルする</> : <><Zap size={16} /> このサイファーに参加する</>}
          </button>
        )}
      </div>
      {/* 参加者プロフィールシート */}
      {selectedParticipant && <ParticipantSheet participant={selectedParticipant} onClose={() => setSelectedParticipant(null)} />}
    </div>
  );
}

// ─── TOP SCREEN ───────────────────────────────────────────────────────────────
function TopScreen({ onNav, onCardClick, user, refreshKey, dancerName }: { onNav: (s: string) => void; onCardClick: (c: Cypher) => void; user: SupabaseUser; refreshKey: number; dancerName: string }) {
  const [filter, setFilter] = useState<GenreKey | "ALL">("ALL");
  const [cyphers, setCyphers] = useState<Cypher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCyphers() {
      setLoading(true);
      // cyphersとparticipationsを別々に取得（Embed joinのFK依存を避ける）
      const [cypherRes, partRes] = await Promise.all([
        supabase
          .from("cyphers")
          .select(`
            id, title, organizer_id, starts_at, location, description, max_members, status,
            profiles:organizer_id ( dancer_name ),
            cypher_genres ( genres:genre_id ( name ) )
          `)
          .order("starts_at"),
        supabase.from("participations").select("cypher_id"),
      ]);
      if (cypherRes.error) { console.error(cypherRes.error); setLoading(false); return; }

      // cypher_idごとの参加者数マップを作成
      const countMap: Record<string, number> = {};
      (partRes.data ?? []).forEach((p: any) => {
        countMap[p.cypher_id] = (countMap[p.cypher_id] ?? 0) + 1;
      });

      const shaped: Cypher[] = (cypherRes.data ?? []).map((row: any) => {
        const name = row.profiles?.dancer_name ?? "UNKNOWN";
        const genres: GenreKey[] = (row.cypher_genres ?? []).map((cg: any) => cg.genres?.name as GenreKey).filter(Boolean);
        const count = countMap[row.id] ?? 0;
        return { id:row.id, title:row.title, starts_at:row.starts_at, location:row.location, description:row.description??"", max_members:row.max_members, status:row.status, genres, organizer:{ id:row.organizer_id, dancer_name:name, avatar:name[0]?.toUpperCase()??"?" }, participant_count:count, hot:count>=5 };
      });
      setCyphers(shaped);
      setLoading(false);
    }
    fetchCyphers();
  }, [refreshKey]);

  const filtered = filter === "ALL" ? cyphers : cyphers.filter(c => c.genres.includes(filter));
  const activeCount = filtered.filter(c => timeUntil(c.starts_at) !== "終了").length;
  const dancerCount = filtered.reduce((a, c) => a + c.participant_count, 0);

  return (
    <div style={{ paddingBottom:"80px" }}>
      {/* ヘッダー */}
      <div style={{ padding:"32px 16px 20px", borderBottom:"1px solid rgba(0,0,0,0.08)", background:"#FFFFFF" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:"10px", fontFamily:"'Space Mono',monospace", color:"rgba(0,0,0,0.35)", letterSpacing:"0.2em", marginBottom:"6px" }}>▶ LIVE SESSIONS</div>
            <h1 style={{ margin:0, fontSize:"42px", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.1em", background:"linear-gradient(135deg,#FF3D00,#FF6D00,#D97706)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", lineHeight:1 }}>爆踊</h1>
            <p style={{ margin:"6px 0 0", fontSize:"11px", color:"rgba(0,0,0,0.4)", fontFamily:"'Space Mono',monospace" }}>今日、ここで、踊ろう。</p>
          </div>
          {/* プロフィールアイコン（クリックでプロフィール画面へ）*/}
          <button onClick={() => onNav("profile")} style={{ background:"none", border:"none", cursor:"pointer", padding:"4px", marginTop:"8px", display:"flex", flexDirection:"column", alignItems:"center", gap:"3px" }}>
            <div style={{ width:"36px", height:"36px", borderRadius:"50%", background:"linear-gradient(135deg,#FF3D00,#FF6D00)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", fontFamily:"'Bebas Neue',sans-serif", color:"#fff", border:"2px solid rgba(0,0,0,0.08)" }}>
              {dancerName ? dancerName[0].toUpperCase() : <User size={16} color="#fff" />}
            </div>
            {dancerName && <span style={{ fontSize:"8px", fontFamily:"'Space Mono',monospace", color:"rgba(0,0,0,0.4)", maxWidth:"48px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{dancerName}</span>}
          </button>
        </div>
      </div>

      {/* ジャンルフィルター（全ジャンル表示、sliceなし）*/}
      <div style={{ display:"flex", gap:"6px", padding:"12px 16px", overflowX:"auto", scrollbarWidth:"none", borderBottom:"1px solid rgba(0,0,0,0.08)", background:"#FFFFFF" }}>
        {(["ALL", ...GENRES] as (GenreKey | "ALL")[]).map(g => (
          <button key={g} onClick={() => setFilter(g)}
            style={{ flexShrink:0, padding:"5px 12px", border:filter===g?`1px solid ${g==="ALL"?"#FF3D00":GENRE_COLORS[g as GenreKey]}`:"1px solid rgba(0,0,0,0.12)", borderRadius:"20px", background:filter===g?`${g==="ALL"?"#FF3D00":GENRE_COLORS[g as GenreKey]}15`:"transparent", color:filter===g?(g==="ALL"?"#FF3D00":GENRE_COLORS[g as GenreKey]):"rgba(0,0,0,0.45)", fontSize:"10px", fontFamily:"'Space Mono',monospace", cursor:"pointer", fontWeight:filter===g?"bold":"normal" }}>
            {g}
          </button>
        ))}
      </div>

      {/* スタッツ */}
      <div style={{ display:"flex", padding:"10px 16px", gap:"20px", borderBottom:"1px solid rgba(0,0,0,0.08)", background:"#FFFFFF" }}>
        {[
          {label:"ACTIVE", value:activeCount, icon:<Radio size={10}/>},
          {label:"DANCERS", value:dancerCount, icon:<Users size={10}/>},
        ].map(s => (
          <div key={s.label} style={{ display:"flex", alignItems:"center", gap:"6px" }}>
            <span style={{ color:"#FF3D00" }}>{s.icon}</span>
            <span style={{ fontSize:"18px", fontFamily:"'Bebas Neue',sans-serif", color:"#111111" }}>{s.value}</span>
            <span style={{ fontSize:"9px", fontFamily:"'Space Mono',monospace", color:"rgba(0,0,0,0.35)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* カード一覧 */}
      <div style={{ display:"flex", flexDirection:"column", gap:"8px", padding:"12px 16px", background:"#F5F7FA" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:"40px", color:"rgba(0,0,0,0.35)", fontFamily:"'Space Mono',monospace", fontSize:"12px" }}>LOADING...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px", color:"rgba(0,0,0,0.35)", fontFamily:"'Space Mono',monospace", fontSize:"12px" }}>まだサイファーがありません。最初に作ろう！</div>
        ) : (
          filtered.map(c => <CypherCard key={c.id} cypher={c} onClick={() => onCardClick(c)} />)
        )}
      </div>
    </div>
  );
}

// ─── POST SCREEN ──────────────────────────────────────────────────────────────
function PostScreen({ onNav, user }: { onNav: (s: string) => void; user: SupabaseUser }) {
  const [form, setForm] = useState<FormState>({ title:"", date:"", start_time:"", end_time:"", location:"", genres:[], description:"", max_members:"", payment:"" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toggleGenre = (g: GenreKey) => setForm(f => ({ ...f, genres: f.genres.includes(g) ? f.genres.filter(x => x !== g) : [...f.genres, g] }));

  const handleSubmit = async () => {
    if (!form.title || !form.date || !form.location) return;
    setLoading(true); setError("");
    const starts_at = form.start_time ? `${form.date}T${form.start_time}:00` : `${form.date}T00:00:00`;
    const { data: cypher, error: cErr } = await supabase
      .from("cyphers")
      .insert({ title:form.title, location:form.location, description:form.description, starts_at, max_members:form.max_members?Number(form.max_members):null, organizer_id:user.id })
      .select().single();
    if (cErr || !cypher) { console.error("cypher insert error:", cErr); setError(`投稿に失敗しました。エラー: ${cErr?.message ?? "不明"}`); setLoading(false); return; }
    if (form.genres.length > 0) {
      const { data: genreRows } = await supabase.from("genres").select("id,name").in("name", form.genres);
      if (genreRows && genreRows.length > 0) {
        await supabase.from("cypher_genres").insert(genreRows.map((g: any) => ({ cypher_id:cypher.id, genre_id:g.id })));
      }
    }
    setLoading(false); setSubmitted(true);
    setTimeout(() => onNav("top"), 1800);
  };

  const inp: React.CSSProperties = { width:"100%", padding:"10px 12px", background:"#F5F7FA", border:"1px solid rgba(0,0,0,0.1)", borderRadius:"6px", color:"#111111", fontSize:"14px", fontFamily:"'Space Mono',monospace", outline:"none", boxSizing:"border-box" };
  const lbl: React.CSSProperties = { display:"block", fontSize:"9px", fontFamily:"'Space Mono',monospace", letterSpacing:"0.15em", color:"rgba(0,0,0,0.45)", marginBottom:"6px", textTransform:"uppercase" };

  if (submitted) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"70vh", gap:"16px", background:"#FFFFFF" }}>
      <div style={{ width:"72px", height:"72px", borderRadius:"50%", background:"rgba(22,163,74,0.1)", border:"2px solid #16A34A", display:"flex", alignItems:"center", justifyContent:"center" }}><Check size={32} color="#16A34A" /></div>
      <p style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color:"#16A34A", margin:0 }}>POSTED!</p>
    </div>
  );

  return (
    <div style={{ paddingBottom:"80px", background:"#FAFAFA" }}>
      <div style={{ padding:"24px 16px 16px", borderBottom:"1px solid rgba(0,0,0,0.08)", background:"#FFFFFF" }}>
        <div style={{ fontSize:"10px", fontFamily:"'Space Mono',monospace", color:"rgba(0,0,0,0.35)", letterSpacing:"0.2em", marginBottom:"4px" }}>▶ NEW SESSION</div>
        <h2 style={{ margin:0, fontFamily:"'Bebas Neue',sans-serif", fontSize:"32px", color:"#111111" }}>サイファーを作る</h2>
      </div>
      <div style={{ padding:"20px 16px", display:"flex", flexDirection:"column", gap:"16px" }}>
        {error && <div style={{ padding:"10px 12px", background:"rgba(255,61,0,0.06)", border:"1px solid rgba(255,61,0,0.25)", borderRadius:"6px", color:"#FF3D00", fontSize:"12px", fontFamily:"'Space Mono',monospace" }}>{error}</div>}

        <div><label style={lbl}>イベント名 *</label><input style={inp} placeholder="例: 渋谷夜間サイファー" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} /></div>

        <div><label style={lbl}>日付 *</label><input type="date" style={inp} value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></div>

        {/* 30分刻みの開始・終了時間 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          <div>
            <label style={lbl}>開始時間</label>
            <select style={inp} value={form.start_time} onChange={e=>setForm(f=>({...f,start_time:e.target.value}))}>
              <option value="">未設定</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>終了時間</label>
            <select style={inp} value={form.end_time} onChange={e=>setForm(f=>({...f,end_time:e.target.value}))}>
              <option value="">未設定</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div><label style={lbl}>場所 *</label><input style={inp} placeholder="例: 渋谷駅 ハチ公前" value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} /></div>

        <div>
          <label style={lbl}>ジャンル</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"7px" }}>
            {GENRES.map(g => { const sel=form.genres.includes(g); const col=GENRE_COLORS[g]; return (
              <button key={g} onClick={()=>toggleGenre(g)} style={{ padding:"6px 12px", border:sel?`1px solid ${col}`:"1px solid rgba(0,0,0,0.1)", borderRadius:"20px", background:sel?`${col}15`:"transparent", color:sel?col:"rgba(0,0,0,0.45)", fontSize:"10px", fontFamily:"'Space Mono',monospace", cursor:"pointer" }}>{g}</button>
            );})}
          </div>
        </div>

        <div><label style={lbl}>詳細説明</label><textarea style={{...inp,minHeight:"80px",resize:"vertical"} as React.CSSProperties} placeholder="参加者へのメッセージ..." value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>

        {/* 参加定員（最小1）*/}
        <div><label style={lbl}>参加定員</label><input style={inp} type="number" min="1" placeholder="空欄 = 無制限" value={form.max_members} onChange={e=>setForm(f=>({...f,max_members:e.target.value}))} /></div>

        {/* 支払い方法 */}
        <div>
          <label style={lbl}>支払い方法</label>
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
            {["現金","PayPay","無料"].map(p => {
              const sel = form.payment === p;
              return (
                <button key={p} onClick={()=>setForm(f=>({...f,payment:f.payment===p?"":p}))}
                  style={{ padding:"8px 16px", border:sel?"1px solid #FF3D00":"1px solid rgba(0,0,0,0.1)", borderRadius:"6px", background:sel?"rgba(255,61,0,0.08)":"transparent", color:sel?"#FF3D00":"rgba(0,0,0,0.45)", fontSize:"12px", fontFamily:"'Space Mono',monospace", cursor:"pointer" }}>
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading}
          style={{ width:"100%", padding:"14px", border:"none", borderRadius:"6px", background:form.title&&form.date&&form.location?"#FF3D00":"rgba(0,0,0,0.06)", color:form.title&&form.date&&form.location?"#fff":"rgba(0,0,0,0.25)", fontSize:"15px", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.15em", cursor:form.title&&form.date&&form.location?"pointer":"not-allowed", opacity:loading?0.6:1 }}>
          <Zap size={15} style={{ display:"inline", marginRight:"8px", verticalAlign:"middle" }} />
          {loading ? "投稿中..." : "サイファーを投稿する"}
        </button>
      </div>
    </div>
  );
}

// ─── PROFILE SCREEN ───────────────────────────────────────────────────────────
function ProfileScreen({ user, onDancerNameChange }: { user: SupabaseUser; onDancerNameChange?: (name: string) => void }) {
  const [profile, setProfile] = useState<ProfileState>({ dancer_name:"", genres:[], instagram:"", dance_years:"", age_group:"", gender:"" });
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(true);

  const toggleGenre = (g: GenreKey) => { setProfile(p=>({...p,genres:p.genres.includes(g)?p.genres.filter(x=>x!==g):[...p.genres,g]})); setSaved(false); };
  const handleSignOut = async () => { await supabase.auth.signOut(); };

  // 既存のプロフィールをDBから読み込む
  useEffect(() => {
    async function fetchProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("dancer_name, genres, instagram, dance_years, age_group, gender")
        .eq("id", user.id)
        .single();
      if (data) {
        setProfile({
          dancer_name: data.dancer_name ?? "",
          genres: (data.genres ?? []) as GenreKey[],
          instagram: data.instagram ?? "",
          dance_years: data.dance_years != null ? String(data.dance_years) : "",
          age_group: data.age_group ?? "",
          gender: data.gender ?? "",
        });
      }
      setLoading(false);
    }
    fetchProfile();
  }, [user.id]);

  // プロフィールをDBに保存（upsertで行が存在しない場合でも確実に保存）
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
    }, { onConflict: "id" });
    if (error) {
      console.error("profile save error:", error);
      setSaveError(`保存に失敗しました: ${error.message}`);
    } else {
      setSaved(true);
      // ヘッダーのダンサーネームも即時更新
      if (profile.dancer_name) onDancerNameChange?.(profile.dancer_name);
    }
  };

  const inp: React.CSSProperties = { width:"100%", padding:"10px 12px", background:"#F5F7FA", border:"1px solid rgba(0,0,0,0.1)", borderRadius:"6px", color:"#111111", fontSize:"14px", fontFamily:"'Space Mono',monospace", outline:"none", boxSizing:"border-box" };
  const lbl: React.CSSProperties = { display:"block", fontSize:"9px", fontFamily:"'Space Mono',monospace", letterSpacing:"0.15em", color:"rgba(0,0,0,0.45)", marginBottom:"6px", textTransform:"uppercase" as const };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"50vh" }}>
      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"12px", color:"rgba(0,0,0,0.3)" }}>LOADING...</div>
    </div>
  );

  return (
    <div style={{ paddingBottom:"80px", background:"#FAFAFA" }}>
      <div style={{ padding:"24px 16px 16px", borderBottom:"1px solid rgba(0,0,0,0.08)", background:"#FFFFFF" }}>
        <div style={{ fontSize:"10px", fontFamily:"'Space Mono',monospace", color:"rgba(0,0,0,0.35)", letterSpacing:"0.2em", marginBottom:"4px" }}>▶ YOUR IDENTITY</div>
        <h2 style={{ margin:0, fontFamily:"'Bebas Neue',sans-serif", fontSize:"32px", color:"#111111" }}>ダンサー設定</h2>
      </div>
      <div style={{ padding:"20px 16px", display:"flex", flexDirection:"column", gap:"20px" }}>
        {/* Googleアカウント情報（メールアドレスは非表示）*/}
        <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"12px 16px", background:"#FFFFFF", border:"1px solid rgba(0,0,0,0.08)", borderRadius:"8px" }}>
          {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width:"40px", height:"40px", borderRadius:"50%" }} />}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:"13px", color:"#111111", fontFamily:"'Space Mono',monospace", fontWeight:"bold" }}>{user.user_metadata?.full_name ?? "ダンサー"}</div>
          </div>
          <button onClick={handleSignOut} style={{ background:"none", border:"1px solid rgba(0,0,0,0.12)", borderRadius:"4px", color:"rgba(0,0,0,0.45)", cursor:"pointer", padding:"6px 10px", display:"flex", alignItems:"center", gap:"4px", fontSize:"10px", fontFamily:"'Space Mono',monospace" }}>
            <LogOut size={12} /> ログアウト
          </button>
        </div>

        <div><label style={lbl}>ダンサーネーム</label>
          <input style={{ ...inp, fontSize:"16px", fontFamily:"'Bebas Neue',sans-serif" }} placeholder="DANCER NAME" value={profile.dancer_name} onChange={e=>{setProfile(p=>({...p,dancer_name:e.target.value}));setSaved(false);}} />
        </div>

        {/* ダンス歴・年代 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          <div><label style={lbl}>ダンス歴（年）</label>
            <input style={inp} type="number" min="0" placeholder="例: 3" value={profile.dance_years} onChange={e=>{setProfile(p=>({...p,dance_years:e.target.value}));setSaved(false);}} />
          </div>
          <div><label style={lbl}>年代</label>
            <select style={inp} value={profile.age_group} onChange={e=>{setProfile(p=>({...p,age_group:e.target.value}));setSaved(false);}}>
              <option value="">未設定</option>
              {["10代","20代","30代","40代","50代以上"].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* 性別（任意） */}
        <div>
          <label style={lbl}>性別（任意）</label>
          <div style={{ display:"flex", gap:"8px" }}>
            {["男性","女性","その他","未回答"].map(g => {
              const sel = profile.gender === g;
              return (
                <button key={g} onClick={()=>{setProfile(p=>({...p,gender:p.gender===g?"":g}));setSaved(false);}}
                  style={{ padding:"8px 12px", border:sel?"1px solid #FF3D00":"1px solid rgba(0,0,0,0.1)", borderRadius:"6px", background:sel?"rgba(255,61,0,0.08)":"transparent", color:sel?"#FF3D00":"rgba(0,0,0,0.45)", fontSize:"11px", fontFamily:"'Space Mono',monospace", cursor:"pointer" }}>
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Instagramアカウント */}
        <div><label style={lbl}>Instagram（任意）</label>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", color:"rgba(0,0,0,0.35)", fontSize:"14px", fontFamily:"'Space Mono',monospace" }}>@</span>
            <input style={{ ...inp, paddingLeft:"28px" }} placeholder="username" value={profile.instagram} onChange={e=>{setProfile(p=>({...p,instagram:e.target.value}));setSaved(false);}} />
          </div>
        </div>

        {/* 得意ジャンル */}
        <div>
          <label style={lbl}>得意ジャンル</label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
            {GENRES.map(g=>{const sel=profile.genres.includes(g);const col=GENRE_COLORS[g];return(
              <button key={g} onClick={()=>toggleGenre(g)} style={{ padding:"10px", border:sel?`1px solid ${col}`:"1px solid rgba(0,0,0,0.1)", borderRadius:"6px", background:sel?`${col}12`:"#FFFFFF", color:sel?col:"rgba(0,0,0,0.4)", fontSize:"11px", fontFamily:"'Space Mono',monospace", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                {g}{sel&&<Check size={11}/>}
              </button>
            );})}
          </div>
        </div>

        {saveError && <div style={{ padding:"10px 12px", background:"rgba(255,61,0,0.06)", border:"1px solid rgba(255,61,0,0.25)", borderRadius:"6px", color:"#FF3D00", fontSize:"12px", fontFamily:"'Space Mono',monospace" }}>{saveError}</div>}
        <button onClick={handleSave} style={{ width:"100%", padding:"13px", border:"none", borderRadius:"6px", background:saved?"rgba(22,163,74,0.1)":"#FF3D00", color:saved?"#16A34A":"#fff", fontSize:"14px", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.15em", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
          {saved?<><Check size={15}/>SAVED!</>:<><Star size={15}/>プロフィールを保存する</>}
        </button>
      </div>
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
function BottomNav({ current, onNav }: { current: string; onNav: (s: string) => void }) {
  const items = [{id:"top",icon:<Flame size={20}/>,label:"CYPHER"},{id:"post",icon:<Plus size={20}/>,label:"POST"},{id:"profile",icon:<User size={20}/>,label:"ME"}];
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"rgba(255,255,255,0.95)", backdropFilter:"blur(12px)", borderTop:"1px solid rgba(0,0,0,0.08)", display:"flex", zIndex:50, maxWidth:"480px", margin:"0 auto", boxShadow:"0 -2px 12px rgba(0,0,0,0.06)" }}>
      {items.map(item=>(
        <button key={item.id} onClick={()=>onNav(item.id)} style={{ flex:1, padding:"12px 0 10px", border:"none", background:"transparent", color:current===item.id?"#FF3D00":"rgba(0,0,0,0.35)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:"4px" }}>
          {item.id==="post"?(
            <div style={{ width:"42px", height:"42px", borderRadius:"50%", background:"#FF3D00", display:"flex", alignItems:"center", justifyContent:"center", marginTop:"-20px", boxShadow:"0 2px 12px rgba(255,61,0,0.4)", border:"3px solid #FAFAFA" }}><Plus size={20} color="#fff"/></div>
          ):item.icon}
          <span style={{ fontSize:"8px", fontFamily:"'Space Mono',monospace", letterSpacing:"0.1em" }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function BakuOdori() {
  const [screen, setScreen] = useState("top");
  const [joined, setJoined] = useState<string[]>([]);
  const [detail, setDetail] = useState<Cypher | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  // TopScreen再フェッチトリガー（参加/キャンセル後にインクリメント）
  const [refreshKey, setRefreshKey] = useState(0);
  // ダンサーネーム（ヘッダー表示用）
  const [dancerName, setDancerName] = useState("");

  // ログイン時にprofilesレコードを自動作成（存在しない場合のみ）
  const ensureProfile = async (u: SupabaseUser) => {
    await supabase.from("profiles").upsert(
      { id: u.id, dancer_name: u.user_metadata?.full_name ?? "" },
      { onConflict: "id", ignoreDuplicates: true }
    );
  };

  // ログイン後にダンサーネームと参加済みサイファー一覧をDBから取得
  const fetchUserData = async (u: SupabaseUser) => {
    const [profileRes, partsRes] = await Promise.all([
      supabase.from("profiles").select("dancer_name").eq("id", u.id).single(),
      supabase.from("participations").select("cypher_id").eq("profile_id", u.id),
    ]);
    // dancer_nameがあればそれを、なければGoogleの名前をフォールバック
    const name = profileRes.data?.dancer_name || u.user_metadata?.full_name || "";
    if (name) setDancerName(name);
    if (partsRes.data) setJoined(partsRes.data.map((p: any) => p.cypher_id));
  };

  useEffect(() => {
    // 初期セッション確認
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) { ensureProfile(u); fetchUserData(u); }
      setAuthLoading(false);
    });
    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) { ensureProfile(u); fetchUserData(u); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // 参加ボタン：DBにINSERT → joinedに追加 → カード再フェッチ
  const handleJoin = async (id: string) => {
    if (!user) return;
    if (joined.includes(id)) {
      // キャンセル時は確認モーダルを表示
      setConfirmId(id);
    } else {
      const { error } = await supabase.from("participations").insert({ cypher_id: id, profile_id: user.id });
      if (error) { console.error("join error:", error); return; }
      setJoined(j => [...j, id]);
      setRefreshKey(k => k + 1);
    }
  };

  // キャンセル確定：DBからDELETE → joinedから除去 → カード再フェッチ
  const handleConfirmCancel = async () => {
    if (confirmId && user) {
      const { error } = await supabase.from("participations").delete()
        .eq("cypher_id", confirmId).eq("profile_id", user.id);
      if (error) { console.error("cancel error:", error); setConfirmId(null); return; }
      setJoined(j => j.filter(x => x !== confirmId));
      setRefreshKey(k => k + 1);
    }
    setConfirmId(null);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body,html{background:#00FF00;color:#111111;-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{display:none}
        textarea{font-family:inherit}
        select{appearance:none;-webkit-appearance:none}
      `}</style>

      <div style={{ maxWidth:"480px", margin:"0 auto", minHeight:"100vh", background:"#FAFAFA" }}>
        {authLoading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"24px", color:"rgba(0,0,0,0.3)", letterSpacing:"0.2em" }}>LOADING...</div>
          </div>
        ) : !user ? (
          <LoginScreen />
        ) : (
          <>
            {screen==="top"     && <TopScreen onNav={setScreen} onCardClick={setDetail} user={user} refreshKey={refreshKey} dancerName={dancerName}/>}
            {screen==="post"    && <PostScreen onNav={setScreen} user={user}/>}
            {screen==="profile" && <ProfileScreen user={user} onDancerNameChange={setDancerName}/>}
            <BottomNav current={screen} onNav={setScreen}/>
            {detail && <DetailModal cypher={detail} onClose={()=>setDetail(null)} joined={joined.includes(detail.id)} onJoin={handleJoin}/>}
            {confirmId && <ConfirmModal onConfirm={handleConfirmCancel} onCancel={()=>setConfirmId(null)} />}
          </>
        )}
      </div>
    </>
  );
}
