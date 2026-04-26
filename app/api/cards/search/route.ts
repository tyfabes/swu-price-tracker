import { NextRequest, NextResponse } from "next/server";

const BASE = "https://api.tcgpricelookup.com/v1";

export type SearchCard = {
  card_id: string;
  tcgplayer_id: number | null;
  card_name: string;
  set_name: string;
  set_code: string;
  variant: string;
  price: number | null;
  image_url: string | null;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const set = searchParams.get("set");

  if (!q || q.length < 2) return NextResponse.json([]);

  let url = `${BASE}/cards/search?q=${encodeURIComponent(q.toLowerCase())}&game=swu&limit=10`;
  if (set && set !== "all") url += `&set=${encodeURIComponent(set)}`;

  const res = await fetch(url, {
    headers: { "X-API-Key": process.env.TCGPRICELOOKUP_API_KEY ?? "" },
    next: { revalidate: 60 },
  });

  if (!res.ok) return NextResponse.json([]);
  const json = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cards: SearchCard[] = (json.data ?? []).map((card: any) => {
    const nm = card.prices?.raw?.near_mint?.tcgplayer;
    const low = nm?.low;
    const market = nm?.market;
    const price = low && low > 0 ? low : market && market > 0 ? market : null;
    return {
      card_id: card.id,
      tcgplayer_id: card.tcgplayer_id ? parseInt(card.tcgplayer_id, 10) : null,
      card_name: card.name,
      set_name: card.set?.name ?? "",
      set_code: card.set?.slug ?? "",
      variant: card.variant ?? "Normal",
      price,
      image_url: card.image_url ?? null,
    };
  });

  return NextResponse.json(cards);
}
