import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateUniqueRefundNumber } from "@/lib/orderNumber";

export async function POST(req: Request) {
  try {
    const { orderNumber, reason, explanation, requestedAmount } = await req.json();

    if (!orderNumber || !reason || !explanation) {
      return NextResponse.json({ error: "Please provide order number, reason, and an explanation." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: orderNumber.trim().toUpperCase() },
      include: { refundRequests: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Check if there is already a pending or approved refund request
    const existingActive = (order.refundRequests as any[]).find(
      (r: any) => r.status === "PENDING" || r.status === "APPROVED" || r.status === "DONE"
    );

    if (existingActive) {
      return NextResponse.json(
        { error: `This order already has a refund request (${existingActive.refundNumber}) in status: ${existingActive.status}.` },
        { status: 400 }
      );
    }

    const refundAmount = Number(requestedAmount) > 0 ? Number(requestedAmount) : order.totalAmount;
    if (refundAmount > order.totalAmount) {
      return NextResponse.json(
        { error: "Requested refund amount cannot exceed the total order amount." },
        { status: 400 }
      );
    }

    const refundNumber = await generateUniqueRefundNumber();

    const newRefund = await prisma.$transaction(async (tx: any) => {
      const refund = await tx.refundRequest.create({
        data: {
          refundNumber,
          orderId: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          reason: reason.trim(),
          explanation: explanation.trim(),
          requestedAmount: refundAmount,
          status: "PENDING",
          statusHistory: {
            create: {
              fromStatus: "NONE",
              toStatus: "PENDING",
              changedBy: "CUSTOMER",
              notes: `Refund requested by customer: ${reason}`,
            },
          },
        },
      });
      return refund;
    });

    return NextResponse.json({
      success: true,
      refundNumber: newRefund.refundNumber,
      message: "Refund request submitted successfully! Our support team will review your request.",
    });
  } catch (error) {
    console.error("Refund submission error:", error);
    return NextResponse.json({ error: "Failed to submit refund request." }, { status: 500 });
  }
}
