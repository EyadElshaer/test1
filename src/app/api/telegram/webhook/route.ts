import { NextResponse } from "next/server";
import { handleTelegramCallbackQuery } from "@/lib/telegram";

export async function POST(req: Request) {
  try {
    const update = await req.json();

    if (update?.callback_query) {
      await handleTelegramCallbackQuery(update.callback_query);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    // Always return 200 to Telegram to prevent retry floods
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    service: "PremiKeys Telegram Webhook Gateway",
    timestamp: new Date().toISOString(),
  });
}
