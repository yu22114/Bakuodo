import { Flame, Plus, User } from "lucide-react";

export function BottomNav({ current, onNav }: { current: string; onNav: (s: string) => void }) {
  const items = [
    { id: "top", icon: <Flame size={20} />, label: "CYPHER" },
    { id: "post", icon: <Plus size={20} />, label: "POST" },
    { id: "profile", icon: <User size={20} />, label: "ME" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(10,10,10,0.95)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", zIndex: 50, maxWidth: "480px", margin: "0 auto" }}>
      {items.map(item => (
        <button key={item.id} onClick={() => onNav(item.id)} style={{ flex: 1, padding: "12px 0 10px", border: "none", background: "transparent", color: current === item.id ? "#FF3D00" : "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
          {item.id === "post" ? (
            <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(255,61,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "-20px", boxShadow: "0 0 20px rgba(255,61,0,0.5)", border: "3px solid #0a0a0a" }}><Plus size={20} color="#fff" /></div>
          ) : item.icon}
          <span style={{ fontSize: "8px", fontFamily: "'Space Mono',monospace", letterSpacing: "0.1em" }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
