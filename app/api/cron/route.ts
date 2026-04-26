import { NextRequest, NextResponse } from "next/server";
import { runPriceCheck } from "@/lib/check-prices";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runPriceCheck();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Price check failed", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
