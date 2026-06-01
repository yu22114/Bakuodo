"use client";
import { use, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { PublicProfileScreen } from "../../components/PublicProfileScreen";

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "'Space Mono',monospace", fontSize: "12px", color: "rgba(0,0,0,0.35)" }}>
        LOADING...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", minHeight: "100vh", background: "#FAFAFA" }}>
      <PublicProfileScreen
        profileId={id}
        currentUserId={currentUserId ?? ""}
      />
    </div>
  );
}
