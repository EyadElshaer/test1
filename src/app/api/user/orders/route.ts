import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/userAuth";

export async function GET() {
  try {
    const user = await getUserSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Security: Strictly return orders explicitly bound to this authenticated user's account ID.
    // Guest orders (userId: null) must not be exposed merely because an unverified email/phone matches.
    const orders = await prisma.order.findMany({
      where: {
        userId: user.id,
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
