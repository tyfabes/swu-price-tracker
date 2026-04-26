import { supabaseAdmin, WatchlistRow } from "@/lib/supabase";
import { fetchPricesBatch, fetchPricesFromTCGCSV } from "@/lib/price-source";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ALERT_EMAIL = process.env.ALERT_EMAIL!;

export async function runPriceCheck() {
  const db = supabaseAdmin();
  const { data: cards, error } = await db.from("watchlist").select("*");
  if (error) throw new Error(error.message);
  if (!cards || cards.length === 0) return { checked: 0, alerts: 0, skipped: 0 };

  const allCards = cards as WatchlistRow[];

  // Cards added via the new search flow have tcgplayer_id — use TCGCSV (daily updates).
  // Legacy cards without tcgplayer_id fall back to tcgpricelookup.
  const tcgCards = allCards.filter((c) => c.tcgplayer_id !== null);
  const legacyCards = allCards.filter((c) => c.tcgplayer_id === null);

  const [tcgPrices, legacyPrices] = await Promise.all([
    fetchPricesFromTCGCSV(tcgCards.map((c) => c.tcgplayer_id!)),
    fetchPricesBatch(legacyCards.map((c) => c.card_id)),
  ]);

  const prices = new Map<string, number | null>();
  for (const c of tcgCards) prices.set(c.card_id, tcgPrices.get(c.tcgplayer_id!) ?? null);
  for (const c of legacyCards) prices.set(c.card_id, legacyPrices.get(c.card_id) ?? null);

  const now = new Date().toISOString();
  let alertsFired = 0;
  let skipped = 0;

  for (const card of cards as WatchlistRow[]) {
    const price = prices.get(card.card_id) ?? null;

    if (price === null) {
      console.error(`No price for ${card.card_name} (${card.card_id}) — skipping alert`);
      skipped++;
      await db.from("watchlist").update({ last_checked_at: now }).eq("id", card.id);
      continue;
    }

    const updates: Partial<WatchlistRow> = {
      last_known_price: price,
      last_checked_at: now,
    };

    if (price <= card.target_price) {
      const crossedThreshold =
        !card.last_alerted_at ||
        (card.last_price_above_threshold_at &&
          card.last_price_above_threshold_at > card.last_alerted_at);

      if (crossedThreshold && card.alerts_enabled !== false) {
        await sendAlert(card, price);
        updates.last_alerted_at = now;
        alertsFired++;
      }
    } else {
      updates.last_price_above_threshold_at = now;
    }

    await db.from("watchlist").update(updates).eq("id", card.id);

    await db.from("price_history").insert({
      watchlist_id: card.id,
      user_id: card.user_id ?? null,
      price,
      checked_at: now,
    });
  }

  return { checked: cards.length, alerts: alertsFired, skipped };
}

async function sendAlert(card: WatchlistRow, price: number) {
  const setLabel = card.set_code.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  await resend.emails.send({
    from: "SWUtopia <alerts@yourdomain.com>",
    to: ALERT_EMAIL,
    subject: `Price alert: ${card.card_name} is $${price.toFixed(2)}`,
    html: `
      <p><strong>${card.card_name}</strong> (${setLabel}) has hit your target price.</p>
      <p>Current lowest: <strong>$${price.toFixed(2)}</strong> (target: $${card.target_price.toFixed(2)})</p>
      <p><a href="https://www.tcgplayer.com/search/star-wars-unlimited/product?q=${encodeURIComponent(card.card_name)}">Buy on TCGPlayer</a></p>
    `,
  });
}
