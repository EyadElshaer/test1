import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession, logAdminAudit } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
        refundRequests: {
          include: { statusHistory: { orderBy: { createdAt: "asc" } } },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Failed to fetch order details:", error);
    return NextResponse.json({ error: "Failed to load order." }, { status: 500 });
  }
}

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
    const { status, paymentStatus, adminCustomerNote, adminInternalNote, rejectionReason } =
      await req.json();

    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const fromStatus = existingOrder.status;
    const newStatus = status || fromStatus;
    const isStatusChanged = newStatus !== fromStatus;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: {
          status: newStatus,
          paymentStatus: paymentStatus || (newStatus === "APPROVED" || newStatus === "DONE" ? "VERIFIED" : newStatus === "REJECTED" ? "REJECTED" : existingOrder.paymentStatus),
          adminCustomerNote: adminCustomerNote !== undefined ? adminCustomerNote : existingOrder.adminCustomerNote,
          adminInternalNote: adminInternalNote !== undefined ? adminInternalNote : existingOrder.adminInternalNote,
          rejectionReason: rejectionReason !== undefined ? rejectionReason : existingOrder.rejectionReason,
        },
        include: {
          items: true,
          statusHistory: { orderBy: { createdAt: "asc" } },
          refundRequests: true,
        },
      });

      if (isStatusChanged) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: id,
            fromStatus,
            toStatus: newStatus,
            changedBy: admin.username,
            notes: adminCustomerNote || `Status updated from ${fromStatus} to ${newStatus}`,
          },
        });
      }

      return order;
    });

    await logAdminAudit(
      admin.id,
      "ORDER_UPDATED",
      `Order ${existingOrder.orderNumber} updated. Status: ${fromStatus} -> ${newStatus}`
    );

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
  }
}
