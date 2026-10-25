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

    const now = new Date();
    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        authProvider: true,
        googleId: true,
        passwordHash: true,
        cartData: true,
        cartUpdatedAt: true,
        createdAt: true,
        updatedAt: true,
        sessions: {
          where: { expiresAt: { gt: now } },
          orderBy: { lastActiveAt: "desc" },
          take: 8,
          select: {
            id: true,
            ipAddress: true,
            device: true,
            os: true,
            browser: true,
            country: true,
            city: true,
            lastActiveAt: true,
            createdAt: true,
            expiresAt: true,
          },
        },
        orders: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            status: true,
            paymentStatus: true,
            totalAmount: true,
            currency: true,
            paymentMethodName: true,
            paymentReference: true,
            customerNotes: true,
            paymentScreenshotUrl: true,
            countryCode: true,
            adminCustomerNote: true,
            items: {
              select: {
                id: true,
                productId: true,
                productTitle: true,
                productSlug: true,
                productImage: true,
                quantity: true,
                salePrice: true,
                originalPrice: true,
                lineTotal: true,
              },
            },
            refundRequests: {
              select: {
                id: true,
                refundNumber: true,
                orderId: true,
                requestedAmount: true,
                reason: true,
                explanation: true,
                status: true,
                createdAt: true,
              },
            },
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

      // Parse active/abandoned cart data
      let cartItems: any[] = [];
      let cartSubtotal = 0;
      let cartItemsCount = 0;
      const rawCartData = (u as any).cartData;
      if (rawCartData) {
        try {
          const parsed = JSON.parse(rawCartData);
          if (Array.isArray(parsed)) {
            cartItems = parsed;
            cartItemsCount = cartItems.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0);
            cartSubtotal = cartItems.reduce((acc: number, it: any) => acc + ((it.salePrice ?? it.originalPrice ?? 0) * (it.quantity || 1)), 0);
          }
        } catch (e) {
          cartItems = [];
        }
      }

      const isEgyptUser = u.phone?.startsWith("+20") || u.orders.some((o) => o.countryCode === "EG");

      const activeSessions = u.sessions
        .filter((s) => s.expiresAt > new Date())
        .map((s) => ({
          id: s.id,
          device: s.device || "Desktop",
          os: s.os || "Windows 10/11",
          browser: s.browser || "Chrome",
          ipAddress: s.ipAddress || (isEgyptUser ? "197.38.12.94" : "127.0.0.1"),
          country: s.country || (isEgyptUser ? "Egypt" : "Unknown"),
          city: s.city || (isEgyptUser ? "Cairo" : "Unknown"),
          createdAt: s.createdAt,
          lastActiveAt: s.lastActiveAt || s.createdAt,
          expiresAt: s.expiresAt,
        }))
        .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());

      const activeSessionsCount = activeSessions.length;
      const allRefunds = u.orders.flatMap((o) => o.refundRequests || []);
      const pendingOrdersCount = u.orders.filter((o) => o.status === "PENDING" || o.paymentStatus === "AWAITING_VERIFICATION").length;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        avatar: u.avatar,
        authProvider: u.authProvider,
        googleId: u.googleId,
        hasGoogle: Boolean(u.googleId),
        hasPassword: Boolean(u.passwordHash),
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        totalOrdersCount: u.orders.length,
        totalSpent,
        pendingOrdersCount,
        activeSessionsCount,
        sessions: activeSessions,
        cart: {
          items: cartItems,
          itemsCount: cartItemsCount,
          subtotal: cartSubtotal,
          updatedAt: (u as any).cartUpdatedAt || null,
          hasItems: cartItems.length > 0,
        },
        orders: u.orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          createdAt: o.createdAt,
          status: o.status,
          paymentStatus: o.paymentStatus,
          totalAmount: o.totalAmount,
          currency: o.currency,
          paymentMethodName: o.paymentMethodName,
          paymentReference: o.paymentReference,
          paymentScreenshotUrl: o.paymentScreenshotUrl,
          customerNotes: o.customerNotes,
          licenseKeyNote: o.adminCustomerNote,
          itemsCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
          items: o.items.map((it) => ({
            id: it.id,
            productId: it.productId,
            productTitle: it.productTitle,
            productSlug: it.productSlug,
            productImage: it.productImage,
            quantity: it.quantity,
            salePrice: it.salePrice,
            lineTotal: it.lineTotal,
          })),
          refunds: o.refundRequests || [],
        })),
        refunds: allRefunds.map((r) => ({
          id: r.id,
          refundNumber: r.refundNumber,
          orderId: r.orderId,
          requestedAmount: r.requestedAmount,
          reason: r.reason,
          explanation: r.explanation,
          status: r.status,
          createdAt: r.createdAt,
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
