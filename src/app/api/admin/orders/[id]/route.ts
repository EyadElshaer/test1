import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { getAdminSession, logAdminAudit } from "@/lib/auth";
import { syncOrderToGoogleSheets } from "@/lib/googleSheets";

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
    const {
      status,
      paymentStatus,
      adminCustomerNote,
      adminInternalNote,
      rejectionReason,
      purgeScreenshot,
    } = await req.json();

    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const fromStatus = existingOrder.status;
    const newStatus = status || fromStatus;
    const isStatusChanged = newStatus !== fromStatus;

    // Auto-delete payment screenshot if order moves away from PENDING, or if explicitly requested
    const shouldDeleteScreenshot =
      Boolean(existingOrder.paymentScreenshotUrl) &&
      ((fromStatus === "PENDING" && newStatus !== "PENDING") || purgeScreenshot === true);

    if (shouldDeleteScreenshot && existingOrder.paymentScreenshotUrl) {
      const filename = path.basename(existingOrder.paymentScreenshotUrl.split("?")[0]);

      // 1. Delete from PostgreSQL database storage (UploadedFile) to immediately reclaim storage space
      try {
        await prisma.uploadedFile.deleteMany({
          where: { filename },
        });
      } catch (fileErr) {
        console.warn("Failed to delete screenshot from database storage:", fileErr);
      }

      // 2. Delete from local disk storage if present
      try {
        const diskPath = path.join(process.cwd(), "storage", "screenshots", filename);
        if (fs.existsSync(diskPath)) {
          fs.unlinkSync(diskPath);
        }
      } catch (diskErr) {
        console.warn("Failed to delete screenshot from disk storage:", diskErr);
      }
    }

    const updatedOrder = await prisma.$transaction(async (tx: any) => {
      const updateData: any = {
        status: newStatus,
        paymentStatus:
          paymentStatus ||
          (newStatus === "APPROVED" || newStatus === "DONE"
            ? "VERIFIED"
            : newStatus === "REJECTED"
            ? "REJECTED"
            : existingOrder.paymentStatus),
        adminCustomerNote:
          adminCustomerNote !== undefined
            ? adminCustomerNote
            : existingOrder.adminCustomerNote,
        adminInternalNote:
          adminInternalNote !== undefined
            ? adminInternalNote
            : existingOrder.adminInternalNote,
        rejectionReason:
          rejectionReason !== undefined
            ? rejectionReason
            : existingOrder.rejectionReason,
      };

      if (shouldDeleteScreenshot) {
        updateData.paymentScreenshotUrl = null;
      }

      const order = await tx.order.update({
        where: { id },
        data: updateData,
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
            notes:
              adminCustomerNote ||
              `Status updated from ${fromStatus} to ${newStatus}${
                shouldDeleteScreenshot
                  ? " (Payment receipt proof purged from DB storage to free space)"
                  : ""
              }`,
          },
        });
      }

      return order;
    });

    await logAdminAudit(
      admin.id,
      "ORDER_UPDATED",
      `Order ${existingOrder.orderNumber} updated. Status: ${fromStatus} -> ${newStatus}${
        shouldDeleteScreenshot ? " (Receipt screenshot purged to free database storage)" : ""
      }`
    );

    // Sync updated order state to Google Sheets
    try {
      await syncOrderToGoogleSheets(updatedOrder);
    } catch (sheetErr) {
      console.warn("Google Sheets update sync note:", sheetErr);
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Delete associated screenshot if exists
    if (existingOrder.paymentScreenshotUrl) {
      const filename = path.basename(existingOrder.paymentScreenshotUrl.split("?")[0]);
      await prisma.uploadedFile.deleteMany({ where: { filename } }).catch(() => {});
      try {
        const diskPath = path.join(process.cwd(), "storage", "screenshots", filename);
        if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
      } catch {}
    }

    // Cascade delete items, status history, refund requests
    await prisma.order.delete({
      where: { id },
    });

    await logAdminAudit(
      admin.id,
      "ORDER_DELETED",
      `Order ${existingOrder.orderNumber} deleted permanently by ${admin.username}.`
    );

    return NextResponse.json({
      success: true,
      message: `Order ${existingOrder.orderNumber} deleted successfully.`,
    });
  } catch (error) {
    console.error("Failed to delete order:", error);
    return NextResponse.json({ error: "Failed to delete order." }, { status: 500 });
  }
}
