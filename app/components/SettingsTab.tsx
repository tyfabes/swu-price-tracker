"use client";

import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Props = {
  user: User;
  onSignOut: () => void;
};

export default function SettingsTab({ user, onSignOut }: Props) {
  async function handleSignOut() {
    await supabaseBrowser().auth.signOut();
    onSignOut();
  }

  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const card: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    padding: "20px",
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--muted)",
    marginBottom: "12px",
  };

  const fieldLabel: React.CSSProperties = {
    fontSize: "10px",
    color: "var(--muted)",
    marginBottom: "3px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  return (
    <section style={{ padding: "28px 0", maxWidth: "480px" }}>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>Settings</div>
        <div style={{ fontSize: "13px", color: "var(--muted)" }}>Your account and alert preferences.</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={card}>
          <div style={sectionLabel}>Account</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <div style={fieldLabel}>Email</div>
              <div style={{ fontSize: "13px", color: "var(--text)" }}>{user.email}</div>
            </div>
            <div>
              <div style={fieldLabel}>Member since</div>
              <div style={{ fontSize: "13px", color: "var(--text-2)" }}>{memberSince}</div>
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={sectionLabel}>Price Alerts</div>
          <div style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.6 }}>
            Alerts are sent to{" "}
            <strong style={{ color: "var(--text)" }}>{user.email}</strong>{" "}
            when a tracked card reaches your target price. Use the bell icon in the Watchlist tab to mute individual cards.
          </div>
        </div>

        <div>
          <button
            onClick={handleSignOut}
            className="ghost-btn"
            style={{ color: "var(--red)", borderColor: "rgba(248,113,113,0.25)" }}
          >
            Sign out
          </button>
        </div>
      </div>
    </section>
  );
}
