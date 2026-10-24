import { NextResponse } from "next/server";
import { getAdminSession, logAdminAudit } from "@/lib/auth";
import { getActiveLockouts, unblockIp } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lockouts = getActiveLockouts();

    return NextResponse.json({
      success: true,
      activeLockouts: lockouts,
      totalLocked: lockouts.length,
      policy: {
        customerMaxFailedAttempts: 10,
        customerLockoutMinutes: 15,
        adminMaxFailedAttempts: 5,
        adminLockoutMinutes: 30,
      },
    });
  } catch (error) {
    console.error("Error fetching security status:", error);
    return NextResponse.json({ error: "Failed to retrieve security status." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, ip } = body;

    if (action === "unblock" && ip) {
      const unblocked = unblockIp(ip);
      await logAdminAudit(
        admin.id,
        "SECURITY_IP_UNBLOCKED",
        `Admin unblocked restricted IP or target: ${ip}`
      );

      return NextResponse.json({
        success: true,
        unblocked,
        message: unblocked ? `IP/Target ${ip} was successfully unblocked.` : `No active lockout found for ${ip}.`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating security state:", error);
    return NextResponse.json({ error: "Failed to update security state." }, { status: 500 });
  }
}
