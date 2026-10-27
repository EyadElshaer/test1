import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.storeSetting.findMany();
    const settingsMap: Record<string, string> = {};

    // Strict Allowlist: Only expose designated public storefront parameters
    const PUBLIC_SETTING_KEYS = new Set([
      "store_name",
      "store_tagline",
      "contact_email",
      "contact_whatsapp",
      "contact_phone",
      "working_hours",
      "announcement_banner_enabled",
      "announcement_banner_text",
      "announcement_banner_link",
      "currency",
      "site_url",
      "theme_color",
      "social_facebook",
      "social_instagram",
      "social_twitter",
      "social_discord",
      "social_telegram",
      "faq_intro_text",
      "support_note",
    ]);

    for (const s of settings) {
      if (PUBLIC_SETTING_KEYS.has(s.key)) {
        settingsMap[s.key] = s.value;
      }
    }

    return NextResponse.json({ success: true, settings: settingsMap });
  } catch (error) {
    console.error("Failed to load public settings:", error);
    return NextResponse.json({ error: "Failed to load store settings." }, { status: 500 });
  }
}
