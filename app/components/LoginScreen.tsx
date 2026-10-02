"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Logo } from "./Logo";
import { showToast } from "./Toast";

export function LoginScreen() {
  const [loading, setLoading] = useState(false);
  // メール登録・ログインの切り替えと入力欄
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // 新規登録後、メール確認が必要な設定（Supabase側のデフォルト）だとまだセッションが無いので、
  // その旨を案内するために出す
  const [signupSent, setSignupSent] = useState(false);
  // iPhoneアプリの中かどうか。「Appleでサインイン」はアプリの中だけに出す
  // （Googleログインがあるアプリには、Appleの審査ルールでAppleのログインも必要なため）
  const [isNative, setIsNative] = useState(false);
  useEffect(() => {
    import("@capacitor/core").then(({ Capacitor }) => setIsNative(Capacitor.isNativePlatform())).catch(() => {});
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    // iPhoneアプリの中では、Googleがアプリ内画面でのログインを禁止しているため
    // Safariの画面を開いてログインしてもらう。終わるとアプリに戻り、page.tsx側で受け取る
    // 判定に失敗しても、Webでは今まで通りのログインに進めるようにしておく
    let isNative = false;
    try { isNative = (await import("@capacitor/core")).Capacitor.isNativePlatform(); } catch {}
    if (isNative) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: "com.bakuodo.app://login-callback", skipBrowserRedirect: true },
      });
      setLoading(false);
      if (error || !data.url) { showToast("ログインを開始できませんでした"); return; }
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: data.url });
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: typeof window !== "undefined" ? window.location.origin : "" },
    });
  };

  // Appleでサインイン（iPhoneアプリのみ）。iPhone標準のApple ID確認画面が出て、
  // 受け取った証明書（identityToken）をSupabaseに渡してログインする。
  // なりすまし防止の合言葉（nonce）は、Appleにはハッシュ化したもの、Supabaseには元のものを渡す決まり
  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      const rawNonce = crypto.randomUUID();
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawNonce));
      const hashedNonce = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
      const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
      const res = await SignInWithApple.authorize({ clientId: "com.bakuodo.app", redirectURI: "", scopes: "email name", nonce: hashedNonce });
      const { error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: res.response.identityToken, nonce: rawNonce });
      if (error) showToast(`ログインに失敗しました: ${error.message}`);
    } catch (e) {
      // Apple IDの確認画面でキャンセルした時（エラー番号1001）は何も出さない。それ以外は原因を出す
      const message = e instanceof Error ? e.message : String(e);
      if (!message.includes("1001")) showToast(`Appleでサインインできませんでした: ${message}`);
    }
    setLoading(false);
  };

  // メールアドレス・パスワードでの登録／ログイン。成功時（確認メール不要な設定、または
  // 既存ログイン）はSupabaseがセッションを発行し、page.tsx側のonAuthStateChangeが検知して
  // 自動的にホーム画面へ進む。ここでは画面遷移を自分ではしない
  const handleEmailAuth = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) { showToast("メールアドレスとパスワードを入力してください"); return; }
    if (mode === "signup" && password.length < 6) { showToast("パスワードは6文字以上にしてください"); return; }
    setSubmitting(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email: trimmedEmail, password });
      setSubmitting(false);
      if (error) { showToast(`登録に失敗しました: ${error.message}`); return; }
      if (!data.session) setSignupSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      setSubmitting(false);
      if (error) { showToast(`ログインに失敗しました: ${error.message}`); return; }
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", background: "#000000" }}>
      <div style={{ marginBottom: "48px", textAlign: "center" }}>
        <h1 style={{ margin: 0, lineHeight: 0 }}><Logo size={132} /></h1>
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#F0F0F0", fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: "0.1em" }}>今日、ここで、踊ろう。</p>
      </div>
      {isNative && (
        <button onClick={handleAppleLogin} disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 24px", marginBottom: "12px", background: "#FFFFFF", border: "none", borderRadius: "6px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontSize: "14px", fontFamily: "-apple-system, 'Noto Sans JP', sans-serif", fontWeight: "bold", color: "#000000", width: "100%", maxWidth: "320px", justifyContent: "center" }}>
          {/* Appleのロゴ（Appleのデザインルールに合わせ、白地に黒） */}
          <svg width="16" height="18" viewBox="0 0 814 1000" fill="#000000"><path d="M788 341c-6 4-108 62-108 190 0 148 130 200 134 201-1 3-21 72-69 142-43 62-88 124-156 124s-86-40-165-40c-77 0-104 41-167 41s-106-57-156-128C44 790 0 669 0 555c0-184 120-282 238-282 63 0 115 41 155 41 38 0 97-44 169-44 27 0 126 3 191 71zM554 170c30-35 51-84 51-133 0-7-1-14-2-19-48 2-106 32-140 73-27 31-53 80-53 130 0 8 1 15 2 18 3 1 9 2 14 2 44 0 99-29 128-71z"/></svg>
          Appleでサインイン
        </button>
      )}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 24px", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.15)", borderRadius: "6px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontSize: "14px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold", color: "#111111", width: "100%", maxWidth: "320px", justifyContent: "center", transition: "all 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
          <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
          <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" />
          <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
        </svg>
        {loading ? "ログイン中..." : "Googleでログイン"}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", maxWidth: "320px", margin: "20px 0" }}>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.15)" }} />
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "'Noto Sans JP',sans-serif" }}>または</span>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.15)" }} />
      </div>

      {signupSent ? (
        <div style={{ width: "100%", maxWidth: "320px", padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "8px", color: "#F0F0F0", fontSize: "12px", fontFamily: "'Noto Sans JP',sans-serif", lineHeight: 1.7, textAlign: "center" }}>
          確認メールを送信しました。<br />メール内のリンクを開いてからログインしてください。
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: "320px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <input type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" autoComplete="email" placeholder="メールアドレス" value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: "100%", padding: "12px 14px", background: "#141414", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "6px", color: "#F0F0F0", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
          <input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="パスワード（6文字以上）" value={password} onChange={e => setPassword(e.target.value)}
            style={{ width: "100%", padding: "12px 14px", background: "#141414", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "6px", color: "#F0F0F0", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", outline: "none", boxSizing: "border-box" }} />
          <button onClick={handleEmailAuth} disabled={submitting}
            style={{ width: "100%", padding: "12px", background: "#DC2626", border: "none", borderRadius: "6px", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, color: "#fff", fontSize: "13px", fontFamily: "'Noto Sans JP',sans-serif", fontWeight: "bold" }}>
            {submitting ? "処理中..." : mode === "signup" ? "メールアドレスで登録" : "メールアドレスでログイン"}
          </button>
          <button onClick={() => setMode(m => m === "signup" ? "login" : "signup")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: "11px", fontFamily: "'Noto Sans JP',sans-serif", padding: "4px", textDecoration: "underline", textUnderlineOffset: "2px" }}>
            {mode === "signup" ? "アカウントをお持ちの方はログイン" : "アカウントをお持ちでない方は新規登録"}
          </button>
        </div>
      )}

      <p style={{ marginTop: "24px", fontSize: "12px", color: "rgba(255,255,255,0.6)", fontFamily: "'Noto Sans JP',sans-serif", textAlign: "center", lineHeight: 1.8 }}>
        ログインすることで<a href="/terms" style={{ color: "#DC2626", textDecoration: "underline" }}>利用規約</a>に<br />同意したものとみなします
      </p>
    </div>
  );
}
