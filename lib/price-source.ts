const BASE = "https://api.tcgpricelookup.com/v1";

function headers() {
  return { "X-API-Key": process.env.TCGPRICELOOKUP_API_KEY ?? "" };
}

export type CardResult = {
  card_id: string;
  card_name: string;
  set_name: string;
  price: number | null;
};

// Called once when a user adds a card — resolves the API ID we'll use for batching.
export async function resolveCardId(
  cardName: string,
  setSlug: string
): Promise<{ card_id: string; resolved_name: string } | null> {
  const url = `${BASE}/cards/search?q=${encodeURIComponent(cardName)}&game=swu&set=${encodeURIComponent(setSlug)}&limit=1`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) return null;
  const json = await res.json();
  const card = json.data?.[0];
  if (!card) return null;
  return { card_id: card.id, resolved_name: card.name };
}

// Fetches prices from TCGCSV (TCGPlayer data, updates daily ~20:00 UTC).
// Fetches prices across all SWU sets and returns a map keyed by tcgplayer_id.
export async function fetchPricesFromTCGCSV(
  tcgplayerIds: number[]
): Promise<Map<number, number | null>> {
  const prices = new Map<number, number | null>();
  if (tcgplayerIds.length === 0) return prices;

  const idSet = new Set(tcgplayerIds);

  const tcgcsvHeaders = { "User-Agent": "SWUtopia/1.0 (swutopia.com)" };

  const groupsRes = await fetch("https://tcgcsv.com/tcgplayer/79/groups", { headers: tcgcsvHeaders });
  if (!groupsRes.ok) {
    console.error("TCGCSV: failed to fetch groups", groupsRes.status);
    return prices;
  }
  const { results: groups } = await groupsRes.json() as { results: Array<{ groupId: number }> };

  // Collect all rows per productId across all groups, then pick the best price.
  const candidates = new Map<number, Array<{ subTypeName: string; lowPrice: number; marketPrice: number }>>();

  for (const group of groups ?? []) {
    const priceRes = await fetch(`https://tcgcsv.com/tcgplayer/79/${group.groupId}/prices`, { headers: tcgcsvHeaders });
    if (!priceRes.ok) continue;
    const { results: rows } = await priceRes.json() as {
      results: Array<{ productId: number; subTypeName: string; lowPrice: number; marketPrice: number }>;
    };
    for (const row of rows ?? []) {
      if (!idSet.has(row.productId)) continue;
      if (!candidates.has(row.productId)) candidates.set(row.productId, []);
      candidates.get(row.productId)!.push(row);
    }
  }

  for (const [productId, rows] of candidates) {
    // Prefer Normal printing; fall back to any row with a non-zero price.
    const sorted = [...rows].sort((a, b) => {
      const aNormal = a.subTypeName === "Normal" ? 0 : 1;
      const bNormal = b.subTypeName === "Normal" ? 0 : 1;
      return aNormal - bNormal;
    });
    let picked: number | null = null;
    for (const row of sorted) {
      const p = row.lowPrice > 0 ? row.lowPrice : row.marketPrice > 0 ? row.marketPrice : null;
      if (p !== null) { picked = p; break; }
    }
    prices.set(productId, picked);
  }

  return prices;
}

// Called by the cron job — fetches all cards in one batched request.
export async function fetchPricesBatch(
  cardIds: string[]
): Promise<Map<string, number | null>> {
  const prices = new Map<string, number | null>();
  if (cardIds.length === 0) return prices;

  // API allows up to 20 IDs per request — chunk if needed.
  const chunks: string[][] = [];
  for (let i = 0; i < cardIds.length; i += 20) {
    chunks.push(cardIds.slice(i, i + 20));
  }

  for (const chunk of chunks) {
    const url = `${BASE}/cards/search?ids=${chunk.join(",")}&game=swu`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) {
      // Mark all cards in this chunk as null (failed fetch).
      for (const id of chunk) prices.set(id, null);
      console.error("fetchPricesBatch failed", res.status, await res.text());
      continue;
    }
    const json = await res.json();
    for (const card of json.data ?? []) {
      const low = card.prices?.raw?.near_mint?.tcgplayer?.low;
      prices.set(card.id, low && low > 0 ? low : null);
    }
    // Any IDs not returned by the API get null.
    for (const id of chunk) {
      if (!prices.has(id)) prices.set(id, null);
    }
  }

  return prices;
}
