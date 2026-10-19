import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalOrders,
      pendingOrders,
      approvedOrders,
      rejectedOrders,
      doneOrders,
      pendingRefunds,
      publishedProducts,
      outOfStockProducts,
      allOrders,
      recentOrders,
      recentRefunds,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "APPROVED" } }),
      prisma.order.count({ where: { status: "REJECTED" } }),
      prisma.order.count({ where: { status: "DONE" } }),
      prisma.refundRequest.count({ where: { status: "PENDING" } }),
      prisma.product.count({ where: { isPublished: true, isArchived: false } }),
      prisma.product.count({
        where: { OR: [{ availability: "OUT_OF_STOCK" }, { stockQuantity: { lte: 5 } }] },
      }),
      prisma.order.findMany({
        select: { totalAmount: true, status: true },
      }),
      prisma.order.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: { items: true },
      }),
      prisma.refundRequest.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: { order: { select: { orderNumber: true, totalAmount: true } } },
      }),
    ]);

    // Calculate total submitted order value
    const totalSubmittedValue = allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Calculate confirmed revenue (ONLY Approved and Done orders!)
    const confirmedRevenue = allOrders
      .filter((o) => o.status === "APPROVED" || o.status === "DONE")
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        approvedOrders,
        rejectedOrders,
        doneOrders,
        pendingRefunds,
        publishedProducts,
        outOfStockProducts,
        totalSubmittedValue,
        confirmedRevenue,
        recentOrders,
        recentRefunds,
      },
    });
  } catch (error) {
    console.error("Failed to load admin stats:", error);
    return NextResponse.json({ error: "Failed to load dashboard statistics." }, { status: 500 });
  }
}
