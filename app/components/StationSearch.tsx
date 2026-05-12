"use client";
import { useState, useEffect } from "react";

export function StationSearch({ value, onChange, inputStyle }: { value: string; onChange: (v: string) => void; inputStyle: React.CSSProperties }) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!value.trim()) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/stations?q=${encodeURIComponent(value)}`);
      const data: string[] = await res.json();
      setSuggestions(data);
      setOpen(data.length > 0);
    }, 250);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div style={{ position: "relative" }}>
      <input style={inputStyle} placeholder="例: 渋谷、新宿" value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && suggestions.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 50, overflow: "hidden" }}>
          {suggestions.map(s => (
            <button key={s} onMouseDown={() => { onChange(s); setOpen(false); }}
              style={{ width: "100%", padding: "10px 12px", background: "none", border: "none", textAlign: "left", cursor: "pointer", fontSize: "13px", fontFamily: "'Space Mono',monospace", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              {s}駅
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
