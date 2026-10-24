import { NextResponse } from "next/server";
import { generateCaptcha } from "@/lib/captcha";
import { getClientIp, checkLoginSecurity } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const url = new URL(req.url);
    const scope = (url.searchParams.get("scope") === "admin" ? "admin" : "customer") as "customer" | "admin";

    // Verify if IP is locked
    const securityStatus = checkLoginSecurity(ip, undefined, scope);
    if (securityStatus.isLocked) {
      return NextResponse.json(
        {
          error: securityStatus.message || "IP is locked out.",
          isLocked: true,
          retryAfterSeconds: securityStatus.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const challenge = generateCaptcha();

    return NextResponse.json({
      success: true,
      captchaToken: challenge.token,
      captchaSvg: challenge.svgDataUrl,
      expiresAt: challenge.expiresAt,
    });
  } catch (error) {
    console.error("Error generating captcha:", error);
    return NextResponse.json({ error: "Failed to generate security verification challenge." }, { status: 500 });
  }
}
