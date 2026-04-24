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
  const { card_name, set_code, target_price } = body;

  if (!card_name || !set_code || !target_price) {
    return NextResponse.json({ error: "card_name, set_code, and target_price are required" }, { status: 400 });
  }
  if (typeof target_price !== "number" || target_price <= 0) {
    return NextResponse.json({ error: "target_price must be a positive number" }, { status: 400 });
  }
  if (!SWU_SETS.some((s) => s.slug === set_code)) {
    return NextResponse.json({ error: "unknown set_code" }, { status: 400 });
  }

  const resolved = await resolveCardId(card_name, set_code);
  if (!resolved) {
    return NextResponse.json(
      { error: `Card "${card_name}" not found in that set. Check the name and try again.` },
      { status: 404 }
    );
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("watchlist")
    .insert({
      card_name: resolved.resolved_name,
      set_code,
      target_price,
      card_id: resolved.card_id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
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
