import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import {
  getTelegramConfig,
  setTelegramWebhook,
  getTelegramWebhookInfo,
  pollTelegramUpdates,
} from "@/lib/telegram";

export async function GET() {
  try {
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const config = await getTelegramConfig();

    if (!config.botToken) {
      return NextResponse.json({ error: "Please enter your Telegram Bot Token first." }, { status: 400 });
    }

    const action = body.action || "set_webhook";

    if (action === "set_webhook") {
      const targetUrl = (body.webhookUrl || `${config.siteUrl}/api/telegram/webhook`).trim();
      const res = await setTelegramWebhook(config.botToken, targetUrl);
      return NextResponse.json(res);
    }

    if (action === "poll_now") {
      const pollRes = await pollTelegramUpdates();
      return NextResponse.json({ success: true, ...pollRes });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
