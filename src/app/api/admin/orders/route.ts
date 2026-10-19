import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "ALL";
    const paymentMethod = searchParams.get("paymentMethod") || "ALL";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "15"));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status !== "ALL") {
      where.status = status;
    }

    if (paymentMethod !== "ALL") {
      where.paymentMethodName = paymentMethod;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { customerEmail: { contains: search } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
          refundRequests: { select: { id: true, refundNumber: true, status: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch admin orders:", error);
    return NextResponse.json({ error: "Failed to load orders." }, { status: 500 });
  }
}
