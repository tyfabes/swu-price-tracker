"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { SWU_SETS } from "@/lib/sets";

type HistoryRow = {
  id: string;
  watchlist_id: string;
  price: number | null;
  checked_at: string;
  watchlist: { card_name: string; set_code: string } | null;
};

function fmt(price: number | null) {
  return price === null ? "—" : `$${price.toFixed(2)}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const thStyle: React.CSSProperties = {
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

export default function HistoryTab({ user }: { user: User }) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabaseBrowser().auth.getSession();
      if (!session) return;
      const res = await fetch("/api/history", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setError("Failed to load history"); setLoading(false); return; }
      setRows(await res.json());
      setLoading(false);
    }
    load();
  }, [user]);

  const setLabel = (slug: string) => SWU_SETS.find((s) => s.slug === slug)?.label ?? slug;

  return (
    <section style={{ padding: "28px 0" }}>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>Price History</div>
        <div style={{ fontSize: "13px", color: "var(--muted)" }}>Recent price checks across your tracked cards.</div>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)", fontSize: "13px" }}>Loading…</p>
      ) : error ? (
        <p style={{ color: "var(--red)", fontSize: "13px" }}>{error}</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: "13px" }}>
          No history yet — prices are checked hourly and logged once you&apos;re signed in.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "480px" }}>
            <thead>
              <tr>
                <th style={thStyle}>Card</th>
                <th style={thStyle}>Set</th>
                <th style={{ ...thStyle, fontFamily: "var(--font-geist-mono)" }}>Price</th>
                <th style={thStyle}>Checked</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="watch-row">
                  <td style={{ padding: "10px 12px 10px 0", fontSize: "13px", color: "var(--text)" }}>
                    {row.watchlist?.card_name ?? "—"}
                  </td>
                  <td style={{ padding: "10px 12px 10px 0", fontSize: "12px", color: "var(--muted)" }}>
                    {row.watchlist ? setLabel(row.watchlist.set_code) : "—"}
                  </td>
                  <td style={{ padding: "10px 12px 10px 0", fontFamily: "var(--font-geist-mono)", fontSize: "13px", color: "var(--text-2)" }}>
                    {fmt(row.price)}
                  </td>
                  <td style={{ padding: "10px 12px 10px 0", fontSize: "11px", color: "var(--muted)" }}>
                    {fmtDate(row.checked_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
