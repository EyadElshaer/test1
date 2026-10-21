import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession, logAdminAudit } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status, adminCustomerNote, adminInternalNote } = await req.json();

    const existing = await prisma.refundRequest.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Refund request not found." }, { status: 404 });
    }

    const fromStatus = existing.status;
    const newStatus = status || fromStatus;
    const isStatusChanged = newStatus !== fromStatus;

    const updated = await prisma.$transaction(async (tx: any) => {
      const refund = await tx.refundRequest.update({
        where: { id },
        data: {
          status: newStatus,
          adminCustomerNote: adminCustomerNote !== undefined ? adminCustomerNote : existing.adminCustomerNote,
          adminInternalNote: adminInternalNote !== undefined ? adminInternalNote : existing.adminInternalNote,
        },
        include: {
          order: true,
          statusHistory: { orderBy: { createdAt: "asc" } },
        },
      });

      if (isStatusChanged) {
        await tx.refundStatusHistory.create({
          data: {
            refundRequestId: id,
            fromStatus,
            toStatus: newStatus,
            changedBy: admin.username,
            notes: adminCustomerNote || `Status changed from ${fromStatus} to ${newStatus}`,
          },
        });

        // Sync with linked order status
        let targetOrderStatus: string | null = null;
        if (newStatus === "DONE") targetOrderStatus = "REFUNDED";
        else if (newStatus === "APPROVED") targetOrderStatus = "REFUND_APPROVED";
        else if (newStatus === "REJECTED") targetOrderStatus = "DONE";

        if (targetOrderStatus && existing.order) {
          await tx.order.update({
            where: { id: existing.order.id },
            data: {
              status: targetOrderStatus,
              statusHistory: {
                create: {
                  fromStatus: existing.order.status,
                  toStatus: targetOrderStatus,
                  changedBy: admin.username,
                  notes: `Refund ${existing.refundNumber} updated to ${newStatus}: ${adminCustomerNote || "Admin processed refund request."}`,
                },
              },
            },
          });
        }
      }

      return refund;
    });

    await logAdminAudit(
      admin.id,
      "REFUND_UPDATED",
      `Refund ${existing.refundNumber} for order ${existing.order.orderNumber} updated: ${fromStatus} -> ${newStatus}`
    );

    return NextResponse.json({ success: true, refund: updated });
  } catch (error) {
    console.error("Failed to update refund:", error);
    return NextResponse.json({ error: "Failed to update refund." }, { status: 500 });
  }
}
