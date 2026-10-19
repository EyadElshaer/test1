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

    const where: any = {};
    if (status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { refundNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { customerEmail: { contains: search } },
        { order: { orderNumber: { contains: search } } },
      ];
    }

    const refunds = await prisma.refundRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            orderNumber: true,
            totalAmount: true,
            paymentMethodName: true,
            paymentScreenshotUrl: true,
            status: true,
            createdAt: true,
          },
        },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json({ success: true, refunds });
  } catch (error) {
    console.error("Failed to fetch admin refunds:", error);
    return NextResponse.json({ error: "Failed to load refund requests." }, { status: 500 });
  }
}
