// Quick smoke test for the tcgpricelookup.com API.
// Run with: npx tsx scripts/test-price.ts
// Requires TCGPRICELOOKUP_API_KEY in .env.local

import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });

const API_KEY = process.env.TCGPRICELOOKUP_API_KEY;
if (!API_KEY) {
  console.error("TCGPRICELOOKUP_API_KEY not set. Copy .env.local.example to .env.local and fill it in.");
  process.exit(1);
}

const CARD_NAME = "Luke Skywalker";
const SET_SLUG = "swu--spark-of-rebellion";

async function main() {
  console.log(`Searching for "${CARD_NAME}" in ${SET_SLUG}…\n`);

  const url = `https://api.tcgpricelookup.com/v1/cards/search?q=${encodeURIComponent(CARD_NAME)}&game=swu&set=${SET_SLUG}&limit=5`;
  const res = await fetch(url, { headers: { "X-API-Key": API_KEY! } });

  console.log(`Status: ${res.status}`);
  if (!res.ok) {
    console.error("Error response:", await res.text());
    process.exit(1);
  }

  const json = await res.json();
  console.log(`Found ${json.total} results. First ${json.data?.length ?? 0}:\n`);

  for (const card of json.data ?? []) {
    const low = card.prices?.raw?.near_mint?.tcgplayer?.low;
    const market = card.prices?.raw?.near_mint?.tcgplayer?.market;
    console.log(`  ${card.name} (${card.set?.name})`);
    console.log(`    ID:     ${card.id}`);
    console.log(`    Low:    ${low != null ? "$" + low.toFixed(2) : "n/a"}`);
    console.log(`    Market: ${market != null ? "$" + market.toFixed(2) : "n/a"}`);
    console.log();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
