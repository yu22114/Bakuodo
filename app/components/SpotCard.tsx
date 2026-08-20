"use client";
import { useState, useEffect } from "react";
import { MapPin, LogIn, LogOut, Navigation } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { SPOT_CHECKIN_HOURS, calcDistanceM } from "../lib/constants";

type Checkin = {
  id: string;
  profile_id: string;
  checked_in_at: string;
  profiles: { dancer_name: string; avatar_url: string | null } | null;
};

type Spot = {
  id: string;
  name: string;
  location: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
};

// スポットの背景写真。public/ に置いた「〇〇.jpg」の〇〇の部分。
// スポット名にこの文字が含まれていたらその写真を敷く。
// 一致しないスポット（溝口駅など）は写真なしの白いカードのまま
const SPOT_PHOTOS = ["安田", "湘南台", "横浜", "中野", "代々木"];

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

export function SpotCard({ spot, user, userLocation, onViewProfile }: {
  spot: Spot;
  user: SupabaseUser;
  userLocation: { lat: number; lng: number } | null;
  onViewProfile: (id: string) => void;
}) {
  const photo = SPOT_PHOTOS.find(k => spot.name.includes(k));
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const cutoff = new Date(Date.now() - SPOT_CHECKIN_HOURS * 60 * 60 * 1000).toISOString();
  const isCheckedIn = checkins.some(c => c.profile_id === user.id);

  // スポットまでの距離（表示のみ。チェックインの可否には使わない）
  const distance = (userLocation && spot.latitude && spot.longitude)
    ? calcDistanceM(userLocation.lat, userLocation.lng, spot.latitude, spot.longitude)
    : null;

  useEffect(() => {
    fetchCheckins();
  }, [spot.id]);

  async function fetchCheckins() {
    const { data } = await supabase
      .from("spot_checkins")
      .select("id, profile_id, checked_in_at, profiles:profile_id(dancer_name, avatar_url)")
      .eq("spot_id", spot.id)
      .gte("checked_in_at", cutoff)
      .order("checked_in_at", { ascending: false });
    setCheckins((data ?? []) as unknown as Checkin[]);
    setLoading(false);
  }

  // 距離での足止めは一時的にオフ（「近くにいない人が押せる」ことより、
  // 気軽にチェックインできる方を優先する判断）。SPOT_CHECKIN_RADIUS_Mは
  // 再度必要になった時のために残してある
  const handleCheckin = async () => {
    setActing(true);
    if (isCheckedIn) {
      await supabase.from("spot_checkins").delete().eq("spot_id", spot.id).eq("profile_id", user.id);
    } else {
      await supabase.from("spot_checkins").delete().eq("spot_id", spot.id).eq("profile_id", user.id);
      await supabase.from("spot_checkins").insert({ spot_id: spot.id, profile_id: user.id });
    }
    await fetchCheckins();
    setActing(false);
  };

  return (
    // 写真の上に白をかぶせて、文字が読める濃さまで薄めている
    <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderLeft: `3px solid ${checkins.length > 0 ? "#16A34A" : "rgba(255,255,255,0.15)"}`, borderRadius: "10px", overflow: "hidden", transition: "border-left-color 0.3s",
      backgroundImage: photo ? `linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.86)), url(/${encodeURIComponent(photo)}.jpg)` : undefined,
      backgroundSize: "cover", backgroundPosition: "center" }}>
      <div style={{ padding: "14px 16px 12px", borderBottom: checkins.length > 0 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            {distance !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#16A34A", background: "rgba(22,163,74,0.08)", padding: "1px 6px", borderRadius: "8px" }}>
                  <Navigation size={8} /> {formatDistance(distance)}
                </span>
              </div>
            )}
            <div style={{ fontSize: "18px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", letterSpacing: "0.05em", lineHeight: 1.1 }}>{spot.name}</div>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.location)}`} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "4px", textDecoration: "none" }}>
              <MapPin size={10} color="rgba(255,255,255,0.4)" />
              <span style={{ fontSize: "10px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", textDecoration: "underline dotted", textUnderlineOffset: "2px" }}>{spot.location}</span>
            </a>
            {spot.description && (
              <div style={{ fontSize: "11px", color: "#F0F0F0", marginTop: "4px", lineHeight: 1.5 }}>{spot.description}</div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            <div style={{ fontSize: "28px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: checkins.length > 0 ? "#FF3D00" : "rgba(255,255,255,0.25)", lineHeight: 1 }}>
              {loading ? "-" : checkins.length}
            </div>
            <div style={{ fontSize: "8px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.1em" }}>NOW</div>
          </div>
        </div>

        <button onClick={handleCheckin} disabled={acting}
          style={{ marginTop: "12px", width: "100%", padding: "10px", border: "none", borderRadius: "6px", background: isCheckedIn ? "rgba(22,163,74,0.1)" : "#FF3D00", color: isCheckedIn ? "#16A34A" : "#fff", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, letterSpacing: "0.12em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", opacity: acting ? 0.6 : 1, transition: "all 0.2s" }}>
          {isCheckedIn
            ? <><LogOut size={13} /> 帰る（チェックアウト）</>
            : <><LogIn size={13} /> ここにいる！（チェックイン）</>}
        </button>
      </div>

      {!loading && checkins.length > 0 && (
        <div style={{ padding: "10px 16px 12px" }}>
          <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.12em", marginBottom: "8px" }}>
            TODAY'S CREW ({checkins.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {checkins.map(c => {
              const name = c.profiles?.dancer_name ?? "?";
              const avatar = c.profiles?.avatar_url;
              const isMe = c.profile_id === user.id;
              return (
                <button key={c.id} onClick={() => onViewProfile(c.profile_id)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "50%", overflow: "hidden", background: isMe ? "linear-gradient(135deg,#FF3D00,#FF6D00)" : "rgba(255,255,255,0.1)", border: isMe ? "2px solid #FF3D00" : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: isMe ? "#fff" : "rgba(255,255,255,0.5)", flexShrink: 0 }}>
                    {avatar
                      ? <img src={avatar} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span style={{ fontSize: "8px", fontFamily: "'Noto Sans JP',sans-serif", color: isMe ? "#FF3D00" : "rgba(255,255,255,0.5)", maxWidth: "40px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {isMe ? "YOU" : name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
