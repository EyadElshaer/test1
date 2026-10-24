import { NextResponse } from "next/server";
import { getClientIp, checkLoginSecurity } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const { searchParams } = new URL(req.url);
    const scope = (searchParams.get("scope") as "customer" | "admin") || "customer";

    const security = checkLoginSecurity(ip, undefined, scope);

    return NextResponse.json({
      isLocked: security.isLocked,
      requiresCaptcha: security.requiresCaptcha,
      remainingAttempts: security.remainingAttempts,
      retryAfterSeconds: security.retryAfterSeconds || 0,
      message: security.message || null,
    });
  } catch (error) {
    return NextResponse.json({
      isLocked: false,
      requiresCaptcha: false,
      remainingAttempts: 10,
      retryAfterSeconds: 0,
    });
  }
}
