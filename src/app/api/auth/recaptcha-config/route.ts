import { NextResponse } from "next/server";
import { getRecaptchaConfig, issueFallbackRecaptchaToken } from "@/lib/recaptcha";
import { getClientIp } from "@/lib/security";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getRecaptchaConfig();
    return NextResponse.json({
      siteKey: config.siteKey || "",
      enabled: config.enabled,
    });
  } catch (error) {
    return NextResponse.json({ siteKey: "", enabled: false });
  }
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`recaptcha_fallback_${ip}`, 20, 5 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many verification requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    if (body?.action !== "verify_checkbox") {
      return NextResponse.json({ error: "Invalid verification action." }, { status: 400 });
    }

    const token = issueFallbackRecaptchaToken();
    return NextResponse.json({ success: true, token });
  } catch {
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
