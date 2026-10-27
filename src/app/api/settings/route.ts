import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.storeSetting.findMany();
    const settingsMap: Record<string, string> = {};
    const SENSITIVE_KEYS = new Set([
      "telegram_bot_token",
      "telegram_chat_id",
      "smtp_password",
      "api_secret",
      "google_sheets_webhook_url",
    ]);

    for (const s of settings) {
      if (!SENSITIVE_KEYS.has(s.key)) {
        settingsMap[s.key] = s.value;
      }
    }

    return NextResponse.json({ success: true, settings: settingsMap });
  } catch (error) {
    console.error("Failed to load public settings:", error);
    return NextResponse.json({ error: "Failed to load store settings." }, { status: 500 });
  }
}
