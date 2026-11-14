import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, hasAdminPermission } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const canViewOrders = hasAdminPermission(auth.admin, "orders");
    const canViewRefunds = hasAdminPermission(auth.admin, "refunds");
    const canViewProducts = hasAdminPermission(auth.admin, "products");

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
      recentOrdersRaw,
      recentRefunds,
    ] = await Promise.all([
      canViewOrders ? prisma.order.count() : Promise.resolve(0),
      canViewOrders ? prisma.order.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
      canViewOrders ? prisma.order.count({ where: { status: "APPROVED" } }) : Promise.resolve(0),
      canViewOrders ? prisma.order.count({ where: { status: "REJECTED" } }) : Promise.resolve(0),
      canViewOrders ? prisma.order.count({ where: { status: "DONE" } }) : Promise.resolve(0),
      canViewRefunds ? prisma.refundRequest.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
      canViewProducts ? prisma.product.count({ where: { isPublished: true, isArchived: false } }) : Promise.resolve(0),
      canViewProducts
        ? prisma.product.count({
            where: { OR: [{ availability: "OUT_OF_STOCK" }, { stockQuantity: { lte: 5 } }] },
          })
        : Promise.resolve(0),
      canViewOrders
        ? prisma.order.findMany({
            select: { totalAmount: true, status: true },
          })
        : Promise.resolve([]),
      canViewOrders
        ? prisma.order.findMany({
            take: 6,
            orderBy: { createdAt: "desc" },
            include: { items: true },
          })
        : Promise.resolve([]),
      canViewRefunds
        ? prisma.refundRequest.findMany({
            take: 6,
            orderBy: { createdAt: "desc" },
            include: { order: { select: { orderNumber: true, totalAmount: true } } },
          })
        : Promise.resolve([]),
    ]);

    // Redact sensitive license notes and internal admin notes from dashboard summary response
    const recentOrders = (recentOrdersRaw as any[]).map(
      ({ adminCustomerNote, adminInternalNote, ...safeOrder }: any) => safeOrder
    );

    // Calculate total submitted order value
    const totalSubmittedValue = (allOrders as any[]).reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

    // Calculate confirmed revenue (ONLY Approved and Done orders!)
    const confirmedRevenue = (allOrders as any[])
      .filter((o: any) => o.status === "APPROVED" || o.status === "DONE")
      .reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

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
