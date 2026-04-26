import { NextResponse } from "next/server";
import { runPriceCheck } from "@/lib/check-prices";

export async function POST() {
  try {
    const result = await runPriceCheck();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Manual refresh failed", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
