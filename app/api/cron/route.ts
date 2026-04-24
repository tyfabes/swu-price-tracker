import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, WatchlistRow } from "@/lib/supabase";
import { fetchPricesBatch } from "@/lib/price-source";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ALERT_EMAIL = process.env.ALERT_EMAIL!;

// Vercel calls this on the cron schedule defined in vercel.json.
export async function GET(req: NextRequest) {
  // Guard against unauthorized calls in production.
  const authHeader = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: cards, error } = await db.from("watchlist").select("*");
  if (error) {
    console.error("Failed to read watchlist", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!cards || cards.length === 0) {
    return NextResponse.json({ checked: 0 });
  }

  const cardIds = (cards as WatchlistRow[]).map((c) => c.card_id);
  const prices = await fetchPricesBatch(cardIds);

  const now = new Date().toISOString();
  let alertsFired = 0;
  let skipped = 0;

  for (const card of cards as WatchlistRow[]) {
    const price = prices.get(card.card_id) ?? null;

    if (price === null) {
      console.error(`No price for ${card.card_name} (${card.card_id}) — skipping`);
      skipped++;
      continue;
    }

    const updates: Partial<WatchlistRow> = {
      last_known_price: price,
      last_checked_at: now,
    };

    if (price <= card.target_price) {
      // Only alert if we've seen the price above threshold since the last alert.
      const crossedThreshold =
        !card.last_alerted_at ||
        (card.last_price_above_threshold_at &&
          card.last_price_above_threshold_at > card.last_alerted_at);

      if (crossedThreshold) {
        await sendAlert(card, price);
        updates.last_alerted_at = now;
        alertsFired++;
      }
    } else {
      // Price is above target — record the timestamp so next dip triggers a new alert.
      updates.last_price_above_threshold_at = now;
    }

    await db.from("watchlist").update(updates).eq("id", card.id);
  }

  return NextResponse.json({ checked: cards.length, alerts: alertsFired, skipped });
}

async function sendAlert(card: WatchlistRow, price: number) {
  const setLabel = card.set_code.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  await resend.emails.send({
    from: "SWU Alerts <alerts@yourdomain.com>",
    to: ALERT_EMAIL,
    subject: `Price alert: ${card.card_name} is $${price.toFixed(2)}`,
    html: `
      <p><strong>${card.card_name}</strong> (${setLabel}) has hit your target price.</p>
      <p>Current lowest: <strong>$${price.toFixed(2)}</strong> (target: $${card.target_price.toFixed(2)})</p>
      <p><a href="https://www.tcgplayer.com/search/star-wars-unlimited/product?q=${encodeURIComponent(card.card_name)}">Buy on TCGPlayer</a></p>
    `,
  });
}
