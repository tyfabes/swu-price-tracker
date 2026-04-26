"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { SWU_SETS } from "@/lib/sets";
import Logo from "@/app/components/Logo";
import AuthModal from "@/app/components/AuthModal";
import AddCardForm from "@/app/components/AddCardForm";
import HistoryTab from "@/app/components/HistoryTab";
import SettingsTab from "@/app/components/SettingsTab";
import { supabaseBrowser } from "@/lib/supabase-browser";

type WatchlistEntry = {
  id: string;
  card_name: string;
  set_code: string;
  target_price: number;
  tcgplayer_id: number | null;
  image_url: string | null;
  last_known_price: number | null;
  last_checked_at: string | null;
  last_alerted_at: string | null;
  alerts_enabled: boolean;
};

function tcgPlayerUrl(entry: WatchlistEntry): string {
  if (entry.tcgplayer_id) return `https://www.tcgplayer.com/product/${entry.tcgplayer_id}`;
  return `https://www.tcgplayer.com/search/star-wars-unlimited/product?q=${encodeURIComponent(entry.card_name)}`;
}

type SortCol = "card_name" | "target_price" | "last_known_price" | "delta";
type SortDir = "asc" | "desc";
type Tab = "watchlist" | "add" | "history" | "settings";

function fmt(price: number | null): string {
  if (price === null) return "—";
  return `$${price.toFixed(2)}`;
}

function getDelta(entry: WatchlistEntry): number | null {
  if (entry.last_known_price === null) return null;
  return entry.last_known_price - entry.target_price;
}

function fmtDelta(entry: WatchlistEntry): { text: string; pct: string; color: string } {
  const d = getDelta(entry);
  if (d === null) return { text: "—", pct: "", color: "var(--muted)" };
  const pct = Math.abs(d / entry.target_price) * 100;
  if (d <= 0) {
    return {
      text: d === 0 ? "At target" : `-$${Math.abs(d).toFixed(2)}`,
      pct: `${pct.toFixed(0)}% below`,
      color: "var(--green)",
    };
  }
  return {
    text: `+$${d.toFixed(2)}`,
    pct: `${pct.toFixed(0)}% above`,
    color: pct < 25 ? "var(--amber)" : "var(--muted)",
  };
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
}

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ marginLeft: "3px", opacity: active ? 1 : 0.2, fontSize: "9px" }}>
      {active ? (dir === "asc" ? "▲" : "▼") : "▲"}
    </span>
  );
}

function BellIcon({ on }: { on: boolean }) {
  return on ? (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" opacity={0.4}>
      <path d="M20 18.69L7.84 6.14 5.27 3.49 4 4.76l2.8 2.8v.01c-.52.99-.8 2.16-.8 3.42V16l-2 2v1h13.73l2 2L21 19.72l-1-1.03zM12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6H8.28L18 6.28c-.34-1.12-.99-2.05-1.87-2.71l-1.43 1.44C15.5 5.56 16 6.72 16 8v.04L18 10v1l2 2v2c0 .05 0 .1-.01.14L18 13.14V16z" />
    </svg>
  );
}

export default function Home() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("watchlist");

  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("delta");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  // Auth session management
  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session && (tab === "history" || tab === "settings")) setTab("watchlist");
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const res = await fetch("/api/watchlist");
    setEntries(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    await fetch(`/api/watchlist?id=${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleToggleAlert(id: string, current: boolean) {
    await fetch("/api/watchlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, alerts_enabled: !current }),
    });
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, alerts_enabled: !current } : e));
  }

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshMsg(null);
    const res = await fetch("/api/refresh", { method: "POST" });
    if (res.ok) {
      const { checked, alerts } = await res.json();
      setRefreshMsg(`${checked} checked · ${alerts} alert${alerts !== 1 ? "s" : ""} fired`);
      await load();
    } else {
      setRefreshMsg("Check failed");
    }
    setRefreshing(false);
    setTimeout(() => setRefreshMsg(null), 6000);
  }

  async function handleSignOut() {
    await supabaseBrowser().auth.signOut();
    setUser(null);
    setTab("watchlist");
  }

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const atTargetEntries = entries.filter(
    (e) => e.last_known_price !== null && e.last_known_price <= e.target_price
  );
  const lastChecked = entries.map((e) => e.last_checked_at).filter(Boolean).sort().at(-1) ?? null;
  const setLabel = (slug: string) => SWU_SETS.find((s) => s.slug === slug)?.label ?? slug;

  const displayed = entries
    .filter((e) => e.card_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortCol) {
        case "card_name": av = a.card_name; bv = b.card_name; break;
        case "target_price": av = a.target_price; bv = b.target_price; break;
        case "last_known_price": av = a.last_known_price ?? Infinity; bv = b.last_known_price ?? Infinity; break;
        case "delta": av = getDelta(a) ?? Infinity; bv = getDelta(b) ?? Infinity; break;
      }
      if (typeof av === "string" && typeof bv === "string")
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

  const thClick = (col: SortCol): React.CSSProperties => ({
    padding: "9px 12px 9px 0",
    textAlign: "left",
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.09em",
    textTransform: "uppercase",
    color: sortCol === col ? "var(--text-2)" : "var(--muted)",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    borderBottom: "1px solid var(--border)",
  });

  const thStatic: React.CSSProperties = {
    padding: "9px 12px 9px 0",
    textAlign: "left",
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.09em",
    textTransform: "uppercase",
    color: "var(--muted)",
    whiteSpace: "nowrap",
    borderBottom: "1px solid var(--border)",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--page-bg)" }}>

      {/* ── TOPBAR ── */}
      <div className="topbar">
        <div className="topbar-inner">

          {/* Left: logo + wordmark */}
          <div className="topbar-brand">
            <Link href="/" style={{ display: "flex", lineHeight: 0 }}><Logo height={135} /></Link>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <span style={{
                fontSize: "22px",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1,
                color: "var(--text)",
              }}>
                SWUtopia
              </span>
              <span style={{
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--muted)",
                lineHeight: 1,
              }}>
                Star Wars Unlimited · Price Tracker & Alerts
              </span>
            </div>
          </div>

          {/* Center: nav tabs */}
          <nav className="topbar-nav">
            {(["watchlist", "add"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`nav-tab ${tab === t ? "nav-tab-active" : ""}`}
              >
                {t === "watchlist"
                  ? `Watchlist${entries.length > 0 ? ` (${entries.length})` : ""}`
                  : "Add Card"}
              </button>
            ))}
            <button
              onClick={() => user ? setTab("history") : setShowAuth(true)}
              className={`nav-tab ${tab === "history" ? "nav-tab-active" : ""} ${!user ? "nav-tab-locked" : ""}`}
            >
              History
            </button>
            <button
              onClick={() => user ? setTab("settings") : setShowAuth(true)}
              className={`nav-tab ${tab === "settings" ? "nav-tab-active" : ""} ${!user ? "nav-tab-locked" : ""}`}
            >
              Settings
            </button>
          </nav>

          {/* Right: status + auth + refresh */}
          <div className="topbar-actions">
            {lastChecked && (
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span className="live-dot" />
                <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--font-geist-mono)" }}>
                  {fmtTime(lastChecked)}
                </span>
              </div>
            )}

            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  fontSize: "11px", color: "var(--muted)",
                  maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {user.email}
                </span>
                <button onClick={handleSignOut} className="ghost-btn" style={{ height: "28px", padding: "0 10px", fontSize: "11px" }}>
                  Sign out
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)} className="ghost-btn">
                Sign in
              </button>
            )}

            <button onClick={handleRefresh} disabled={refreshing} className="refresh-btn">
              <span style={{ display: "inline-block", animation: refreshing ? "spin 1s linear infinite" : "none", fontSize: "14px", lineHeight: 1 }}>↻</span>
              {refreshing ? "Checking…" : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* ── PAGE BODY ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="page-container">

          {/* History tab */}
          {tab === "history" && user && <HistoryTab user={user} />}

          {/* Settings tab */}
          {tab === "settings" && user && <SettingsTab user={user} onSignOut={handleSignOut} />}

          {/* Add Card tab */}
          {tab === "add" && (
            <AddCardForm
              onAdded={async () => { await load(); setTab("watchlist"); }}
              onCancel={() => setTab("watchlist")}
            />
          )}

          {/* Watchlist tab */}
          {tab === "watchlist" && (
            <>
              {/* Stats row */}
              <div className="stats-row">
                <div className="stat-pill">
                  <span className="stat-pill-value">{entries.length}</span>
                  <span className="stat-pill-label">Tracked</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-pill-value" style={{ color: atTargetEntries.length > 0 ? "var(--amber)" : "var(--text)" }}>
                    {atTargetEntries.length}
                  </span>
                  <span className="stat-pill-label">At Target</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-pill-value" style={{ fontSize: "13px", color: "var(--text-2)" }}>
                    {lastChecked ? fmtRelative(lastChecked) : "—"}
                  </span>
                  <span className="stat-pill-label">Last Check</span>
                </div>
                {refreshMsg && (
                  <span style={{ fontSize: "11px", color: "var(--green)", fontFamily: "var(--font-geist-mono)", alignSelf: "center", marginLeft: "4px" }}>
                    ✓ {refreshMsg}
                  </span>
                )}
              </div>

              {/* At-target highlights */}
              {!loading && atTargetEntries.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--amber)", marginBottom: "10px" }}>
                    ◆ At Target Price
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {atTargetEntries.map((entry) => {
                      const savings = entry.target_price - (entry.last_known_price ?? 0);
                      return (
                        <div key={entry.id} className="highlight-card">
                          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                            {entry.image_url ? (
                              <img
                                src={entry.image_url}
                                alt={entry.card_name}
                                width={96}
                                height={134}
                                style={{ borderRadius: "3px", flexShrink: 0, objectFit: "cover", display: "block" }}
                                loading="lazy"
                              />
                            ) : (
                              <div style={{ width: 96, height: 134, flexShrink: 0, background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: "3px" }} />
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "3px" }}>{entry.card_name}</div>
                              <div style={{ fontSize: "11px", color: "var(--muted)" }}>{setLabel(entry.set_code)}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                            <span className="price" style={{ fontSize: "22px", fontWeight: 700, color: "var(--green)", lineHeight: 1 }}>{fmt(entry.last_known_price)}</span>
                            {savings > 0 && <span style={{ fontSize: "11px", color: "var(--green)", opacity: 0.7 }}>${savings.toFixed(2)} under</span>}
                          </div>
                          <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border)", fontSize: "11px", color: "var(--muted)" }}>
                            Target: {fmt(entry.target_price)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Toolbar */}
              {!loading && entries.length > 0 && (
                <div className="toolbar">
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      style={{ position: "absolute", left: "9px", color: "var(--muted)", pointerEvents: "none" }}>
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input style={{ padding: "6px 10px 6px 28px", width: "200px", fontSize: "12px" }}
                      placeholder="Filter cards…" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  {search && <span style={{ fontSize: "11px", color: "var(--muted)" }}>{displayed.length} of {entries.length}</span>}
                  <div style={{ marginLeft: "auto" }}>
                    <button onClick={() => setTab("add")} className="submit-btn" style={{ height: "30px", padding: "0 14px", fontSize: "11px" }}>
                      + Add Card
                    </button>
                  </div>
                </div>
              )}

              {/* Table */}
              {loading ? (
                <p style={{ padding: "48px 0", color: "var(--muted)", fontSize: "13px" }}>Loading…</p>
              ) : entries.length === 0 ? (
                <div style={{ padding: "80px 0", textAlign: "center" }}>
                  <div style={{ marginBottom: "16px", opacity: 0.2, display: "flex", justifyContent: "center" }}>
                    <Logo height={80} />
                  </div>
                  <p style={{ color: "var(--text-2)", fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>Your watchlist is empty</p>
                  <p style={{ color: "var(--muted)", fontSize: "12px", marginBottom: "20px" }}>Track a card to get emailed when the price drops.</p>
                  <button onClick={() => setTab("add")} className="submit-btn">Track your first card</button>
                </div>
              ) : displayed.length === 0 ? (
                <p style={{ padding: "48px 0", color: "var(--muted)", fontSize: "13px" }}>No cards match &ldquo;{search}&rdquo;</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "580px" }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStatic, width: "36px" }}>#</th>
                        <th style={{ ...thClick("card_name"), width: "auto" }} onClick={() => handleSort("card_name")}>
                          Card <SortIcon active={sortCol === "card_name"} dir={sortDir} />
                        </th>
                        <th className="col-set" style={{ ...thStatic, width: "160px" }}>Set</th>
                        <th style={{ ...thClick("target_price"), width: "80px" }} onClick={() => handleSort("target_price")}>
                          Target <SortIcon active={sortCol === "target_price"} dir={sortDir} />
                        </th>
                        <th style={{ ...thClick("last_known_price"), width: "80px" }} onClick={() => handleSort("last_known_price")}>
                          Price <SortIcon active={sortCol === "last_known_price"} dir={sortDir} />
                        </th>
                        <th style={{ ...thClick("delta"), width: "120px" }} onClick={() => handleSort("delta")}>
                          From Target <SortIcon active={sortCol === "delta"} dir={sortDir} />
                        </th>
                        <th className="col-alert-date" style={{ ...thStatic, width: "90px" }}>Alerted</th>
                        <th style={{ ...thStatic, width: "60px" }} />
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.map((entry, i) => {
                        const atTarget = entry.last_known_price !== null && entry.last_known_price <= entry.target_price;
                        const noListings = entry.last_known_price === null;
                        const delta = fmtDelta(entry);
                        return (
                          <tr key={entry.id} className={`watch-row ${atTarget ? "at-target" : ""}`}>
                            <td style={{ padding: "11px 8px 11px 0", fontSize: "11px", color: "var(--muted)", fontFamily: "var(--font-geist-mono)" }}>{i + 1}</td>
                            <td style={{ padding: "7px 12px 7px 0" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                {entry.image_url ? (
                                  <img
                                    src={entry.image_url}
                                    alt={entry.card_name}
                                    width={64}
                                    height={90}
                                    style={{ borderRadius: "2px", flexShrink: 0, objectFit: "cover", display: "block" }}
                                    loading="lazy"
                                  />
                                ) : (
                                  <div style={{ width: 64, height: 90, flexShrink: 0, background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: "2px" }} />
                                )}
                                <div>
                                  <a href={tcgPlayerUrl(entry)} target="_blank" rel="noopener noreferrer" style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)", textDecoration: "none" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                                  >{entry.card_name}</a>
                                  <div className="col-set-inline" style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>{setLabel(entry.set_code)}</div>
                                </div>
                              </div>
                            </td>
                            <td className="col-set" style={{ padding: "11px 12px 11px 0", fontSize: "12px", color: "var(--muted)" }}>{setLabel(entry.set_code)}</td>
                            <td style={{ padding: "11px 12px 11px 0" }}>
                              <span className="price" style={{ fontSize: "13px", color: "var(--text-2)" }}>{fmt(entry.target_price)}</span>
                            </td>
                            <td style={{ padding: "11px 12px 11px 0" }}>
                              <span className="price" style={{ fontSize: "13px", fontWeight: atTarget ? 600 : 400, color: atTarget ? "var(--green)" : noListings ? "var(--muted)" : "var(--text)" }}>
                                {fmt(entry.last_known_price)}
                              </span>
                            </td>
                            <td style={{ padding: "11px 12px 11px 0" }}>
                              <div style={{ fontSize: "12px", fontWeight: 500, color: delta.color, fontFamily: "var(--font-geist-mono)" }}>{delta.text}</div>
                              {delta.pct && <div style={{ fontSize: "10px", color: delta.color, opacity: 0.6, marginTop: "2px" }}>{delta.pct}</div>}
                            </td>
                            <td className="col-alert-date" style={{ padding: "11px 12px 11px 0", fontSize: "11px", color: "var(--muted)", fontFamily: "var(--font-geist-mono)" }}>
                              {fmtRelative(entry.last_alerted_at)}
                            </td>
                            <td style={{ padding: "11px 0", textAlign: "right", whiteSpace: "nowrap" }}>
                              <button onClick={() => handleToggleAlert(entry.id, entry.alerts_enabled)} className="action-btn"
                                style={{ color: entry.alerts_enabled ? "var(--amber)" : "var(--muted)" }}
                                title={entry.alerts_enabled ? "Alerts on — click to mute" : "Muted — click to enable"}>
                                <BellIcon on={entry.alerts_enabled} />
                              </button>
                              <button onClick={() => handleDelete(entry.id)} className="remove-btn" title="Remove">×</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="site-footer">
        <div className="page-container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
            SWUtopia · Prices refreshed hourly
          </span>
          <span className="price" style={{ fontSize: "11px", color: "var(--muted)" }}>
            {entries.length} {entries.length === 1 ? "card" : "cards"} tracked
          </span>
        </div>
      </footer>

      {/* Auth modal */}
      {showAuth && (
        <AuthModal
          onSuccess={(u) => { setUser(u); setShowAuth(false); }}
          onClose={() => setShowAuth(false)}
        />
      )}
    </div>
  );
}
