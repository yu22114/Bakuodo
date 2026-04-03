"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Cypher } from "../lib/types";
import { LoginScreen } from "./screens/LoginScreen";
import { TopScreen } from "./screens/TopScreen";
import { PostScreen } from "./screens/PostScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { BottomNav } from "./components/BottomNav";
import { DetailModal } from "./components/DetailModal";

export default function BakuOdori() {
  const [screen, setScreen] = useState("top");
  const [joined, setJoined] = useState<string[]>([]);
  const [detail, setDetail] = useState<Cypher | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

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

      <div style={{ maxWidth: "480px", margin: "0 auto", minHeight: "100vh", background: "#0a0a0a" }}>
        {authLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "24px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em" }}>LOADING...</div>
          </div>
        ) : !user ? (
          <LoginScreen />
        ) : (
          <>
            {screen === "top"     && <TopScreen onNav={setScreen} joined={joined} onJoin={handleJoin} onCardClick={setDetail} user={user} />}
            {screen === "post"    && <PostScreen onNav={setScreen} user={user} />}
            {screen === "profile" && <ProfileScreen user={user} />}
            <BottomNav current={screen} onNav={setScreen} />
            {detail && <DetailModal cypher={detail} onClose={() => setDetail(null)} joined={joined.includes(detail.id)} onJoin={handleJoin} />}
          </>
        )}
      </div>
    </>
  );
}
