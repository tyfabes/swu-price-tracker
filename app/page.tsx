"use client";

import { useEffect, useState } from "react";
import { SWU_SETS } from "@/lib/sets";

type WatchlistEntry = {
  id: string;
  card_name: string;
  set_code: string;
  target_price: number;
  last_known_price: number | null;
  last_checked_at: string | null;
  last_alerted_at: string | null;
};

export default function Home() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cardName, setCardName] = useState("");
  const [setCode, setSetCode] = useState(SWU_SETS[0].slug);
  const [targetPrice, setTargetPrice] = useState("");

  async function load() {
    const res = await fetch("/api/watchlist");
    setEntries(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        card_name: cardName.trim(),
        set_code: setCode,
        target_price: parseFloat(targetPrice),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Something went wrong");
    } else {
      setCardName("");
      setTargetPrice("");
      await load();
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/watchlist?id=${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">SWU Price Alerts</h1>
      <p className="text-gray-500 text-sm mb-6">
        Get emailed when a card hits your target price. Prices checked hourly.
      </p>

      <form onSubmit={handleAdd} className="flex flex-col gap-3 mb-8 p-4 border rounded-lg bg-gray-50">
        <div className="flex gap-3 flex-wrap">
          <input
            className="border rounded px-3 py-2 flex-1 min-w-48"
            placeholder="Card name"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            required
          />
          <select
            className="border rounded px-3 py-2"
            value={setCode}
            onChange={(e) => setSetCode(e.target.value)}
          >
            {SWU_SETS.map((s) => (
              <option key={s.slug} value={s.slug}>{s.label}</option>
            ))}
          </select>
          <input
            className="border rounded px-3 py-2 w-28"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Target $"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={adding}
          className="self-start bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add to watchlist"}
        </button>
      </form>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-400">No cards on your watchlist yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-2">Card</th>
              <th className="pb-2">Target</th>
              <th className="pb-2">Current</th>
              <th className="pb-2">Last alerted</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const atTarget = e.last_known_price !== null && e.last_known_price <= e.target_price;
              return (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{e.card_name}</td>
                  <td className="py-3 pr-4">${e.target_price.toFixed(2)}</td>
                  <td className={`py-3 pr-4 font-medium ${atTarget ? "text-green-600" : ""}`}>
                    {e.last_known_price !== null ? `$${e.last_known_price.toFixed(2)}` : "—"}
                  </td>
                  <td className="py-3 pr-4 text-gray-400">
                    {e.last_alerted_at
                      ? new Date(e.last_alerted_at).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="text-gray-400 hover:text-red-500 text-xs"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
