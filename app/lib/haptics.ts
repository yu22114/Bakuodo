// タップ時の軽い振動（ハプティック）。対応していない端末（iOS Safariなど）では何もしない
export function hapticTap(ms: number = 12) {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
}
