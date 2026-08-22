"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { X, Check, ZoomIn } from "lucide-react";

// アバター画像の丸枠に入る範囲をドラッグ・ズームで選べるクロップUI。
// 出力は正方形の画像（実際の円形マスクは表示側のborderRadius:50%に任せる）
const VIEWPORT = 260; // 表示上の枠のサイズ(px)
const OUTPUT = 600; // 書き出す画像の一辺のサイズ(px)。高解像度の端末でも荒れないように大きめにする

export function AvatarCropper({ file, onCancel, onConfirm }: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // 画像全体がVIEWPORTを覆う最小の拡大率（これ未満に縮小すると枠内に隙間ができてしまう）
  const baseScale = natural ? Math.max(VIEWPORT / natural.w, VIEWPORT / natural.h) : 1;
  const scale = baseScale * zoom;
  const dispW = (natural?.w ?? 0) * scale;
  const dispH = (natural?.h ?? 0) * scale;

  // ドラッグで画像を動かしすぎて枠の外に空白ができないようclampする
  const clamp = useCallback((x: number, y: number, w: number, h: number) => {
    const maxX = Math.max(0, (w - VIEWPORT) / 2);
    const maxY = Math.max(0, (h - VIEWPORT) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, offsetX: offset.x, offsetY: offset.y };
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    const start = dragRef.current;
    if (!start) return;
    const next = clamp(start.offsetX + (e.clientX - start.x), start.offsetY + (e.clientY - start.y), dispW, dispH);
    setOffset(next);
  };
  const handlePointerUp = () => { dragRef.current = null; };

  const handleZoomChange = (z: number) => {
    setZoom(z);
    if (!natural) return;
    const s = baseScale * z;
    setOffset(o => clamp(o.x, o.y, natural.w * s, natural.h * s));
  };

  const handleConfirm = () => {
    if (!natural || !imgRef.current) return;
    setSaving(true);
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setSaving(false); return; }
    const ratio = OUTPUT / VIEWPORT;
    const outW = dispW * ratio;
    const outH = dispH * ratio;
    const outLeft = (VIEWPORT / 2 - dispW / 2 + offset.x) * ratio;
    const outTop = (VIEWPORT / 2 - dispH / 2 + offset.y) * ratio;
    ctx.drawImage(imgRef.current, outLeft, outTop, outW, outH);
    canvas.toBlob(blob => {
      setSaving(false);
      if (blob) onConfirm(blob);
    }, "image/jpeg", 0.92);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ background: "#141414", borderRadius: "16px", padding: "20px", width: "100%", maxWidth: "320px", textAlign: "center" }}>
        <div style={{ fontSize: "9px", fontFamily: "'Noto Sans JP',sans-serif", color: "#F0F0F0", letterSpacing: "0.15em", marginBottom: "14px" }}>写真の範囲を選ぶ</div>

        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ position: "relative", width: `${VIEWPORT}px`, height: `${VIEWPORT}px`, margin: "0 auto", borderRadius: "12px", overflow: "hidden", background: "#000", touchAction: "none", cursor: "grab" }}
        >
          {imgUrl && !loadError && (
            <img
              ref={imgRef}
              src={imgUrl}
              alt=""
              draggable={false}
              onLoad={e => setNatural(n => n ?? { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              onError={() => setLoadError(true)}
              style={{ position: "absolute", left: `${VIEWPORT / 2 - dispW / 2 + offset.x}px`, top: `${VIEWPORT / 2 - dispH / 2 + offset.y}px`, width: natural ? `${dispW}px` : "auto", height: natural ? `${dispH}px` : "auto", maxWidth: "none", pointerEvents: "none", userSelect: "none" }}
            />
          )}
          {loadError && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", textAlign: "center", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", color: "rgba(255,255,255,0.6)" }}>
              この画像は読み込めませんでした。別の写真をお試しください
            </div>
          )}
          {/* 実際に円形で保存されるイメージが分かるよう、四隅を暗くして丸いガイドを見せる */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: `0 0 0 ${VIEWPORT}px rgba(0,0,0,0.55)`, borderRadius: "50%" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "16px" }}>
          <ZoomIn size={14} color="rgba(255,255,255,0.5)" />
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => handleZoomChange(Number(e.target.value))}
            style={{ flex: 1, accentColor: "#DC2626" }} />
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
          <button onClick={onCancel} disabled={saving}
            style={{ flex: 1, padding: "12px", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "8px", background: "none", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px", color: "#F0F0F0", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <X size={14} /> キャンセル
          </button>
          <button onClick={handleConfirm} disabled={saving || !natural}
            style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", background: "#DC2626", cursor: "pointer", fontFamily: "'Noto Sans JP',sans-serif", fontSize: "12px", color: "#fff", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", opacity: saving ? 0.6 : 1 }}>
            <Check size={14} /> {saving ? "処理中..." : "この範囲で保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
