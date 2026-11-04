import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, logAdminAudit } from "@/lib/auth";
import { sanitizeString } from "@/lib/sanitizer";

const ALLOWED_SETTING_KEYS = new Set([
  "store_name",
  "store_tagline",
  "currency",
  "contact_email",
  "contact_whatsapp",
  "support_hours",
  "announcement_banner",
  "announcement_banner_enabled",
  "announcement_banner_text",
  "announcement_banner_link",
  "footer_text",
  "checkout_instructions_note",
  "refund_policy_summary",
  "telegram_enabled",
  "telegram_bot_token",
  "telegram_chat_id",
  "gemini_verification_enabled",
  "gemini_api_key",
  "google_sheets_enabled",
  "google_sheets_webhook_url",
  "recaptcha_site_key",
  "recaptcha_secret_key",
]);

const SENSITIVE_SECRET_KEYS = new Set([
  "gemini_api_key",
  "telegram_bot_token",
  "recaptcha_secret_key",
]);

function maskSecretValue(val: string): string {
  if (!val || val.length <= 6) return val ? "••••••••" : "";
  return `••••••••${val.slice(-4)}`;
}

export async function GET() {
  try {
    const auth = await requireAdmin("settings");
    if (!auth.authorized) return auth.response;

    const settings = await prisma.storeSetting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      if (SENSITIVE_SECRET_KEYS.has(s.key) && s.value) {
        settingsMap[s.key] = maskSecretValue(s.value);
      } else {
        settingsMap[s.key] = s.value;
      }
    }

    return NextResponse.json({ success: true, settings: settingsMap });
  } catch (error) {
    console.error("Failed to load settings:", error);
    return NextResponse.json({ error: "Failed to load store settings." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin("settings");
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid settings payload." }, { status: 400 });
    }

    const settingsPayload =
      body.settings && typeof body.settings === "object" && !Array.isArray(body.settings)
        ? body.settings
        : body;

    for (const [key, value] of Object.entries(settingsPayload)) {
      if (typeof key !== "string" || typeof value !== "string") continue;
      if (!ALLOWED_SETTING_KEYS.has(key)) continue;

      // Do not overwrite sensitive secrets if the client returned the masked placeholder
      if (SENSITIVE_SECRET_KEYS.has(key) && value.includes("••••")) {
        continue;
      }

      // Validate Google Sheets webhook URL to prevent SSRF
      if (key === "google_sheets_webhook_url" && value.trim()) {
        if (!value.trim().startsWith("https://script.google.com/macros/s/")) {
          return NextResponse.json(
            {
              error:
                "Invalid Google Sheets Webhook URL. Must begin with https://script.google.com/macros/s/",
            },
            { status: 400 }
          );
        }
      }

      const cleanVal = SENSITIVE_SECRET_KEYS.has(key)
        ? value.trim().slice(0, 500)
        : sanitizeString(value, 2000);

      await prisma.storeSetting.upsert({
        where: { key },
        update: { value: cleanVal },
        create: { key, value: cleanVal },
      });
    }

    await logAdminAudit(admin.id, "SETTINGS_UPDATED", "Store configuration settings updated");

    return NextResponse.json({ success: true, message: "Settings saved successfully." });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json({ error: "Failed to update settings." }, { status: 500 });
  }
}
