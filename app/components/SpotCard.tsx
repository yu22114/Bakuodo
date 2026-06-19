"use client";
import { useState, useEffect } from "react";
import { MapPin, LogIn, LogOut, Navigation } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { SPOT_CHECKIN_HOURS, SPOT_CHECKIN_RADIUS_M, calcDistanceM } from "../lib/constants";

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
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [locationError, setLocationError] = useState("");

  const cutoff = new Date(Date.now() - SPOT_CHECKIN_HOURS * 60 * 60 * 1000).toISOString();
  const isCheckedIn = checkins.some(c => c.profile_id === user.id);

  // スポットまでの距離
  const distance = (userLocation && spot.latitude && spot.longitude)
    ? calcDistanceM(userLocation.lat, userLocation.lng, spot.latitude, spot.longitude)
    : null;

  // 座標が設定されていてユーザー位置もある場合のみ距離チェック
  const tooFar = (spot.latitude && spot.longitude && userLocation)
    ? distance! > SPOT_CHECKIN_RADIUS_M
    : false;

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

  const handleCheckin = async () => {
    setLocationError("");
    // チェックアウトは距離チェック不要
    if (!isCheckedIn && spot.latitude && spot.longitude) {
      if (!userLocation) {
        setLocationError("位置情報を取得できませんでした。ブラウザの位置情報を許可してください。");
        return;
      }
      if (tooFar) {
        setLocationError(`スポットから離れすぎています（${formatDistance(distance!)}）。${SPOT_CHECKIN_RADIUS_M}m以内に近づいてからチェックインしてください。`);
        return;
      }
    }
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
    <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", borderLeft: `3px solid ${checkins.length > 0 ? "#16A34A" : "rgba(0,0,0,0.1)"}`, borderRadius: "10px", overflow: "hidden", transition: "border-left-color 0.3s" }}>
      <div style={{ padding: "14px 16px 12px", borderBottom: checkins.length > 0 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <span style={{ fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.35)", letterSpacing: "0.15em" }}>SPOT</span>
              {distance !== null && (
                <span style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "9px", fontFamily: "'Space Mono',monospace", color: tooFar ? "rgba(0,0,0,0.3)" : "#16A34A", background: tooFar ? "rgba(0,0,0,0.05)" : "rgba(22,163,74,0.08)", padding: "1px 6px", borderRadius: "8px" }}>
                  <Navigation size={8} /> {formatDistance(distance)}
                </span>
              )}
            </div>
            <div style={{ fontSize: "18px", fontFamily: "'Bebas Neue',sans-serif", color: "#111", letterSpacing: "0.05em", lineHeight: 1.1 }}>{spot.name}</div>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.location)}`} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "4px", textDecoration: "none" }}>
              <MapPin size={10} color="rgba(0,0,0,0.35)" />
              <span style={{ fontSize: "10px", color: "rgba(0,0,0,0.45)", fontFamily: "'Space Mono',monospace", textDecoration: "underline dotted", textUnderlineOffset: "2px" }}>{spot.location}</span>
            </a>
            {spot.description && (
              <div style={{ fontSize: "11px", color: "rgba(0,0,0,0.45)", marginTop: "4px", lineHeight: 1.5 }}>{spot.description}</div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            <div style={{ fontSize: "28px", fontFamily: "'Bebas Neue',sans-serif", color: checkins.length > 0 ? "#FF3D00" : "rgba(0,0,0,0.2)", lineHeight: 1 }}>
              {loading ? "-" : checkins.length}
            </div>
            <div style={{ fontSize: "8px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.3)", letterSpacing: "0.1em" }}>NOW</div>
          </div>
        </div>

        {locationError && (
          <div style={{ marginTop: "8px", padding: "8px 10px", background: "rgba(255,61,0,0.06)", border: "1px solid rgba(255,61,0,0.2)", borderRadius: "6px", fontSize: "11px", color: "#FF3D00", fontFamily: "'Space Mono',monospace", lineHeight: 1.5 }}>
            {locationError}
          </div>
        )}

        <button onClick={handleCheckin} disabled={acting}
          style={{ marginTop: "12px", width: "100%", padding: "10px", border: "none", borderRadius: "6px", background: isCheckedIn ? "rgba(22,163,74,0.1)" : tooFar ? "rgba(0,0,0,0.06)" : "#FF3D00", color: isCheckedIn ? "#16A34A" : tooFar ? "rgba(0,0,0,0.3)" : "#fff", fontSize: "12px", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "0.12em", cursor: tooFar && !isCheckedIn ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", opacity: acting ? 0.6 : 1, transition: "all 0.2s" }}>
          {isCheckedIn
            ? <><LogOut size={13} /> 帰る（チェックアウト）</>
            : tooFar
              ? <><MapPin size={13} /> 近くにいないとチェックインできません</>
              : <><LogIn size={13} /> ここにいる！（チェックイン）</>}
        </button>
      </div>

      {!loading && checkins.length > 0 && (
        <div style={{ padding: "10px 16px 12px" }}>
          <div style={{ fontSize: "9px", fontFamily: "'Space Mono',monospace", color: "rgba(0,0,0,0.3)", letterSpacing: "0.12em", marginBottom: "8px" }}>
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
                  <div style={{ width: "38px", height: "38px", borderRadius: "50%", overflow: "hidden", background: isMe ? "linear-gradient(135deg,#FF3D00,#FF6D00)" : "rgba(0,0,0,0.08)", border: isMe ? "2px solid #FF3D00" : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontFamily: "'Bebas Neue',sans-serif", color: isMe ? "#fff" : "rgba(0,0,0,0.45)", flexShrink: 0 }}>
                    {avatar
                      ? <img src={avatar} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span style={{ fontSize: "8px", fontFamily: "'Space Mono',monospace", color: isMe ? "#FF3D00" : "rgba(0,0,0,0.45)", maxWidth: "40px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
