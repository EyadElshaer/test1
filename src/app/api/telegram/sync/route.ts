import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getTelegramConfig,
  setTelegramWebhook,
  getTelegramWebhookInfo,
  pollTelegramUpdates,
} from "@/lib/telegram";
import { sanitizeSafeUrl } from "@/lib/sanitizer";

export async function GET() {
  try {
    const auth = await requireAdmin("settings");
    if (!auth.authorized) return auth.response;

    const config = await getTelegramConfig();
    if (!config.botToken) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 400 });
    }

    const webhookInfo = await getTelegramWebhookInfo(config.botToken);
    // Also poll pending updates if webhook is not set
    let pollResult = null;
    if (!webhookInfo?.url) {
      pollResult = await pollTelegramUpdates();
    }

    return NextResponse.json({
      success: true,
      webhookInfo,
      pollResult,
      siteUrl: config.siteUrl,
    });
  } catch (err: any) {
    console.error("Telegram sync GET error:", err);
    return NextResponse.json({ error: "Failed to sync Telegram status." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin("settings");
    if (!auth.authorized) return auth.response;

    const body = await req.json().catch(() => ({}));
    const config = await getTelegramConfig();

    if (!config.botToken) {
      return NextResponse.json({ error: "Please enter your Telegram Bot Token first." }, { status: 400 });
    }

    const action = body.action || "set_webhook";

    if (action === "set_webhook") {
      const rawUrl = (body.webhookUrl || `${config.siteUrl}/api/telegram/webhook`).trim();
      const safeUrl = sanitizeSafeUrl(rawUrl, { allowedProtocols: ["https:"] });
      if (!safeUrl || !safeUrl.endsWith("/api/telegram/webhook")) {
        return NextResponse.json(
          { error: "Webhook URL must be a valid https:// URL ending with /api/telegram/webhook" },
          { status: 400 }
        );
      }
      const res = await setTelegramWebhook(config.botToken, safeUrl);
      return NextResponse.json(res);
    }

    if (action === "poll_now") {
      const pollRes = await pollTelegramUpdates();
      return NextResponse.json({ success: true, ...pollRes });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("Telegram sync POST error:", err);
    return NextResponse.json({ error: "Failed to execute Telegram sync action." }, { status: 500 });
  }
}
