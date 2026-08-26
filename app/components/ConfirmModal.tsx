"use client";

export function ConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderRadius: "12px", padding: "28px 24px", maxWidth: "300px", width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
        <p style={{ margin: "0 0 8px", fontSize: "18px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: 700, color: "#F0F0F0", letterSpacing: "0.05em" }}>キャンセルしますか？</p>
        <p style={{ margin: "0 0 24px", fontSize: "12px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", lineHeight: 1.7 }}>参加をキャンセルします。<br />本当によろしいですか？</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "11px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "6px", background: "transparent", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer" }}>戻る</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "11px", border: "none", borderRadius: "6px", background: "linear-gradient(135deg, #DC2626, #A61B1B)", color: "#fff", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", cursor: "pointer", fontWeight: "bold" }}>キャンセルする</button>
        </div>
      </div>
    </div>
  );
}
