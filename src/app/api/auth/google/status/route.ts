import { NextResponse } from "next/server";
import { isGoogleAuthConfigured, getGoogleClientId } from "@/lib/googleAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const isConfigured = isGoogleAuthConfigured();
  const clientId = getGoogleClientId();

  return NextResponse.json({
    configured: isConfigured,
    // Return client ID only if configured (publicly visible anyway in OAuth flow)
    clientId: isConfigured ? clientId : null,
  });
}
