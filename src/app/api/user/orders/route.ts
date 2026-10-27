import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/userAuth";

export async function GET() {
  try {
    const user = await getUserSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orConditions: any[] = [{ userId: user.id }];
    if (user.email) orConditions.push({ customerEmail: user.email.toLowerCase() });
    if (user.phone) orConditions.push({ customerPhone: user.phone });

    const orders = await prisma.order.findMany({
      where: {
        OR: orConditions,
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
        refundRequests: {
          orderBy: { createdAt: "desc" },
          include: { statusHistory: { orderBy: { createdAt: "asc" } } },
        },
      },
    });

    // Sanitize sensitive internal notes before sending to customer
    const sanitizedOrders = orders.map((order: any) => ({
      ...order,
      adminInternalNote: undefined,
      refundRequests: (order.refundRequests || []).map((refund: any) => ({
        ...refund,
        adminInternalNote: undefined,
      })),
    }));

    return NextResponse.json({ success: true, orders: sanitizedOrders });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return NextResponse.json({ error: "Failed to load orders." }, { status: 500 });
  }
}
