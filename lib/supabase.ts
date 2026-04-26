import { createClient } from "@supabase/supabase-js";

export type WatchlistRow = {
  id: string;
  card_name: string;
  set_code: string;
  target_price: number;
  card_id: string;
  tcgplayer_id: number | null;
  image_url: string | null;
  last_known_price: number | null;
  last_checked_at: string | null;
  last_alerted_at: string | null;
  last_price_above_threshold_at: string | null;
  alerts_enabled: boolean;
  user_id: string | null;
  created_at: string;
};

export type PriceHistoryRow = {
  id: string;
  watchlist_id: string;
  user_id: string | null;
  price: number | null;
  checked_at: string;
};

// Server-side only — uses service role key, never exposed to the browser.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
