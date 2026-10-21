import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim().toLowerCase() || "";

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            items: true,
          },
        },
      },
    });

    const customers = users.map((u) => {
      let totalSpent = 0;
      const boughtMap = new Map<
        string,
        {
          productId: string | null;
          title: string;
          totalQuantity: number;
          totalPaid: number;
          orders: { orderNumber: string; date: string; status: string; licenseKey: string | null }[];
        }
      >();

      for (const order of u.orders) {
        if (order.status !== "REJECTED") {
          totalSpent += order.totalAmount;
        }

        for (const item of order.items) {
          const key = item.productTitle;
          const existing = boughtMap.get(key);
          if (existing) {
            existing.totalQuantity += item.quantity;
            existing.totalPaid += item.lineTotal;
            existing.orders.push({
              orderNumber: order.orderNumber,
              date: order.createdAt.toISOString(),
              status: order.status,
              licenseKey: order.adminCustomerNote || null,
            });
          } else {
            boughtMap.set(key, {
              productId: item.productId,
              title: item.productTitle,
              totalQuantity: item.quantity,
              totalPaid: item.lineTotal,
              orders: [
                {
                  orderNumber: order.orderNumber,
                  date: order.createdAt.toISOString(),
                  status: order.status,
                  licenseKey: order.adminCustomerNote || null,
                },
              ],
            });
          }
        }
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        createdAt: u.createdAt,
        totalOrdersCount: u.orders.length,
        totalSpent,
        orders: u.orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          createdAt: o.createdAt,
          status: o.status,
          totalAmount: o.totalAmount,
          currency: o.currency,
          paymentMethodName: o.paymentMethodName,
          licenseKeyNote: o.adminCustomerNote,
          itemsCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
        })),
        everythingBought: Array.from(boughtMap.values()),
      };
    });

    return NextResponse.json({ success: true, customers });
  } catch (error) {
    console.error("Admin customers fetch error:", error);
    return NextResponse.json({ error: "Failed to load customers." }, { status: 500 });
  }
}
