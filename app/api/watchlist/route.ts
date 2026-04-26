import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveCardId } from "@/lib/price-source";
import { SWU_SETS } from "@/lib/sets";

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("watchlist")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { card_name, set_code, target_price, card_id: preResolvedId, tcgplayer_id, image_url, last_known_price } = body;

  if (!card_name || !target_price) {
    return NextResponse.json({ error: "card_name and target_price are required" }, { status: 400 });
  }
  if (typeof target_price !== "number" || target_price <= 0) {
    return NextResponse.json({ error: "target_price must be a positive number" }, { status: 400 });
  }

  // Attach user_id if a valid auth token is present
  let userId: string | null = null;
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const db0 = supabaseAdmin();
    const { data: { user } } = await db0.auth.getUser(authHeader.replace("Bearer ", ""));
    if (user) userId = user.id;
  }

  // If card_id is pre-resolved (from search), skip the API lookup
  let finalCardId: string;
  let finalCardName: string;
  let finalSetCode: string;

  if (preResolvedId) {
    finalCardId = preResolvedId;
    finalCardName = card_name;
    finalSetCode = set_code ?? "";
  } else {
    if (!set_code || !SWU_SETS.some((s) => s.slug === set_code)) {
      return NextResponse.json({ error: "unknown set_code" }, { status: 400 });
    }
    const resolved = await resolveCardId(card_name, set_code);
    if (!resolved) {
      return NextResponse.json(
        { error: `Card "${card_name}" not found in that set. Check the name and try again.` },
        { status: 404 }
      );
    }
    finalCardId = resolved.card_id;
    finalCardName = resolved.resolved_name;
    finalSetCode = set_code;
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("watchlist")
    .insert({
      card_name: finalCardName,
      set_code: finalSetCode,
      target_price,
      card_id: finalCardId,
      tcgplayer_id: typeof tcgplayer_id === "number" ? tcgplayer_id : null,
      image_url: image_url ?? null,
      last_known_price: typeof last_known_price === "number" ? last_known_price : null,
      user_id: userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, alerts_enabled } = body;
  if (!id || typeof alerts_enabled !== "boolean") {
    return NextResponse.json({ error: "id and alerts_enabled are required" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { error } = await db.from("watchlist").update({ alerts_enabled }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db.from("watchlist").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
