"use client";

import { useState, useEffect, useRef } from "react";
import { SWU_SETS } from "@/lib/sets";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { SearchCard } from "@/app/api/cards/search/route";

type Props = {
  onAdded: () => void;
  onCancel: () => void;
};

function fmt(price: number | null) {
  return price === null ? null : `$${price.toFixed(2)}`;
}

// SWU cards are portrait ~63×88mm → ratio 0.716
const CARD_RATIO = 88 / 63;

function CardThumb({ url, name, width }: { url: string | null; name: string; width: number }) {
  const height = Math.round(width * CARD_RATIO);
  if (!url) {
    return (
      <div style={{
        width, height, flexShrink: 0,
        background: "var(--surface-3)",
        border: "1px solid var(--border)",
        borderRadius: "3px",
      }} />
    );
  }
  return (
    <img
      src={url}
      alt={name}
      width={width}
      height={height}
      style={{ borderRadius: "3px", flexShrink: 0, objectFit: "cover", display: "block" }}
      loading="lazy"
    />
  );
}

export default function AddCardForm({ onAdded, onCancel }: Props) {
  const [query, setQuery] = useState("");
  const [setFilter, setSetFilter] = useState("all");
  const [suggestions, setSuggestions] = useState<SearchCard[]>([]);
  const [selected, setSelected] = useState<SearchCard | null>(null);
  const [showDrop, setShowDrop] = useState(false);
  const [searching, setSearching] = useState(false);
  const [targetPrice, setTargetPrice] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Debounced search
  useEffect(() => {
    if (selected) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowDrop(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const params = new URLSearchParams({ q: query.trim() });
      if (setFilter !== "all") params.set("set", setFilter);
      const res = await fetch(`/api/cards/search?${params}`);
      if (res.ok) {
        const data: SearchCard[] = await res.json();
        setSuggestions(data);
        setShowDrop(data.length > 0);
        setFocusedIndex(-1);
      }
      setSearching(false);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, setFilter, selected]);

  function handleSelect(card: SearchCard) {
    setSelected(card);
    setQuery(card.card_name);
    setShowDrop(false);
    setSuggestions([]);
    setFocusedIndex(-1);
  }

  function handleClear() {
    setSelected(null);
    setQuery("");
    setSuggestions([]);
    setShowDrop(false);
    setTargetPrice("");
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleSetFilterChange(val: string) {
    setSetFilter(val);
    if (selected) handleClear();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDrop || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && focusedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[focusedIndex]);
    } else if (e.key === "Escape") {
      setShowDrop(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setAdding(true);

    const { data: { session } } = await supabaseBrowser().auth.getSession();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers,
      body: JSON.stringify({
        card_name: selected.card_name,
        set_code: selected.set_code,
        card_id: selected.card_id,
        tcgplayer_id: selected.tcgplayer_id,
        image_url: selected.image_url,
        last_known_price: selected.price,
        target_price: parseFloat(targetPrice),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Something went wrong");
    } else {
      onAdded();
    }
    setAdding(false);
  }

  const dropStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    background: "var(--surface-2)",
    border: "1px solid var(--border-bright)",
    borderRadius: "4px",
    zIndex: 50,
    maxHeight: "380px",
    overflowY: "auto",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  };

  return (
    <section style={{ padding: "36px 0", maxWidth: "800px" }}>
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>
          Track a card
        </div>
        <div style={{ fontSize: "13px", color: "var(--muted)" }}>
          Search for a card and set a target price — we&apos;ll email you when it drops.
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Search row */}
          <div className="form-field">
            <label className="field-label">Card</label>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>

              {/* Search input + dropdown */}
              <div ref={containerRef} style={{ position: "relative", flex: 1 }}>
                <input
                  ref={inputRef}
                  style={{ padding: "12px 36px 12px 14px", width: "100%", fontSize: "14px" }}
                  placeholder="Search card name…"
                  value={query}
                  onChange={(e) => {
                    if (selected) handleClear();
                    setQuery(e.target.value);
                  }}
                  onFocus={() => { if (suggestions.length > 0) setShowDrop(true); }}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                  autoFocus
                />

                {/* Spinner / clear */}
                <div style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center" }}>
                  {searching && (
                    <span style={{ fontSize: "12px", color: "var(--muted)", animation: "spin 1s linear infinite", display: "inline-block" }}>↻</span>
                  )}
                  {selected && (
                    <button
                      type="button"
                      onClick={handleClear}
                      style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "16px", lineHeight: 1, padding: "0 2px" }}
                      title="Clear"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Dropdown */}
                {showDrop && suggestions.length > 0 && (
                  <div style={dropStyle}>
                    {suggestions.map((card, i) => (
                      <button
                        key={card.card_id}
                        type="button"
                        onClick={() => handleSelect(card)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          width: "100%",
                          padding: "10px 12px",
                          background: focusedIndex === i ? "var(--surface-3)" : "transparent",
                          border: "none",
                          borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                        onMouseEnter={() => setFocusedIndex(i)}
                      >
                        <CardThumb url={card.image_url} name={card.card_name} width={68} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {card.card_name}
                            {card.variant !== "Normal" && (
                              <span style={{ marginLeft: "6px", fontSize: "10px", color: "var(--blue)", fontWeight: 600 }}>
                                {card.variant.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {card.set_name}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: "right" }}>
                          {card.price !== null ? (
                            <span className="price" style={{ fontSize: "13px", fontWeight: 600, color: "var(--green)" }}>
                              ${card.price.toFixed(2)}
                            </span>
                          ) : (
                            <span style={{ fontSize: "11px", color: "var(--muted)" }}>No price</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Set filter */}
              <select
                style={{ padding: "12px 10px", flexShrink: 0, width: "180px", fontSize: "13px" }}
                value={setFilter}
                onChange={(e) => handleSetFilterChange(e.target.value)}
              >
                <option value="all">All Sets</option>
                {SWU_SETS.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected card info */}
          {selected && (
            <div style={{
              padding: "14px 16px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid var(--blue)",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}>
              <CardThumb url={selected.image_url} name={selected.card_name} width={128} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", marginBottom: "2px" }}>
                  {selected.card_name}
                  {selected.variant !== "Normal" && (
                    <span style={{ marginLeft: "6px", fontSize: "10px", color: "var(--blue)", fontWeight: 600 }}>
                      {selected.variant.toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>{selected.set_name}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "3px" }}>Current price</div>
                <div className="price" style={{ fontSize: "20px", fontWeight: 700, color: selected.price !== null ? "var(--text)" : "var(--muted)" }}>
                  {fmt(selected.price) ?? "—"}
                </div>
              </div>
            </div>
          )}

          {/* Target price */}
          {selected && (
            <div className="form-field">
              <label className="field-label">Alert when price drops below</label>
              <input
                style={{ padding: "9px 12px", width: "160px" }}
                type="number"
                step="0.01"
                min="0.01"
                placeholder="$0.00"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}

          {error && (
            <div style={{
              padding: "9px 12px",
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.2)",
              borderRadius: "3px",
              fontSize: "12px",
              color: "var(--red)",
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", alignItems: "center", paddingTop: "4px" }}>
            <button type="submit" disabled={adding || !selected || !targetPrice} className="submit-btn">
              {adding ? "Adding…" : "Add to Watchlist"}
            </button>
            <button type="button" onClick={onCancel} className="ghost-btn">Cancel</button>
          </div>
        </div>
      </form>
    </section>
  );
}
