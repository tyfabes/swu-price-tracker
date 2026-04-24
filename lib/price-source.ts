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
