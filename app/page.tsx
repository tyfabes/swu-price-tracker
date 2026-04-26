import Link from "next/link";
import Logo from "@/app/components/Logo";

const features = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Real-Time Prices",
    body: "Prices pulled directly from TCGPlayer and refreshed daily so you always know what cards are actually selling for.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
      </svg>
    ),
    title: "Price Alerts",
    body: "Set a target price on any card and get an email the moment it drops below your threshold — never miss a deal again.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: "Every Set Covered",
    body: "From Spark of Rebellion to the latest expansion — search across all Star Wars Unlimited sets with a single query.",
  },
];

export default function Landing() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      color: "var(--text)",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        top: "-80px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "900px",
        height: "600px",
        background: "radial-gradient(ellipse, rgba(232,192,58,0.07) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      {/* Hero */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "60px 24px 80px",
        position: "relative",
      }}>

        {/* Logo */}
        <div style={{ marginBottom: "6px" }}>
          <Logo height={220} />
        </div>

        {/* Wordmark */}
        <h1 style={{
          fontSize: "clamp(48px, 8vw, 80px)",
          fontWeight: 900,
          letterSpacing: "-0.03em",
          color: "var(--text)",
          margin: "0 0 14px",
          lineHeight: 1,
        }}>
          SWUtopia
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: "clamp(12px, 2vw, 14px)",
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--amber)",
          margin: "0 0 28px",
        }}>
          The Premier Star Wars Unlimited Price Tracker
        </p>

        {/* Description */}
        <p style={{
          fontSize: "16px",
          color: "var(--text-2)",
          lineHeight: 1.75,
          maxWidth: "540px",
          margin: "0 auto 48px",
        }}>
          Built exclusively for Star Wars Unlimited players. Track card prices across every set,
          set custom price targets, and get alerted the moment a card hits your budget —
          so you can build your decks and complete your collection at the best possible price.
        </p>

        {/* CTA */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            href="/app"
            style={{
              display: "inline-block",
              padding: "14px 44px",
              background: "var(--amber)",
              color: "#000",
              fontWeight: 800,
              fontSize: "13px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              borderRadius: "4px",
              textDecoration: "none",
            }}
          >
            Start Tracking
          </Link>
          <Link
            href="/app"
            style={{
              display: "inline-block",
              padding: "14px 32px",
              background: "none",
              color: "var(--text-2)",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              borderRadius: "4px",
              textDecoration: "none",
              border: "1px solid var(--border)",
            }}
          >
            Sign In
          </Link>
        </div>
      </main>

      {/* Feature cards */}
      <section style={{
        width: "100%",
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "0 24px 80px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "16px",
      }}>
        {features.map((f) => (
          <div
            key={f.title}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "24px",
            }}
          >
            <div style={{
              width: "36px",
              height: "36px",
              background: "var(--amber-dim)",
              border: "1px solid rgba(232,192,58,0.2)",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--amber)",
              marginBottom: "14px",
            }}>
              {f.icon}
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>
              {f.title}
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.65 }}>
              {f.body}
            </div>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid var(--border)",
        padding: "14px 24px",
        background: "var(--surface)",
        textAlign: "center",
      }}>
        <span style={{ fontSize: "11px", color: "var(--muted)" }}>
          SWUtopia · Prices refreshed daily
        </span>
      </footer>
    </div>
  );
}
