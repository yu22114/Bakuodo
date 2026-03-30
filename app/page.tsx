"use client";
import { useState, useEffect } from "react";
import { MapPin, Clock, Users, Zap, Plus, User, Check, X, Star, Radio, Flame } from "lucide-react";
import { supabase } from "../lib/supabase";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type GenreKey = "Breaking" | "Popping" | "Locking" | "Waacking" | "Voguing" | "House" | "Krump" | "Hip-Hop";

interface Cypher {
  id: string;
  title: string;
  starts_at: string;
  location: string;
  genres: GenreKey[];
  organizer: { dancer_name: string; avatar: string };
  participant_count: number;
  max_members: number | null;
  status: string;
  description: string;
  hot: boolean;
}
interface FormState {
  title: string; date: string; time: string; location: string;
  genres: GenreKey[]; description: string; max_members: string;
}
interface ProfileState { dancer_name: string; genres: GenreKey[]; }

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const GENRES: GenreKey[] = ["Breaking","Popping","Locking","Waacking","Voguing","House","Krump","Hip-Hop"];
const GENRE_COLORS: Record<GenreKey, string> = {
  Breaking:"#FF3D00", Popping:"#00E5FF", Locking:"#FFD600",
  Waacking:"#E040FB", Voguing:"#FF4081", House:"#69FF47",
  Krump:"#FF6D00", "Hip-Hop":"#40C4FF",
};

// ─── UTILS ────────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  const d = new Date(iso);
  const weekdays = ["日","月","火","水","木","金","土"];
  return {
    date: `${d.getMonth()+1}/${d.getDate()}(${weekdays[d.getDay()]})`,
    time: `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`,
  };
}
function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - new Date().getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}日後`;
  if (h > 0) return `${h}時間後`;
  return "まもなく";
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function GenreBadge({ genre, size = "sm" }: { genre: GenreKey; size?: "sm" | "md" }) {
  const color = GENRE_COLORS[genre];
  return (
    <span style={{ border:`1px solid ${color}`, color, fontSize:size==="sm"?"10px":"12px", padding:size==="sm"?"2px 8px":"4px 12px", borderRadius:"2px", fontFamily:"'Space Mono',monospace", letterSpacing:"0.05em", textTransform:"uppercase", whiteSpace:"nowrap" }}>
      {genre}
    </span>
  );
}

function ParticipantBar({ count, max }: { count: number; max: number | null }) {
  const pct = max ? Math.min((count / max) * 100, 100) : 50;
  const color = pct > 80 ? "#FF3D00" : pct > 50 ? "#FFD600" : "#69FF47";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
      <div style={{ flex:1, height:"3px", background:"rgba(255,255,255,0.1)", borderRadius:"2px", overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color, boxShadow:`0 0 8px ${color}` }} />
      </div>
      <span style={{ fontSize:"11px", color, fontFamily:"'Space Mono',monospace", minWidth:"60px", textAlign:"right" }}>
        {count}{max ? `/${max}` : ""} 人
      </span>
    </div>
  );
}

function CypherCard({ cypher, onClick, joined, onJoin }: { cypher: Cypher; onClick: () => void; joined: boolean; onJoin: (id: string) => void }) {
  const { date, time } = formatDate(cypher.starts_at);
  const until = timeUntil(cypher.starts_at);
  const [hover, setHover] = useState(false);
  const color = GENRE_COLORS[cypher.genres[0]] ?? "#ffffff";
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background:hover?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)", border:cypher.hot?"1px solid rgba(255,61,0,0.5)":"1px solid rgba(255,255,255,0.08)", borderRadius:"4px", padding:"16px", cursor:"pointer", transition:"all 0.2s ease", transform:hover?"translateY(-2px)":"none", position:"relative", overflow:"hidden" }}>
      {cypher.hot && <div style={{ position:"absolute", top:0, right:0, background:"#FF3D00", padding:"3px 10px", fontSize:"9px", fontFamily:"'Space Mono',monospace", color:"#fff", fontWeight:"bold" }}>🔥 HOT</div>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px" }}>
        <div style={{ flex:1, paddingRight:"40px" }}>
          <h3 style={{ margin:0, fontSize:"15px", fontWeight:700, color:"#F5F5F5", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.05em", lineHeight:1.2 }}>{cypher.title}</h3>
          <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)", marginTop:"2px", fontFamily:"'Space Mono',monospace" }}>by {cypher.organizer.dancer_name}</div>
        </div>
        <div style={{ width:"36px", height:"36px", borderRadius:"2px", background:`linear-gradient(135deg,${color}33,transparent)`, border:`1px solid ${color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", fontWeight:"bold", color, fontFamily:"'Bebas Neue',sans-serif", flexShrink:0 }}>
          {cypher.organizer.avatar}
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:"5px", marginBottom:"12px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          <Clock size={11} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.6)", fontFamily:"'Space Mono',monospace" }}>{date} {time}</span>
          <span style={{ fontSize:"9px", padding:"1px 5px", background:"rgba(255,255,255,0.08)", borderRadius:"2px", color:"rgba(255,255,255,0.5)", fontFamily:"'Space Mono',monospace" }}>{until}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          <MapPin size={11} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.6)", fontFamily:"'Space Mono',monospace" }}>{cypher.location}</span>
        </div>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:"5px", marginBottom:"12px" }}>
        {cypher.genres.map(g => <GenreBadge key={g} genre={g} />)}
      </div>
      <ParticipantBar count={cypher.participant_count} max={cypher.max_members} />
      <button onClick={e => { e.stopPropagation(); onJoin(cypher.id); }}
        style={{ marginTop:"12px", width:"100%", padding:"9px", border:joined?"1px solid rgba(105,255,71,0.5)":"1px solid rgba(255,255,255,0.2)", borderRadius:"2px", background:joined?"rgba(105,255,71,0.1)":"transparent", color:joined?"#69FF47":"rgba(255,255,255,0.7)", fontSize:"11px", fontFamily:"'Space Mono',monospace", letterSpacing:"0.1em", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
        {joined ? <><Check size={12} /> JOINED</> : <><Plus size={12} /> JUMP IN</>}
      </button>
    </div>
  );
}

function DetailModal({ cypher, onClose, joined, onJoin }: { cypher: Cypher | null; onClose: () => void; joined: boolean; onJoin: (id: string) => void }) {
  if (!cypher) return null;
  const { date, time } = formatDate(cypher.starts_at);
  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)", display:"flex", alignItems:"flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:"480px", margin:"0 auto", background:"#111", border:"1px solid rgba(255,255,255,0.12)", borderBottom:"none", borderRadius:"8px 8px 0 0", padding:"24px 20px 40px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px" }}>
          <h2 style={{ margin:0, fontSize:"24px", fontFamily:"'Bebas Neue',sans-serif", color:"#F5F5F5", lineHeight:1.1 }}>{cypher.title}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer" }}><X size={20} /></button>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginBottom:"16px" }}>
          {cypher.genres.map(g => <GenreBadge key={g} genre={g} size="md" />)}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"16px" }}>
          <div style={{ display:"flex", gap:"10px", fontSize:"13px", color:"rgba(255,255,255,0.7)", fontFamily:"'Space Mono',monospace" }}><Clock size={14} /> {date} {time}</div>
          <div style={{ display:"flex", gap:"10px", fontSize:"13px", color:"rgba(255,255,255,0.7)", fontFamily:"'Space Mono',monospace" }}><MapPin size={14} /> {cypher.location}</div>
          <div style={{ display:"flex", gap:"10px", fontSize:"13px", color:"rgba(255,255,255,0.7)", fontFamily:"'Space Mono',monospace" }}><User size={14} /> 主催: {cypher.organizer.dancer_name}</div>
        </div>
        {cypher.description && <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.55)", lineHeight:1.7, marginBottom:"20px" }}>{cypher.description}</p>}
        <ParticipantBar count={cypher.participant_count} max={cypher.max_members} />
        <button onClick={() => { onJoin(cypher.id); onClose(); }}
          style={{ marginTop:"20px", width:"100%", padding:"14px", border:"none", borderRadius:"2px", background:joined?"rgba(105,255,71,0.15)":"#FF3D00", color:joined?"#69FF47":"#fff", fontSize:"14px", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.15em", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
          {joined ? <><Check size={16} /> 参加済み — キャンセルする</> : <><Zap size={16} /> このサイファーに参加する</>}
        </button>
      </div>
    </div>
  );
}

// ─── TOP SCREEN ───────────────────────────────────────────────────────────────
function TopScreen({ onNav, joined, onJoin, onCardClick }: { onNav: (s: string) => void; joined: string[]; onJoin: (id: string) => void; onCardClick: (c: Cypher) => void }) {
  const [filter, setFilter] = useState<GenreKey | "ALL">("ALL");
  const [cyphers, setCyphers] = useState<Cypher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCyphers() {
      setLoading(true);
      const { data, error } = await supabase
        .from("cyphers")
        .select(`
          id, title, starts_at, location, description, max_members, status,
          profiles:organizer_id ( dancer_name ),
          cypher_genres ( genres:genre_id ( name ) ),
          participations ( count )
        `)
        .eq("status", "open")
        .order("starts_at");

      if (error) { console.error(error); setLoading(false); return; }

      const shaped: Cypher[] = (data ?? []).map((row: any) => {
        const name = row.profiles?.dancer_name ?? "UNKNOWN";
        const genres: GenreKey[] = (row.cypher_genres ?? [])
          .map((cg: any) => cg.genres?.name as GenreKey)
          .filter(Boolean);
        const count = row.participations?.[0]?.count ?? 0;
        return {
          id: row.id,
          title: row.title,
          starts_at: row.starts_at,
          location: row.location,
          description: row.description ?? "",
          max_members: row.max_members,
          status: row.status,
          genres,
          organizer: { dancer_name: name, avatar: name[0]?.toUpperCase() ?? "?" },
          participant_count: Number(count),
          hot: Number(count) >= 5,
        };
      });
      setCyphers(shaped);
      setLoading(false);
    }
    fetchCyphers();
  }, []);

  const filtered = filter === "ALL" ? cyphers : cyphers.filter(c => c.genres.includes(filter));

  return (
    <div style={{ paddingBottom:"80px" }}>
      <div style={{ padding:"32px 16px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize:"10px", fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,0.3)", letterSpacing:"0.2em", marginBottom:"6px" }}>▶ LIVE SESSIONS</div>
        <h1 style={{ margin:0, fontSize:"42px", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.1em", background:"linear-gradient(135deg,#FF3D00,#FF6D00,#FFD600)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", lineHeight:1 }}>爆踊</h1>
        <p style={{ margin:"6px 0 0", fontSize:"11px", color:"rgba(255,255,255,0.4)", fontFamily:"'Space Mono',monospace" }}>今日、ここで、踊ろう。</p>
      </div>
      <div style={{ display:"flex", gap:"6px", padding:"12px 16px", overflowX:"auto", scrollbarWidth:"none", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        {(["ALL", ...GENRES] as (GenreKey | "ALL")[]).slice(0,7).map(g => (
          <button key={g} onClick={() => setFilter(g)}
            style={{ flexShrink:0, padding:"5px 12px", border:filter===g?`1px solid ${g==="ALL"?"#FF3D00":GENRE_COLORS[g as GenreKey]}`:"1px solid rgba(255,255,255,0.12)", borderRadius:"2px", background:filter===g?`${g==="ALL"?"#FF3D00":GENRE_COLORS[g as GenreKey]}18`:"transparent", color:filter===g?(g==="ALL"?"#FF3D00":GENRE_COLORS[g as GenreKey]):"rgba(255,255,255,0.4)", fontSize:"10px", fontFamily:"'Space Mono',monospace", cursor:"pointer" }}>
            {g}
          </button>
        ))}
      </div>
      <div style={{ display:"flex", padding:"10px 16px", gap:"20px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        {[{label:"ACTIVE",value:filtered.length,icon:<Radio size={10}/>},{label:"DANCERS",value:filtered.reduce((a,c)=>a+c.participant_count,0),icon:<Users size={10}/>}].map(s=>(
          <div key={s.label} style={{ display:"flex", alignItems:"center", gap:"6px" }}>
            <span style={{ color:"#FF3D00" }}>{s.icon}</span>
            <span style={{ fontSize:"18px", fontFamily:"'Bebas Neue',sans-serif", color:"#F5F5F5" }}>{s.value}</span>
            <span style={{ fontSize:"9px", fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,0.3)" }}>{s.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:"8px", padding:"12px 16px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:"40px", color:"rgba(255,255,255,0.3)", fontFamily:"'Space Mono',monospace", fontSize:"12px" }}>
            LOADING...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px", color:"rgba(255,255,255,0.3)", fontFamily:"'Space Mono',monospace", fontSize:"12px" }}>
            まだサイファーがありません。最初に作ろう！
          </div>
        ) : (
          filtered.map(c => <CypherCard key={c.id} cypher={c} onClick={() => onCardClick(c)} joined={joined.includes(c.id)} onJoin={onJoin} />)
        )}
      </div>
    </div>
  );
}

// ─── POST SCREEN ──────────────────────────────────────────────────────────────
function PostScreen({ onNav }: { onNav: (s: string) => void }) {
  const [form, setForm] = useState<FormState>({ title:"", date:"", time:"", location:"", genres:[], description:"", max_members:"" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleGenre = (g: GenreKey) => setForm(f => ({ ...f, genres: f.genres.includes(g) ? f.genres.filter(x => x !== g) : [...f.genres, g] }));

  const handleSubmit = async () => {
    if (!form.title || !form.date || !form.location) return;
    setLoading(true);
    setError("");

    const starts_at = form.time
      ? `${form.date}T${form.time}:00`
      : `${form.date}T00:00:00`;

    // ① サイファー本体を挿入（organizer_idはnullで仮投稿）
    const { data: cypher, error: cErr } = await supabase
      .from("cyphers")
      .insert({
        title: form.title,
        location: form.location,
        description: form.description,
        starts_at,
        max_members: form.max_members ? Number(form.max_members) : null,
        organizer_id: null,
      })
      .select()
      .single();

    if (cErr || !cypher) { setError("投稿に失敗しました。もう一度お試しください。"); setLoading(false); return; }

    // ② ジャンルを紐付け
    if (form.genres.length > 0) {
      const { data: genreRows } = await supabase
        .from("genres")
        .select("id, name")
        .in("name", form.genres);

      if (genreRows && genreRows.length > 0) {
        await supabase.from("cypher_genres").insert(
          genreRows.map((g: any) => ({ cypher_id: cypher.id, genre_id: g.id }))
        );
      }
    }

    setLoading(false);
    setSubmitted(true);
    setTimeout(() => onNav("top"), 1800);
  };

  const inp: React.CSSProperties = { width:"100%", padding:"10px 12px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"2px", color:"#F5F5F5", fontSize:"14px", fontFamily:"'Space Mono',monospace", outline:"none", boxSizing:"border-box" };
  const lbl: React.CSSProperties = { display:"block", fontSize:"9px", fontFamily:"'Space Mono',monospace", letterSpacing:"0.15em", color:"rgba(255,255,255,0.4)", marginBottom:"6px", textTransform:"uppercase" };

  if (submitted) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"70vh", gap:"16px" }}>
      <div style={{ width:"72px", height:"72px", borderRadius:"50%", background:"rgba(105,255,71,0.1)", border:"2px solid #69FF47", display:"flex", alignItems:"center", justifyContent:"center" }}><Check size={32} color="#69FF47" /></div>
      <p style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"28px", color:"#69FF47", margin:0 }}>POSTED!</p>
    </div>
  );

  return (
    <div style={{ paddingBottom:"80px" }}>
      <div style={{ padding:"24px 16px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize:"10px", fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,0.3)", letterSpacing:"0.2em", marginBottom:"4px" }}>▶ NEW SESSION</div>
        <h2 style={{ margin:0, fontFamily:"'Bebas Neue',sans-serif", fontSize:"32px", color:"#F5F5F5" }}>サイファーを作る</h2>
      </div>
      <div style={{ padding:"20px 16px", display:"flex", flexDirection:"column", gap:"16px" }}>
        {error && <div style={{ padding:"10px 12px", background:"rgba(255,61,0,0.1)", border:"1px solid rgba(255,61,0,0.3)", borderRadius:"2px", color:"#FF3D00", fontSize:"12px", fontFamily:"'Space Mono',monospace" }}>{error}</div>}
        <div><label style={lbl}>イベント名 *</label><input style={inp} placeholder="例: 渋谷夜間サイファー" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} /></div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          <div><label style={lbl}>日付 *</label><input type="date" style={inp} value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></div>
          <div><label style={lbl}>時間</label><input type="time" style={inp} value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} /></div>
        </div>
        <div><label style={lbl}>場所 *</label><input style={inp} placeholder="例: 渋谷駅 ハチ公前" value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} /></div>
        <div>
          <label style={lbl}>ジャンル</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"7px" }}>
            {GENRES.map(g => { const sel=form.genres.includes(g); const col=GENRE_COLORS[g]; return (
              <button key={g} onClick={()=>toggleGenre(g)} style={{ padding:"6px 12px", border:sel?`1px solid ${col}`:"1px solid rgba(255,255,255,0.12)", borderRadius:"2px", background:sel?`${col}20`:"transparent", color:sel?col:"rgba(255,255,255,0.45)", fontSize:"10px", fontFamily:"'Space Mono',monospace", cursor:"pointer" }}>{g}</button>
            );})}
          </div>
        </div>
        <div><label style={lbl}>詳細説明</label><textarea style={{...inp,minHeight:"80px",resize:"vertical"} as React.CSSProperties} placeholder="参加者へのメッセージ..." value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
        <div><label style={lbl}>参加定員</label><input style={inp} type="number" placeholder="空欄 = 無制限" value={form.max_members} onChange={e=>setForm(f=>({...f,max_members:e.target.value}))} /></div>
        <button onClick={handleSubmit} disabled={loading}
          style={{ width:"100%", padding:"14px", border:"none", borderRadius:"2px", background:form.title&&form.date&&form.location?"linear-gradient(135deg,#FF3D00,#FF6D00)":"rgba(255,255,255,0.06)", color:form.title&&form.date&&form.location?"#fff":"rgba(255,255,255,0.3)", fontSize:"15px", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.15em", cursor:form.title&&form.date&&form.location?"pointer":"not-allowed", opacity:loading?0.6:1 }}>
          <Zap size={15} style={{ display:"inline", marginRight:"8px", verticalAlign:"middle" }} />
          {loading ? "投稿中..." : "サイファーを投稿する"}
        </button>
      </div>
    </div>
  );
}

// ─── PROFILE SCREEN ───────────────────────────────────────────────────────────
function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileState>({ dancer_name:"", genres:[] });
  const [saved, setSaved] = useState(false);
  const toggleGenre = (g: GenreKey) => { setProfile(p=>({...p,genres:p.genres.includes(g)?p.genres.filter(x=>x!==g):[...p.genres,g]})); setSaved(false); };
  return (
    <div style={{ paddingBottom:"80px" }}>
      <div style={{ padding:"24px 16px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize:"10px", fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,0.3)", letterSpacing:"0.2em", marginBottom:"4px" }}>▶ YOUR IDENTITY</div>
        <h2 style={{ margin:0, fontFamily:"'Bebas Neue',sans-serif", fontSize:"32px", color:"#F5F5F5" }}>ダンサー設定</h2>
      </div>
      <div style={{ padding:"20px 16px", display:"flex", flexDirection:"column", gap:"24px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
          <div style={{ width:"64px", height:"64px", borderRadius:"4px", background:"linear-gradient(135deg,#FF3D00,#FF6D00)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"28px", fontFamily:"'Bebas Neue',sans-serif", color:"#fff" }}>
            {profile.dancer_name?profile.dancer_name[0].toUpperCase():"?"}
          </div>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", color:"#F5F5F5" }}>{profile.dancer_name||"YOUR NAME"}</div>
            <div style={{ fontSize:"10px", fontFamily:"'Space Mono',monospace", color:"rgba(255,255,255,0.3)" }}>{profile.genres.length>0?profile.genres.join(" · "):"No genres set"}</div>
          </div>
        </div>
        <div>
          <label style={{ display:"block", fontSize:"9px", fontFamily:"'Space Mono',monospace", letterSpacing:"0.15em", color:"rgba(255,255,255,0.4)", marginBottom:"6px", textTransform:"uppercase" as const }}>ダンサーネーム</label>
          <input style={{ width:"100%", padding:"10px 12px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"2px", color:"#F5F5F5", fontSize:"16px", fontFamily:"'Bebas Neue',sans-serif", outline:"none", boxSizing:"border-box" as const }} placeholder="DANCER NAME" value={profile.dancer_name} onChange={e=>{setProfile(p=>({...p,dancer_name:e.target.value}));setSaved(false);}} />
        </div>
        <div>
          <label style={{ display:"block", fontSize:"9px", fontFamily:"'Space Mono',monospace", letterSpacing:"0.15em", color:"rgba(255,255,255,0.4)", marginBottom:"10px", textTransform:"uppercase" as const }}>得意ジャンル</label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
            {GENRES.map(g=>{const sel=profile.genres.includes(g);const col=GENRE_COLORS[g];return(
              <button key={g} onClick={()=>toggleGenre(g)} style={{ padding:"10px", border:sel?`1px solid ${col}`:"1px solid rgba(255,255,255,0.1)", borderRadius:"2px", background:sel?`${col}15`:"rgba(255,255,255,0.02)", color:sel?col:"rgba(255,255,255,0.4)", fontSize:"11px", fontFamily:"'Space Mono',monospace", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                {g}{sel&&<Check size={11}/>}
              </button>
            );})}
          </div>
        </div>
        <button onClick={()=>setSaved(true)} style={{ width:"100%", padding:"13px", border:"none", borderRadius:"2px", background:saved?"rgba(105,255,71,0.15)":"linear-gradient(135deg,#FF3D00,#FF6D00)", color:saved?"#69FF47":"#fff", fontSize:"14px", fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.15em", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
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
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"rgba(10,10,10,0.95)", backdropFilter:"blur(12px)", borderTop:"1px solid rgba(255,255,255,0.08)", display:"flex", zIndex:50, maxWidth:"480px", margin:"0 auto" }}>
      {items.map(item=>(
        <button key={item.id} onClick={()=>onNav(item.id)} style={{ flex:1, padding:"12px 0 10px", border:"none", background:"transparent", color:current===item.id?"#FF3D00":"rgba(255,255,255,0.3)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:"4px" }}>
          {item.id==="post"?(
            <div style={{ width:"42px", height:"42px", borderRadius:"50%", background:"rgba(255,61,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center", marginTop:"-20px", boxShadow:"0 0 20px rgba(255,61,0,0.5)", border:"3px solid #0a0a0a" }}><Plus size={20} color="#fff"/></div>
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
  const handleJoin = (id: string) => setJoined(j => j.includes(id) ? j.filter(x => x !== id) : [...j, id]);
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body,html{background:#0a0a0a;color:#F5F5F5;-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{display:none}
        input[type="date"],input[type="time"]{color-scheme:dark}
        textarea{font-family:inherit}
      `}</style>
      <div style={{ maxWidth:"480px", margin:"0 auto", minHeight:"100vh", background:"#0a0a0a" }}>
        {screen==="top"     && <TopScreen onNav={setScreen} joined={joined} onJoin={handleJoin} onCardClick={setDetail}/>}
        {screen==="post"    && <PostScreen onNav={setScreen}/>}
        {screen==="profile" && <ProfileScreen/>}
        <BottomNav current={screen} onNav={setScreen}/>
        {detail && <DetailModal cypher={detail} onClose={()=>setDetail(null)} joined={joined.includes(detail.id)} onJoin={handleJoin}/>}
      </div>
    </>
  );
}
