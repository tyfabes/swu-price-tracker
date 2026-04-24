import { createClient } from "@supabase/supabase-js";

export type WatchlistRow = {
  id: string;
  card_name: string;
  set_code: string;
  target_price: number;
  card_id: string;
  last_known_price: number | null;
  last_checked_at: string | null;
  last_alerted_at: string | null;
  last_price_above_threshold_at: string | null;
  created_at: string;
};

// Server-side only — uses service role key, never exposed to the browser.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
