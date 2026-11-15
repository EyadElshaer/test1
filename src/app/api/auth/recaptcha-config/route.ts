import { NextResponse } from "next/server";
import { getRecaptchaConfig } from "@/lib/recaptcha";

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
