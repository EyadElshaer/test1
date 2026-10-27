import { NextResponse } from "next/server";
import {
  getTelegramConfig,
  verifyTelegramWebhookSecret,
  handleTelegramCallbackQuery,
} from "@/lib/telegram";

export async function POST(req: Request) {
  try {
    const config = await getTelegramConfig();
    if (!config.botToken) {
      return NextResponse.json({ error: "Telegram bot not configured." }, { status: 400 });
    }

    // Cryptographic authenticity check: verify that the request genuinely originates from Telegram
    const secretTokenHeader = req.headers.get("x-telegram-bot-api-secret-token");
    if (!verifyTelegramWebhookSecret(config.botToken, secretTokenHeader)) {
      console.warn("Unauthorized attempt to access Telegram webhook endpoint without valid secret token");
      return NextResponse.json({ error: "Unauthorized: Invalid webhook secret token." }, { status: 401 });
    }

    const update = await req.json();

    if (update?.callback_query) {
      await handleTelegramCallbackQuery(update.callback_query);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    // Always return 200 to Telegram on parse errors to prevent endless retry loops
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
