"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

type Props = {
  onSuccess: (user: User) => void;
  onClose: () => void;
};

export default function AuthModal({ onSuccess, onClose }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const sb = supabaseBrowser();

    if (mode === "signin") {
      const { data, error: err } = await sb.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
      else onSuccess(data.user);
    } else {
      const { error: err } = await sb.auth.signUp({ email, password });
      if (err) setError(err.message);
      else setSignupDone(true);
    }
    setLoading(false);
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "8px", padding: "32px",
          width: "100%", maxWidth: "380px", margin: "0 16px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {signupDone ? (
          <>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>Check your email</div>
            <div style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.6 }}>
              We sent a confirmation link to{" "}
              <strong style={{ color: "var(--text-2)" }}>{email}</strong>.
              Click it to activate your account, then sign in.
            </div>
            <button
              onClick={onClose}
              className="ghost-btn"
              style={{ marginTop: "24px", width: "100%", justifyContent: "center", display: "flex" }}
            >
              Done
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
                {mode === "signin" ? "Sign in" : "Create account"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                {mode === "signin"
                  ? "Access your watchlist and price history."
                  : "Start tracking Star Wars Unlimited prices for free."}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div className="form-field">
                  <label className="field-label">Email</label>
                  <input
                    type="email"
                    style={{ padding: "9px 12px" }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-field">
                  <label className="field-label">Password</label>
                  <input
                    type="password"
                    style={{ padding: "9px 12px" }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                {error && (
                  <div style={{
                    padding: "8px 12px",
                    background: "rgba(248,113,113,0.08)",
                    border: "1px solid rgba(248,113,113,0.2)",
                    borderRadius: "3px",
                    fontSize: "12px",
                    color: "var(--red)",
                  }}>
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="submit-btn"
                  style={{ marginTop: "4px" }}
                >
                  {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
                </button>
              </div>
            </form>

            <div style={{ marginTop: "20px", textAlign: "center", fontSize: "12px", color: "var(--muted)" }}>
              {mode === "signin" ? (
                <>
                  No account?{" "}
                  <button
                    onClick={() => { setMode("signup"); setError(null); }}
                    style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", padding: 0, fontSize: "12px" }}
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Have an account?{" "}
                  <button
                    onClick={() => { setMode("signin"); setError(null); }}
                    style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", padding: 0, fontSize: "12px" }}
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
