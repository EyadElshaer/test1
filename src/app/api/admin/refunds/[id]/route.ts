import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, logAdminAudit } from "@/lib/auth";
import { isValidId, sanitizeText } from "@/lib/sanitizer";

const VALID_REFUND_STATUSES = new Set(["PENDING", "APPROVED", "REJECTED", "DONE"]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin("refunds");
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid refund ID." }, { status: 400 });
    }
    const { status, adminCustomerNote, adminInternalNote } = await req.json();

    if (status && !VALID_REFUND_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid refund status value." }, { status: 400 });
    }

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
          adminCustomerNote:
            adminCustomerNote !== undefined
              ? adminCustomerNote === null
                ? null
                : sanitizeText(adminCustomerNote, 2000)
              : existing.adminCustomerNote,
          adminInternalNote:
            adminInternalNote !== undefined
              ? adminInternalNote === null
                ? null
                : sanitizeText(adminInternalNote, 2000)
              : existing.adminInternalNote,
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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin("refunds");
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid refund ID." }, { status: 400 });
    }
    const existing = await prisma.refundRequest.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Refund request not found." }, { status: 404 });
    }

    await prisma.refundRequest.delete({
      where: { id },
    });

    await logAdminAudit(
      admin.id,
      "REFUND_DELETED",
      `Refund request ${existing.refundNumber} for order ${existing.order?.orderNumber || "unknown"} deleted permanently by ${admin.username}.`
    );

    return NextResponse.json({
      success: true,
      message: `Refund request ${existing.refundNumber} deleted successfully.`,
    });
  } catch (error) {
    console.error("Failed to delete refund request:", error);
    return NextResponse.json({ error: "Failed to delete refund request." }, { status: 500 });
  }
}
