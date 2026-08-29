"use client";
import { useState, useEffect, useRef } from "react";
import { Check, Zap, BookOpen, RotateCcw, X, Plus, Camera } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { FormState, StaffRole } from "../lib/types";
import { GENRES, EXTENDED_GENRES, GENRE_COLORS, genreLabel, START_TIME_OPTIONS, DEFAULT_START_TIME, isNextDayEnd, endTimeLabel, endTimeOptions, getNextDate, todayStr, toggleGenre as toggleGenreList, normalizeInstagramUrl, STAFF_ROLES, STAFF_ROLE_LABELS } from "../lib/constants";
import { StationSearch } from "./StationSearch";

// ジャンルは横スクロールのドラム式で選ぶ。折り返さず1列に並べ、選択中を追いかけてスクロールする。
// genresは呼び出し側から渡す（CYPHERは従来の8種、LESSON/EVENT/NUMBERはGIRLS/JAZZ/FREESTYLEを足した拡張版）
function GenreStrip({ value, onChange, genres }: { value: string; onChange: (g: (typeof GENRES)[number]) => void; genres: (typeof GENRES) }) {
  const selectedRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [value]);
  return (
    <div className="bd-scroll" style={{ display: "flex", gap: "7px", overflowX: "auto", padding: "2px 1px 6px" }}>
      {genres.map(g => {
        const sel = value === g;
        const col = GENRE_COLORS[g];
        return (
          <button key={g} ref={sel ? selectedRef : undefined} type="button" onClick={() => onChange(g)}
            style={{ flexShrink: 0, padding: "6px 12px", border: sel ? "none" : "1px solid rgba(255,255,255,0.14)", borderRadius: "20px", background: sel ? `linear-gradient(180deg, color-mix(in srgb, ${col} 55%, white 45%), color-mix(in srgb, ${col} 55%, white 15%))` : "transparent", boxShadow: sel ? `0 3px 7px ${col}33, inset 0 1px 0 rgba(255,255,255,0.5)` : "inset 0 1px 3px rgba(0,0,0,0.3)", color: sel ? `color-mix(in srgb, ${col} 100%, black 35%)` : "rgba(255,255,255,0.5)", fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", whiteSpace: "nowrap", fontWeight: sel ? "bold" : "normal" }}>
            {genreLabel(g)}
          </button>
        );
      })}
    </div>
  );
}

// EVENTだけが持つJUDGE・DJ・MC。1人ずつ、フォロー中のアカウントから選ぶか、
// アプリ未登録の人向けにInstagramを手入力するかのどちらかで追加する
type StaffDraft = { profileId: string | null; dancerName: string | null; avatarUrl: string | null; instagram: string | null };

function StaffRoleEditor({ role, entries, onChange, following }: {
  role: StaffRole;
  entries: StaffDraft[];
  onChange: (next: StaffDraft[]) => void;
  following: { id: string; dancer_name: string; avatar_url: string | null }[];
}) {
  const [instagramInput, setInstagramInput] = useState("");
  const availableFollowing = following.filter(f => !entries.some(e => e.profileId === f.id));

  const addFromFollowing = (id: string) => {
    const person = following.find(f => f.id === id);
    if (!person) return;
    onChange([...entries, { profileId: person.id, dancerName: person.dancer_name, avatarUrl: person.avatar_url, instagram: null }]);
  };
  const addFromInstagram = () => {
    const handle = normalizeInstagramUrl(instagramInput);
    if (!handle) return;
    onChange([...entries, { profileId: null, dancerName: null, avatarUrl: null, instagram: handle }]);
    setInstagramInput("");
  };
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));

  const inp: React.CSSProperties = { flex: 1, padding: "8px 10px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" };

  return (
    <div>
      <label style={{ display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.15em", color: "#F0F0F0", marginBottom: "6px", textTransform: "uppercase" }}>
        {STAFF_ROLE_LABELS[role]} <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "8px" }}>任意</span>
      </label>
      {entries.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
          {entries.map((e, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 8px 4px 4px", background: "rgba(255,255,255,0.08)", borderRadius: "20px", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0" }}>
              {e.profileId ? (
                <>
                  <span style={{ width: "18px", height: "18px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, flexShrink: 0 }}>
                    {e.avatarUrl ? <img src={e.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : e.dancerName?.[0]?.toUpperCase()}
                  </span>
                  {e.dancerName}
                </>
              ) : (
                <span style={{ color: "#38BDF8" }}>@{e.instagram?.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/+$/, "")}</span>
              )}
              <button onClick={() => remove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", padding: 0, display: "flex" }}><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      <select value="" onChange={e => e.target.value && addFromFollowing(e.target.value)} disabled={availableFollowing.length === 0}
        style={{ ...inp, width: "100%", color: availableFollowing.length ? "#F0F0F0" : "rgba(255,255,255,0.3)" }}>
        <option value="">フォロー中から選ぶ</option>
        {availableFollowing.map(f => <option key={f.id} value={f.id}>{f.dancer_name}</option>)}
      </select>
      <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
        <input value={instagramInput} onChange={e => setInstagramInput(e.target.value)} placeholder="Instagram（URLか@ユーザー名）" maxLength={200} autoCapitalize="none" autoCorrect="off" style={inp} />
        <button onClick={addFromInstagram} disabled={!instagramInput.trim()} type="button"
          style={{ flexShrink: 0, padding: "0 12px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "6px", background: "transparent", color: instagramInput.trim() ? "#F0F0F0" : "rgba(255,255,255,0.3)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: instagramInput.trim() ? "pointer" : "default" }}>
          追加
        </button>
      </div>
    </div>
  );
}

// 背景の光もホーム画面（TopScreen）と同じ考え方。タブの色を上から当たる光として敷く
const TAB_BG: Record<"number" | "cypher" | "pl" | "event", string> = {
  number: "radial-gradient(circle at center, rgba(236,72,153,0.55), rgba(236,72,153,0.1) 45%, #000000 75%)",
  cypher: "radial-gradient(circle at center, rgba(220,38,38,0.55), rgba(220,38,38,0.1) 45%, #000000 75%)",
  pl: "radial-gradient(circle at center, rgba(37,99,235,0.55), rgba(37,99,235,0.1) 45%, #000000 75%)",
  event: "radial-gradient(circle at center, rgba(234,179,8,0.55), rgba(234,179,8,0.1) 45%, #000000 75%)",
};
const DRAFT_KEY = "bakuodori:post-draft:v1";
const EMPTY_FORM: FormState = { title: "", date: "", start_time: DEFAULT_START_TIME, end_time: "", station: "", studio: "", genres: [], description: "", max_members: "", payment: [], studio_fee: "" };
const EMPTY_PL = { title: "", date: "", start_time: DEFAULT_START_TIME, end_time: "", station: "", studio: "", genres: [] as string[], description: "", max_members: "", price: "", target_level: "all" };

// LESSON・EVENT・NUMBERのカードに添付する画像まわり（CYPHERは対象外）。
// 縦4:横3の縦長に中央で切り抜いてから縮小する（サイズを固定して表示側を揃えるため）
const POST_IMAGE_WIDTH = 900;
const POST_IMAGE_HEIGHT = 1200; // 900 * 4/3
// 添付できる画像は最大5枚まで
const MAX_POST_IMAGES = 5;

function loadImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像を読み込めませんでした"));
    img.src = URL.createObjectURL(blob);
  });
}

// iPhoneのHEIC/HEIFは一部ブラウザで読み込めないためサーバー側で変換するが、
// Vercelのサーバー関数は約4.5MBまでという制限があるため、それを超える大きな
// ファイルはサーバーに送らずブラウザ自身のデコードにそのまま任せる
async function convertHeicIfNeeded(file: File): Promise<Blob> {
  const isHeic = /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  if (!isHeic) return file;
  if (file.size > 4 * 1024 * 1024) return file;
  const res = await fetch("/api/convert-heic", { method: "POST", body: file });
  if (!res.ok) throw new Error(`HEIC変換に失敗しました (status ${res.status})`);
  return await res.blob();
}

async function processPostImage(file: File): Promise<Blob> {
  const source = await convertHeicIfNeeded(file);
  const img = await loadImageElement(source);
  // 縦4:横3になるよう、中央を基準に元画像から切り出す範囲を決める
  const targetRatio = POST_IMAGE_WIDTH / POST_IMAGE_HEIGHT; // 3/4
  const srcRatio = img.naturalWidth / img.naturalHeight;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (srcRatio > targetRatio) {
    // 横に余裕がある（元画像の方が横長）→ 左右を切る
    sw = img.naturalHeight * targetRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    // 縦に余裕がある（元画像の方が縦長）→ 上下を切る
    sh = img.naturalWidth / targetRatio;
    sy = (img.naturalHeight - sh) / 2;
  }
  const canvas = document.createElement("canvas");
  canvas.width = POST_IMAGE_WIDTH;
  canvas.height = POST_IMAGE_HEIGHT;
  const ctx = canvas.getContext("2d");
  URL.revokeObjectURL(img.src);
  if (!ctx) throw new Error("画像の処理に失敗しました");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, POST_IMAGE_WIDTH, POST_IMAGE_HEIGHT);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("画像の処理に失敗しました");
  return blob;
}

async function uploadPostImage(userId: string, file: File): Promise<string> {
  const blob = await processPostImage(file);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("post-images").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw new Error(`画像のアップロードに失敗しました: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(path);
  return publicUrl;
}

// 選んだ画像ファイル（複数）のバリデーションと、プレビュー用URLの発行だけを行う小さなヘルパー。
// 実際のアップロードは投稿ボタンを押した時にまとめて行う。既に選んである枚数と合わせて上限を超えないようにする
function pickImageFiles(e: React.ChangeEvent<HTMLInputElement>, currentCount: number, onError: (msg: string) => void, onPicked: (files: File[], previewUrls: string[]) => void) {
  const files = Array.from(e.target.files ?? []);
  e.target.value = "";
  if (files.length === 0) return;
  const room = MAX_POST_IMAGES - currentCount;
  if (room <= 0) { onError(`画像は${MAX_POST_IMAGES}枚まで添付できます`); return; }
  const picked = files.slice(0, room);
  for (const file of picked) {
    if (file.size > 10 * 1024 * 1024) { onError("画像ファイルサイズは10MB以下にしてください"); return; }
    const looksLikeImage = file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i.test(file.name);
    if (!looksLikeImage) { onError("画像ファイルを選択してください"); return; }
  }
  onError(files.length > picked.length ? `画像は${MAX_POST_IMAGES}枚までのため、一部のみ追加しました` : "");
  onPicked(picked, picked.map(f => URL.createObjectURL(f)));
}

export function PostScreen({ onNav, user, initialTab = "cypher", accountType }: { onNav: (s: string) => void; user: SupabaseUser; initialTab?: "number" | "cypher" | "pl" | "event"; accountType?: string }) {
  // トップでLESSON/EVENTを見ていたならその作成フォームから始める
  const [tab, setTab] = useState<"number" | "cypher" | "pl" | "event">(initialTab);
  // 団体用アカウントではP LESSONタブを出さない（ホーム画面と同じ扱い）。NUMBERは団体用でも出す
  const visibleTabs = (["number", "cypher", "pl", "event"] as const).filter(t => !(accountType === "organization" && t === "pl"));
  useEffect(() => {
    if (!visibleTabs.includes(tab)) setTab(visibleTabs[0]);
  }, [accountType, tab]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isPrivate, setIsPrivate] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  // NUMBERフォーム用（限定公開・承認制がないのでトグルは持たない）
  const [numberForm, setNumberForm] = useState<FormState>(EMPTY_FORM);
  // NUMBERの開催日は、マイコミュニティの掲示板作成と同じ「1日目・2日目」の範囲指定にする
  // （numberForm.dateを1日目として使い回し、2日目だけ別で持つ）
  const [numberEndDate, setNumberEndDate] = useState("");
  // 本番当日。連続していなくてもよい複数の日付を追加・削除できるようにする
  const [numberPerformanceDates, setNumberPerformanceDates] = useState<string[]>([]);
  // 添付画像（任意・複数枚）。実際のアップロードは投稿ボタンを押した時にまとめて行う
  const [numberImageFiles, setNumberImageFiles] = useState<File[]>([]);
  const [numberImagePreviews, setNumberImagePreviews] = useState<string[]>([]);
  // PLフォーム用
  const [plForm, setPlForm] = useState(EMPTY_PL);
  const [plIsPrivate, setPlIsPrivate] = useState(false);
  const [plRequiresApproval, setPlRequiresApproval] = useState(false);
  const [plImageFiles, setPlImageFiles] = useState<File[]>([]);
  const [plImagePreviews, setPlImagePreviews] = useState<string[]>([]);
  // JUDGE・DJ・MC（EVENTだけで使う）。ロールごとに配列を持つ
  const [staffByRole, setStaffByRole] = useState<Record<StaffRole, StaffDraft[]>>({ judge: [], dj: [], mc: [] });
  // フォロー中のアカウント一覧（JUDGE・DJ・MCの選択肢に使う）
  const [following, setFollowing] = useState<{ id: string; dancer_name: string; avatar_url: string | null }[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  // 復元が終わるまで保存しない。refではなくstateにしているのは、refだと
  // 復元処理と同じ回で保存処理が走ってしまい、まだ空のフォームを見て
  // 「中身なし」と判定して復元したての下書きを消してしまうため
  const [draftLoaded, setDraftLoaded] = useState(false);

  // JUDGE・DJ・MCの「フォロー中から選ぶ」に出す一覧。承認済みのフォローだけを対象にする
  useEffect(() => {
    supabase.from("follows").select("following_id, profiles:following_id ( dancer_name, avatar_url )")
      .eq("follower_id", user.id).eq("status", "accepted")
      .then(({ data }) => {
        setFollowing((data ?? []).map((row: any) => ({ id: row.following_id, dancer_name: row.profiles?.dancer_name ?? "UNKNOWN", avatar_url: row.profiles?.avatar_url ?? null })));
      });
  }, [user.id]);

  // 入力が何かあるか。何も書いていない状態を下書きとして残さないための判定
  const hasContent = (f: typeof EMPTY_FORM, n: typeof EMPTY_FORM, p: typeof EMPTY_PL) =>
    !!(f.title || f.date || f.station || f.studio || f.description || f.max_members || f.studio_fee || f.genres.length ||
       n.title || n.date || n.station || n.studio || n.description || n.max_members || n.studio_fee || n.genres.length ||
       p.title || p.date || p.station || p.studio || p.description || p.max_members || p.price);

  // 下書きの復元。タブだけは復元しない（トップで見ていたセクションを優先したいため）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.form) setForm({ ...EMPTY_FORM, ...d.form });
        if (d.numberForm) setNumberForm({ ...EMPTY_FORM, ...d.numberForm });
        if (d.numberEndDate) setNumberEndDate(d.numberEndDate);
        if (d.numberPerformanceDates) setNumberPerformanceDates(d.numberPerformanceDates);
        if (d.plForm) setPlForm({ ...EMPTY_PL, ...d.plForm });
        setIsPrivate(!!d.isPrivate);
        setRequiresApproval(!!d.requiresApproval);
        setPlIsPrivate(!!d.plIsPrivate);
        setPlRequiresApproval(!!d.plRequiresApproval);
        if (hasContent(d.form ?? EMPTY_FORM, d.numberForm ?? EMPTY_FORM, d.plForm ?? EMPTY_PL)) setDraftRestored(true);
      }
    } catch { /* 壊れた下書きは無視して空フォームで始める */ }
    setDraftLoaded(true);
  }, []);

  // 入力のたびに自動保存
  useEffect(() => {
    if (!draftLoaded) return;
    try {
      if (!hasContent(form, numberForm, plForm)) { localStorage.removeItem(DRAFT_KEY); return; }
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, numberForm, numberEndDate, numberPerformanceDates, plForm, isPrivate, requiresApproval, plIsPrivate, plRequiresApproval }));
    } catch { /* 保存できなくても入力は続けられるようにする */ }
  }, [draftLoaded, form, numberForm, numberEndDate, numberPerformanceDates, plForm, isPrivate, requiresApproval, plIsPrivate, plRequiresApproval]);

  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

  const discardDraft = () => {
    setForm(EMPTY_FORM); setNumberForm(EMPTY_FORM); setNumberEndDate(""); setNumberPerformanceDates([]); setPlForm(EMPTY_PL);
    setIsPrivate(false); setRequiresApproval(false);
    setPlIsPrivate(false); setPlRequiresApproval(false);
    setDraftRestored(false);
    clearDraft();
  };

  // 画像の選択・解除（NUMBER用・LESSON/EVENT用で共通の考え方。複数枚まとめて追加できる）
  const handleNumberImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) =>
    pickImageFiles(e, numberImageFiles.length, setError, (files, previews) => {
      setNumberImageFiles(arr => [...arr, ...files]);
      setNumberImagePreviews(arr => [...arr, ...previews]);
    });
  const removeNumberImageAt = (index: number) => {
    setNumberImagePreviews(arr => { URL.revokeObjectURL(arr[index]); return arr.filter((_, i) => i !== index); });
    setNumberImageFiles(arr => arr.filter((_, i) => i !== index));
  };
  const clearNumberImages = () => {
    numberImagePreviews.forEach(p => URL.revokeObjectURL(p));
    setNumberImageFiles([]);
    setNumberImagePreviews([]);
  };
  const handlePlImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) =>
    pickImageFiles(e, plImageFiles.length, setError, (files, previews) => {
      setPlImageFiles(arr => [...arr, ...files]);
      setPlImagePreviews(arr => [...arr, ...previews]);
    });
  const removePlImageAt = (index: number) => {
    setPlImagePreviews(arr => { URL.revokeObjectURL(arr[index]); return arr.filter((_, i) => i !== index); });
    setPlImageFiles(arr => arr.filter((_, i) => i !== index));
  };
  const clearPlImages = () => {
    plImagePreviews.forEach(p => URL.revokeObjectURL(p));
    setPlImageFiles([]);
    setPlImagePreviews([]);
  };

  // All Styleと他ジャンルの同時選択はできない（constants.tsのtoggleGenreが担当）
  const toggleGenre = (g: (typeof GENRES)[number]) => setForm(f => ({ ...f, genres: toggleGenreList(f.genres, g) }));
  const toggleNumberGenre = (g: (typeof GENRES)[number]) => setNumberForm(f => ({ ...f, genres: toggleGenreList(f.genres, g) }));
  const togglePlGenre = (g: string) => setPlForm(f => ({ ...f, genres: toggleGenreList(f.genres, g) }));

  // 必須項目（最寄り駅・日付）が埋まっているか
  const canPost = !!(form.date && form.station);
  // NUMBERはマイコミュニティの掲示板作成と同じ考え方：イベント名と開催日（1日目）が必須
  const canPostNumber = !!(numberForm.title.trim() && numberForm.date);
  const canPostPL = !!(plForm.date && plForm.station);
  // イベントはレッスンと同じフォーム・同じテーブルを使い、kindと文言・色だけ変える
  const isEvent = tab === "event";
  const plAccent = isEvent ? "#EAB308" : "#2563EB";
  // EVENTの黄色は白文字だと読みにくいので、plAccentを背景に敷く箇所だけ文字色を切り替える
  const onPlAccent = isEvent ? "#171717" : "#fff";
  // 投稿ボタンだけ、わずかにグラデーションを効かせて立体感を出す
  const plAccentGradient = isEvent ? "linear-gradient(135deg, #EAB308, #B7950B)" : "linear-gradient(135deg, #2563EB, #1D4ED8)";
  // 投稿完了演出の色。タブごとの色（NUMBER=ピンク・CYPHER=赤・P LESSON=青・EVENT=黄）に合わせる
  const postedAccent = tab === "number" ? "#EC4899" : tab === "cypher" ? "#DC2626" : plAccent;
  const plNoun = isEvent ? "イベント" : "レッスン";

  const handleSubmit = async () => {
    if (!canPost) return;
    // minは手打ちを防げないのでここでも弾く
    if (form.date < todayStr()) { setError("過去の日付は投稿できません"); return; }
    if (form.station.length > 50 || form.title.length > 100 || form.description.length > 1000) {
      setError("入力が長すぎます"); return;
    }
    setLoading(true); setError("");
    // +09:00を付けてJSTとして保存（省略するとUTC扱いになり9時間ずれる）
    const starts_at = form.start_time ? `${form.date}T${form.start_time}:00+09:00` : `${form.date}T00:00:00+09:00`;
    const endDate = form.end_time && isNextDayEnd(form.end_time, form.start_time) ? getNextDate(form.date) : form.date;
    const ends_at = form.end_time ? `${endDate}T${form.end_time}:00+09:00` : null;
    const location = form.studio ? `${form.station} ${form.studio}` : form.station;
    // イベント名が空欄なら会場名だけをタイトルにする（会場も未入力なら駅名にフォールバック）
    const title = form.title.trim() || form.studio || location;
    const { data: cypher, error: cErr } = await supabase
      .from("cyphers")
      .insert({ title, location, description: form.description, starts_at, ends_at, max_members: form.max_members ? Number(form.max_members) : null, organizer_id: user.id, visibility: isPrivate ? "private" : "public", requires_approval: requiresApproval, studio_fee: form.studio_fee ? Number(form.studio_fee) : null })
      .select().single();
    if (cErr || !cypher) { console.error("cypher insert error:", cErr); setError(`投稿に失敗しました。エラー: ${cErr?.message ?? "不明"}`); setLoading(false); return; }
    if (form.genres.length > 0) {
      const { data: genreRows } = await supabase.from("genres").select("id,name").in("name", form.genres);
      if (genreRows && genreRows.length > 0) {
        await supabase.from("cypher_genres").insert(genreRows.map((g: any) => ({ cypher_id: cypher.id, genre_id: g.id })));
      }
    }
    // 主催者を自動で参加者に追加
    await supabase.from("participations").insert({ cypher_id: cypher.id, profile_id: user.id });
    clearDraft(); // 投稿できたので下書きは残さない
    setLoading(false); setSubmitted(true);
    setTimeout(() => onNav("top"), 1400);
  };

  // NUMBERの投稿。マイコミュニティの掲示板作成と同じ「イベント名＋開催日（1日目・2日目）」の形にする。
  // 最寄り駅・スタジオ代・時刻は持たない分、handleSubmit（CYPHER）よりシンプル
  const handleSubmitNumber = async () => {
    if (!canPostNumber) return;
    if (numberForm.date < todayStr()) { setError("過去の日付は投稿できません"); return; }
    if (numberForm.title.length > 100 || numberForm.description.length > 1000) {
      setError("入力が長すぎます"); return;
    }
    setLoading(true); setError("");
    // 選んだ画像を順番にアップロードする。1枚目をimage_url（カード表紙のサムネイル）にも使う
    const image_urls: string[] = [];
    for (const file of numberImageFiles) {
      try {
        image_urls.push(await uploadPostImage(user.id, file));
      } catch (err) {
        setError((err as any)?.message ?? "画像のアップロードに失敗しました"); setLoading(false); return;
      }
    }
    const image_url = image_urls[0] ?? null;
    const title = numberForm.title.trim();
    const starts_at = `${numberForm.date}T00:00:00+09:00`;
    // 2日目は1日目より後の日を選んだ時だけ意味がある値として保存する（マイコミュニティと同じ考え方）
    const ends_at = numberEndDate && numberEndDate > numberForm.date ? `${numberEndDate}T23:59:59+09:00` : null;
    // 会場が空欄ならイベント名だけを場所欄に入れる（locationはnot null制約のため）
    const location = numberForm.studio.trim() || title;
    const { data: numberRow, error: nErr } = await supabase
      .from("numbers")
      .insert({ title, location, description: numberForm.description, starts_at, ends_at, max_members: numberForm.max_members ? Number(numberForm.max_members) : null, organizer_id: user.id, image_url, image_urls })
      .select().single();
    if (nErr || !numberRow) { console.error("number insert error:", nErr); setError(`投稿に失敗しました。エラー: ${nErr?.message ?? "不明"}`); setLoading(false); return; }
    if (numberForm.genres.length > 0) {
      const { data: genreRows } = await supabase.from("genres").select("id,name").in("name", numberForm.genres);
      if (genreRows && genreRows.length > 0) {
        await supabase.from("number_genres").insert(genreRows.map((g: any) => ({ number_id: numberRow.id, genre_id: g.id })));
      }
    }
    // 本番当日（空欄の行は無視する）
    const validPerformanceDates = numberPerformanceDates.filter(Boolean);
    if (validPerformanceDates.length > 0) {
      await supabase.from("number_performance_dates").insert(validPerformanceDates.map(event_date => ({ number_id: numberRow.id, event_date })));
    }
    // 主催者を自動で参加者に追加
    await supabase.from("number_participations").insert({ number_id: numberRow.id, profile_id: user.id });
    clearNumberImages();
    clearDraft();
    setLoading(false); setSubmitted(true);
    setTimeout(() => onNav("top"), 1400);
  };

  const handleSubmitPL = async () => {
    if (!canPostPL) return;
    if (plForm.date < todayStr()) { setError("過去の日付は投稿できません"); return; }
    if (plForm.station.length > 50 || plForm.title.length > 100 || plForm.description.length > 1000) {
      setError("入力が長すぎます"); return;
    }
    setLoading(true); setError("");
    // 選んだ画像を順番にアップロードする。1枚目をimage_url（カード表紙のサムネイル）にも使う
    const image_urls: string[] = [];
    for (const file of plImageFiles) {
      try {
        image_urls.push(await uploadPostImage(user.id, file));
      } catch (err) {
        setError((err as any)?.message ?? "画像のアップロードに失敗しました"); setLoading(false); return;
      }
    }
    const image_url = image_urls[0] ?? null;
    const starts_at = plForm.start_time ? `${plForm.date}T${plForm.start_time}:00+09:00` : `${plForm.date}T00:00:00+09:00`;
    const endDate = plForm.end_time && isNextDayEnd(plForm.end_time, plForm.start_time) ? getNextDate(plForm.date) : plForm.date;
    const ends_at = plForm.end_time ? `${endDate}T${plForm.end_time}:00+09:00` : null;
    const location = plForm.studio ? `${plForm.station} ${plForm.studio}` : plForm.station;
    // レッスン・イベント名が空欄なら会場名だけをタイトルにする（会場も未入力なら駅名にフォールバック）
    const title = plForm.title.trim() || plForm.studio || location;
    const { data: lesson, error: lErr } = await supabase
      .from("private_lessons")
      .insert({ title, location, description: plForm.description, starts_at, ends_at, max_members: plForm.max_members ? Number(plForm.max_members) : null, price: plForm.price ? Number(plForm.price) : null, target_level: plForm.target_level, organizer_id: user.id, visibility: plIsPrivate ? "private" : "public", requires_approval: plRequiresApproval, kind: isEvent ? "event" : "lesson", image_url, image_urls })
      .select().single();
    if (lErr || !lesson) { setError(`投稿に失敗しました: ${lErr?.message ?? "不明"}`); setLoading(false); return; }
    if (plForm.genres.length > 0) {
      const { data: genreRows } = await supabase.from("genres").select("id,name").in("name", plForm.genres);
      if (genreRows && genreRows.length > 0) {
        await supabase.from("pl_genres").insert(genreRows.map((g: any) => ({ lesson_id: lesson.id, genre_id: g.id })));
      }
    }
    // JUDGE・DJ・MC（EVENTだけ）
    if (isEvent) {
      const staffRows = STAFF_ROLES.flatMap(role => staffByRole[role].map((e, i) => ({ lesson_id: lesson.id, role, profile_id: e.profileId, instagram: e.profileId ? null : e.instagram, sort_order: i })));
      if (staffRows.length > 0) {
        await supabase.from("pl_staff").insert(staffRows);
      }
    }
    clearPlImages();
    setStaffByRole({ judge: [], dj: [], mc: [] });
    clearDraft(); // 投稿できたので下書きは残さない
    setLoading(false); setSubmitted(true);
    setTimeout(() => onNav("top"), 1400);
  };

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "6px", color: "#F0F0F0", fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box", colorScheme: "dark" as any };
  const lbl: React.CSSProperties = { display: "block", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.15em", color: "#F0F0F0", marginBottom: "6px", textTransform: "uppercase" };
  if (submitted) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", gap: "16px", background: "#000000" }}>
      <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: postedAccent + "26", border: `2px solid ${postedAccent}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={32} color={postedAccent} /></div>
      <p style={{ fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, fontSize: "28px", color: postedAccent, margin: 0 }}>
        POSTED {tab === "number" ? "NUMBER" : tab === "cypher" ? "CYPHER" : tab === "pl" ? "LESSON" : "EVENT"}!
      </p>
    </div>
  );

  // ホーム画面（TopScreen）と同じく、ヘッダー＋タブは固定し、入力項目だけがスクロールする作りにする
  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flexShrink: 0 }}>
        {/* タブはホーム画面と同じ、丸い枠の中で選択中だけ浮くセグメント風 */}
        <div style={{ padding: "10px 16px", background: "#0D0D0D", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {(() => {
          const shownTabs = ([["number", "NUMBER", "#EC4899"], ["event", "EVENT", "#EAB308"], ["cypher", "CYPHER", "#DC2626"], ["pl", "LESSON", "#2563EB"]] as const).filter(([key]) => visibleTabs.includes(key));
          return (
            <div style={{ display: "flex", background: "linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.1) 46%, rgba(255,255,255,0.02) 58%, transparent 72%), linear-gradient(150deg, #2c2c2c 0%, #1a1a1a 25%, #242424 48%, #161616 70%, #282828 100%)", borderRadius: "14px", padding: "4px", position: "relative", boxShadow: "inset 0 2px 5px rgba(0,0,0,0.4)" }}>
              {/* 選択中を示す背景の板がヌルッと隣のタブへ移動する（下バーと同じ仕組み）。
                  トラックと同じ斜めグラデーションを一段明るくして、溝に浮かぶ金属板のような立体感を付ける */}
              <div aria-hidden="true" style={{ position: "absolute", top: "4px", left: "4px", bottom: "4px", width: `calc((100% - 8px) / ${shownTabs.length})`, borderRadius: "10px", background: "linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.18) 46%, rgba(255,255,255,0.03) 58%, transparent 72%), linear-gradient(150deg, #4a4a4a 0%, #363636 25%, #404040 48%, #2c2c2c 70%, #464646 100%)", boxShadow: "0 3px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)", transform: `translateX(${Math.max(0, shownTabs.findIndex(([key]) => key === tab)) * 100}%)`, transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)", pointerEvents: "none" }} />
              {shownTabs.map(([key, label, color]) => (
                <button key={key} onClick={() => setTab(key)}
                  style={{ flex: 1, padding: "9px 4px", border: "none", borderRadius: "10px", background: "transparent", position: "relative", zIndex: 1, color: tab === key ? color : "rgba(255,255,255,0.55)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", fontWeight: tab === key ? "bold" : "normal", letterSpacing: "0.06em", transition: "color 0.15s" }}>
                  {label}
                </button>
              ))}
            </div>
          );
        })()}
        </div>
      </div>
      <div className="bd-scroll bd-glow-bg" style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" as any, background: TAB_BG[tab], transition: "background 0.2s", padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && <div style={{ padding: "10px 12px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "6px", color: "#DC2626", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif" }}>{error}</div>}

        {/* 勝手に前回の入力が入っていると驚くので、復元したことを明示して捨てられるようにする */}
        {draftRestored && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.3)", borderRadius: "8px" }}>
            <div style={{ flex: 1, fontSize: "12px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", lineHeight: 1.5 }}>
              書きかけの内容を復元しました
            </div>
            <button onClick={discardDraft}
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 12px", minHeight: "40px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", flexShrink: 0 }}>
              <RotateCcw size={12} /> 破棄
            </button>
          </div>
        )}

        {tab === "number" ? (<>
          <div><label style={lbl}>イベント名 <span style={{ color: "#EC4899" }}>*</span></label><input style={inp} placeholder="例: 〇〇ダンスショーケース" maxLength={100} value={numberForm.title} onChange={e => setNumberForm(f => ({ ...f, title: e.target.value }))} /></div>
          {/* 想定練習期間：マイコミュニティの掲示板作成と同じ「開始・終了」の範囲指定 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><label style={lbl}>想定練習期間 開始 <span style={{ color: "#EC4899" }}>*</span></label>
              <div style={{ display: "flex" }}><input type="date" style={{ ...inp, flex: 1 }} min={todayStr()} value={numberForm.date} onChange={e => { const v = e.target.value; if (v && v < todayStr()) return; setNumberForm(f => ({ ...f, date: v })); if (numberEndDate && numberEndDate < v) setNumberEndDate(""); }} /></div>
            </div>
            <div><label style={lbl}>終了 <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "8px" }}>任意</span></label>
              <div style={{ display: "flex" }}><input type="date" style={{ ...inp, flex: 1 }} min={numberForm.date || todayStr()} value={numberEndDate} onChange={e => setNumberEndDate(e.target.value)} disabled={!numberForm.date} /></div>
            </div>
          </div>
          {/* 本番当日：連続していなくてもよい複数の日付を追加できる */}
          <div>
            <label style={lbl}>本番当日 <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "8px" }}>任意</span></label>
            {numberPerformanceDates.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                <input type="date" style={{ ...inp, flex: 1 }} min={todayStr()} value={d} onChange={e => { const v = e.target.value; setNumberPerformanceDates(arr => arr.map((x, idx) => idx === i ? v : x)); }} />
                <button onClick={() => setNumberPerformanceDates(arr => arr.filter((_, idx) => idx !== i))}
                  style={{ flexShrink: 0, width: "40px", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "6px", color: "#F0F0F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={14} />
                </button>
              </div>
            ))}
            <button onClick={() => setNumberPerformanceDates(arr => [...arr, ""])}
              style={{ width: "100%", padding: "10px", border: "1px dashed rgba(236,72,153,0.5)", borderRadius: "6px", background: "transparent", color: "#EC4899", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <Plus size={12} /> 日程を追加
            </button>
          </div>
          <div><label style={lbl}>会場 <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "8px" }}>任意</span></label><input style={inp} placeholder="例: Buzz渋谷 3号室、代々木worcle Aスタジオ" value={numberForm.studio} onChange={e => setNumberForm(f => ({ ...f, studio: e.target.value }))} /></div>
          <div>
            <label style={lbl}>画像 <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "8px" }}>任意・最大{MAX_POST_IMAGES}枚</span></label>
            {numberImagePreviews.length > 0 && (
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginBottom: "8px" }}>
                {numberImagePreviews.map((src, i) => (
                  <div key={i} style={{ position: "relative", flexShrink: 0, width: "84px", borderRadius: "8px", overflow: "hidden" }}>
                    <img src={src} alt="" style={{ width: "84px", aspectRatio: "3 / 4", objectFit: "cover", display: "block" }} />
                    <button onClick={() => removeNumberImageAt(i)} style={{ position: "absolute", top: "4px", right: "4px", width: "22px", height: "22px", borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {numberImagePreviews.length < MAX_POST_IMAGES && (
              <label style={{ width: "100%", padding: "10px", border: "1px dashed rgba(236,72,153,0.5)", borderRadius: "6px", background: "transparent", color: "#EC4899", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", boxSizing: "border-box" }}>
                <Camera size={12} /> 画像を追加
                <input type="file" accept="image/*" multiple onChange={handleNumberImagesSelect} style={{ display: "none" }} />
              </label>
            )}
          </div>
          <div><label style={lbl}>ジャンル</label>
            <GenreStrip value={numberForm.genres[0] ?? ""} onChange={toggleNumberGenre} genres={EXTENDED_GENRES} />
          </div>
          <div><label style={lbl}>詳細説明</label><textarea style={{ ...inp, minHeight: "80px", resize: "vertical" } as React.CSSProperties} placeholder="参加者へのメッセージ..." value={numberForm.description} onChange={e => setNumberForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div><label style={lbl}>想定人数</label><input style={inp} type="number" min="1" placeholder="空欄 = 未定" value={numberForm.max_members} onChange={e => setNumberForm(f => ({ ...f, max_members: e.target.value }))} /></div>
          <button onClick={handleSubmitNumber} disabled={loading} className={canPostNumber ? "bd-spray" : undefined} style={{ width: "100%", padding: "20px 14px", border: "none", borderRadius: "6px", background: canPostNumber ? "linear-gradient(135deg, #EC4899, #BE185D)" : "rgba(255,255,255,0.08)", color: canPostNumber ? "#fff" : "rgba(255,255,255,0.3)", fontSize: "15px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.15em", cursor: canPostNumber ? "pointer" : "not-allowed", opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <Zap size={15} />
            {loading ? "投稿中..." : "NUMBERを投稿する"}
          </button>
        </>) : tab === "cypher" ? (<>
          <div><label style={lbl}>最寄り駅 <span style={{ color: "#DC2626" }}>*</span></label><StationSearch value={form.station} onChange={v => setForm(f => ({ ...f, station: v }))} inputStyle={inp} /></div>
          <div><label style={lbl}>会場・スタジオ名・部屋番号</label><input style={inp} placeholder="例: Buzz渋谷 3号室、代々木worcle Aスタジオ" value={form.studio} onChange={e => setForm(f => ({ ...f, studio: e.target.value }))} /></div>
          {/* 過去のサイファーは掲載できないので今日より前は選べない */}
          {/* Safariはinput[type=date]にwidth:100%を反映しないことがあるため、
              flexコンテナ+flex:1で他の入力欄と横幅を揃える */}
          <div><label style={lbl}>日付 <span style={{ color: "#DC2626" }}>*</span></label>
            <div style={{ display: "flex" }}><input type="date" style={{ ...inp, flex: 1 }} min={todayStr()} value={form.date} onChange={e => { const v = e.target.value; if (v && v < todayStr()) return; setForm(f => ({ ...f, date: v })); }} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><label style={lbl}>開始時間</label>
              <select style={inp} value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}>
                {START_TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={lbl}>終了時間</label>
              <select style={inp} value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}>
                <option value="">未設定</option>
                {endTimeOptions(form.start_time).map(t => <option key={t} value={t}>{endTimeLabel(t, form.start_time)}</option>)}
              </select>
            </div>
          </div>
          <div><label style={lbl}>イベント名 <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "8px" }}>任意</span></label><input style={inp} placeholder="空欄の場合は開催場所がタイトルになります" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><label style={lbl}>ジャンル</label>
            <GenreStrip value={form.genres[0] ?? ""} onChange={toggleGenre} genres={GENRES} />
          </div>
          <div><label style={lbl}>詳細説明</label><textarea style={{ ...inp, minHeight: "80px", resize: "vertical" } as React.CSSProperties} placeholder="参加者へのメッセージ..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><label style={lbl}>参加定員</label><input style={inp} type="number" min="1" placeholder="空欄 = 無制限" value={form.max_members} onChange={e => setForm(f => ({ ...f, max_members: e.target.value }))} /></div>
            <div><label style={lbl}>スタジオ代（円・合計）</label><input style={inp} type="number" min="0" placeholder="例: 6000" value={form.studio_fee} onChange={e => setForm(f => ({ ...f, studio_fee: e.target.value }))} /></div>
          </div>
          <button onClick={() => setIsPrivate(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", cursor: "pointer", textAlign: "left" }}>
            <div><div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", fontWeight: "bold" }}>🔒 フォロワー限定</div><div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginTop: "3px" }}>ONにするとフォロワーにのみ表示されます</div></div>
            <div style={{ width: "44px", height: "26px", borderRadius: "13px", background: isPrivate ? "#DC2626" : "rgba(255,255,255,0.16)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}><div style={{ position: "absolute", top: "3px", left: isPrivate ? "21px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)", transition: "left 0.2s" }} /></div>
          </button>
          <button onClick={() => setRequiresApproval(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", cursor: "pointer", textAlign: "left" }}>
            <div><div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", fontWeight: "bold" }}>📋 参加承認制</div><div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginTop: "3px" }}>ONにすると参加に主催者の承認が必要になります</div></div>
            <div style={{ width: "44px", height: "26px", borderRadius: "13px", background: requiresApproval ? "#DC2626" : "rgba(255,255,255,0.16)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}><div style={{ position: "absolute", top: "3px", left: requiresApproval ? "21px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)", transition: "left 0.2s" }} /></div>
          </button>
          <button onClick={handleSubmit} disabled={loading} className={canPost ? "bd-spray" : undefined} style={{ width: "100%", padding: "20px 14px", border: "none", borderRadius: "6px", background: canPost ? "linear-gradient(135deg, #DC2626, #A61B1B)" : "rgba(255,255,255,0.08)", color: canPost ? "#fff" : "rgba(255,255,255,0.3)", fontSize: "15px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.15em", cursor: canPost ? "pointer" : "not-allowed", opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <Zap size={15} />
            {loading ? "投稿中..." : "サイファーを投稿する"}
          </button>
        </>) : (<>
          <div><label style={lbl}>最寄り駅 <span style={{ color: plAccent }}>*</span></label><StationSearch value={plForm.station} onChange={v => setPlForm(f => ({ ...f, station: v }))} inputStyle={inp} /></div>
          <div><label style={lbl}>会場・スタジオ名・部屋番号</label><input style={inp} placeholder="例: Buzz渋谷 3号室、代々木worcle Aスタジオ" value={plForm.studio} onChange={e => setPlForm(f => ({ ...f, studio: e.target.value }))} /></div>
          <div><label style={lbl}>日付 <span style={{ color: plAccent }}>*</span></label>
            <div style={{ display: "flex" }}><input type="date" style={{ ...inp, flex: 1 }} min={todayStr()} value={plForm.date} onChange={e => { const v = e.target.value; if (v && v < todayStr()) return; setPlForm(f => ({ ...f, date: v })); }} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><label style={lbl}>開始時間</label>
              <select style={inp} value={plForm.start_time} onChange={e => setPlForm(f => ({ ...f, start_time: e.target.value }))}>
                {START_TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={lbl}>終了時間</label>
              <select style={inp} value={plForm.end_time} onChange={e => setPlForm(f => ({ ...f, end_time: e.target.value }))}>
                <option value="">未設定</option>
                {endTimeOptions(plForm.start_time).map(t => <option key={t} value={t}>{endTimeLabel(t, plForm.start_time)}</option>)}
              </select>
            </div>
          </div>
          <div><label style={lbl}>{plNoun}名 <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "8px" }}>任意</span></label><input style={inp} placeholder="空欄の場合は開催場所がタイトルになります" value={plForm.title} onChange={e => setPlForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div>
            <label style={lbl}>画像 <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "8px" }}>任意・最大{MAX_POST_IMAGES}枚</span></label>
            {plImagePreviews.length > 0 && (
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginBottom: "8px" }}>
                {plImagePreviews.map((src, i) => (
                  <div key={i} style={{ position: "relative", flexShrink: 0, width: "84px", borderRadius: "8px", overflow: "hidden" }}>
                    <img src={src} alt="" style={{ width: "84px", aspectRatio: "3 / 4", objectFit: "cover", display: "block" }} />
                    <button onClick={() => removePlImageAt(i)} style={{ position: "absolute", top: "4px", right: "4px", width: "22px", height: "22px", borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {plImagePreviews.length < MAX_POST_IMAGES && (
              <label style={{ width: "100%", padding: "10px", border: `1px dashed ${plAccent}80`, borderRadius: "6px", background: "transparent", color: plAccent, fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", boxSizing: "border-box" }}>
                <Camera size={12} /> 画像を追加
                <input type="file" accept="image/*" multiple onChange={handlePlImagesSelect} style={{ display: "none" }} />
                </label>
              )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isEvent ? "1fr" : "1fr 1fr", gap: "10px" }}>
            <div><label style={lbl}>{isEvent ? "参加費（円）" : "料金（円）"}</label><input style={inp} type="number" min="0" placeholder="例: 3000" value={plForm.price} onChange={e => setPlForm(f => ({ ...f, price: e.target.value }))} /></div>
            {!isEvent && <div><label style={lbl}>対象レベル</label>
              <select style={inp} value={plForm.target_level} onChange={e => setPlForm(f => ({ ...f, target_level: e.target.value }))}>
                <option value="all">全レベル</option>
                <option value="beginner">初心者</option>
                <option value="intermediate">中級者</option>
                <option value="advanced">上級者</option>
              </select>
            </div>}
          </div>
          <div><label style={lbl}>ジャンル</label>
            <GenreStrip value={plForm.genres[0] ?? ""} onChange={togglePlGenre} genres={EXTENDED_GENRES} />
          </div>
          <div><label style={lbl}>詳細説明</label><textarea style={{ ...inp, minHeight: "80px", resize: "vertical" } as React.CSSProperties} placeholder={isEvent ? "イベント内容、持ち物など..." : "レッスン内容、持ち物など..."} value={plForm.description} onChange={e => setPlForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div><label style={lbl}>定員</label><input style={inp} type="number" min="1" placeholder="空欄 = 無制限" value={plForm.max_members} onChange={e => setPlForm(f => ({ ...f, max_members: e.target.value }))} /></div>
          {isEvent && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {STAFF_ROLES.map(role => (
                <StaffRoleEditor key={role} role={role} entries={staffByRole[role]}
                  onChange={next => setStaffByRole(s => ({ ...s, [role]: next }))} following={following} />
              ))}
            </div>
          )}
          <button onClick={() => setPlIsPrivate(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", cursor: "pointer", textAlign: "left" }}>
            <div><div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", fontWeight: "bold" }}>🔒 フォロワー限定</div><div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginTop: "3px" }}>ONにするとフォロワーにのみ表示されます</div></div>
            <div style={{ width: "44px", height: "26px", borderRadius: "13px", background: plIsPrivate ? plAccent : "rgba(255,255,255,0.16)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}><div style={{ position: "absolute", top: "3px", left: plIsPrivate ? "21px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)", transition: "left 0.2s" }} /></div>
          </button>
          <button onClick={() => setPlRequiresApproval(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", cursor: "pointer", textAlign: "left" }}>
            <div><div style={{ fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", fontWeight: "bold" }}>📋 申込承認制</div><div style={{ fontSize: "10px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.5)", marginTop: "3px" }}>ONにすると申込に{isEvent ? "主催者" : "講師"}の承認が必要になります</div></div>
            <div style={{ width: "44px", height: "26px", borderRadius: "13px", background: plRequiresApproval ? plAccent : "rgba(255,255,255,0.16)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}><div style={{ position: "absolute", top: "3px", left: plRequiresApproval ? "21px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)", transition: "left 0.2s" }} /></div>
          </button>
          <button onClick={handleSubmitPL} disabled={loading} className={canPostPL ? "bd-spray" : undefined} style={{ width: "100%", padding: "20px 14px", border: "none", borderRadius: "6px", background: canPostPL ? plAccentGradient : "rgba(255,255,255,0.08)", color: canPostPL ? onPlAccent : "rgba(255,255,255,0.3)", fontSize: "15px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.15em", cursor: canPostPL ? "pointer" : "not-allowed", opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <BookOpen size={15} />
            {loading ? "投稿中..." : `${plNoun}を投稿する`}
          </button>
        </>)}
        {/* 浮き島の下部ナビに隠れないための余白。投稿するボタンが際どく隠れて
            見えることがあったので、他画面より少し多めに取る */}
        <div style={{ height: "110px" }} />
      </div>
    </div>
  );
}
