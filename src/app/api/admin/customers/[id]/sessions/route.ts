import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession, logAdminAudit } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: customerId } = await params;
    const customer = await prisma.user.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const { sessionId, terminateAll } = await req.json().catch(() => ({}));

    if (terminateAll) {
      const deleted = await prisma.userSession.deleteMany({
        where: { userId: customerId },
      });

      await logAdminAudit(
        admin.id,
        "CUSTOMER_SESSIONS_REVOKED",
        `Admin "${admin.username}" revoked all ${deleted.count} active session(s) for customer "${customer.name}" (${customer.email || customer.phone}).`
      );

      return NextResponse.json({
        success: true,
        message: `All active sessions for ${customer.name} have been terminated.`,
      });
    }

    if (sessionId) {
      const session = await prisma.userSession.findUnique({
        where: { id: sessionId },
      });

      if (!session || session.userId !== customerId) {
        return NextResponse.json({ error: "Session not found." }, { status: 404 });
      }

      await prisma.userSession.delete({
        where: { id: sessionId },
      });

      await logAdminAudit(
        admin.id,
        "CUSTOMER_SESSION_REVOKED",
        `Admin "${admin.username}" terminated session (${session.device || "Device"} • ${session.ipAddress || "IP"}) for customer "${customer.name}".`
      );

      return NextResponse.json({
        success: true,
        message: `Session has been revoked successfully.`,
      });
    }

    return NextResponse.json({ error: "Missing sessionId or terminateAll flag." }, { status: 400 });
  } catch (error) {
    console.error("Failed to revoke session:", error);
    return NextResponse.json({ error: "Failed to revoke session." }, { status: 500 });
  }
}
