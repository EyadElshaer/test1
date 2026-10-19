import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        icon: true,
        instructions: true,
        recipientName: true,
        accountDetails: true,
        currency: true,
        transferReferenceHint: true,
        deepLink: true,
        publicPaymentUrl: true,
        minAmount: true,
        maxAmount: true,
        requireScreenshot: true,
      },
    });

    return NextResponse.json({ success: true, paymentMethods });
  } catch (error) {
    console.error("Failed to load payment methods:", error);
    return NextResponse.json({ error: "Failed to load payment methods." }, { status: 500 });
  }
}
