"use client";
import { use, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { PublicProfileScreen } from "../../components/PublicProfileScreen";
import { Loading } from "../../components/Loading";

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
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Loading size={56} />
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
