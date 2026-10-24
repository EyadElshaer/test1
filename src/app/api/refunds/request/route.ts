import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateUniqueRefundNumber } from "@/lib/orderNumber";
import { sendTelegramRefundAlert } from "@/lib/telegram";
import { sanitizeString } from "@/lib/sanitizer";
import { getClientIp } from "@/lib/security";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`refund_req_${ip}`, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many refund requests. Please try again in ${rateCheck.retryAfterSec} seconds.` },
        { status: 429 }
      );
    }

    const { orderNumber, reason, explanation, requestedAmount } = await req.json();

    const cleanOrderNumber = sanitizeString(orderNumber, 30).toUpperCase();
    const cleanReason = sanitizeString(reason, 100);
    const cleanExplanation = sanitizeString(explanation, 1000);

    if (!cleanOrderNumber || !cleanReason || !cleanExplanation) {
      return NextResponse.json({ error: "Please provide order number, reason, and an explanation." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: cleanOrderNumber },
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
          reason: cleanReason,
          explanation: cleanExplanation,
          requestedAmount: refundAmount,
          status: "PENDING",
          statusHistory: {
            create: {
              fromStatus: "NONE",
              toStatus: "PENDING",
              changedBy: "CUSTOMER",
              notes: `Refund requested by customer: ${cleanReason}`,
            },
          },
        },
      });

      // Update Order status to REFUND_REQUESTED and record audit history
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "REFUND_REQUESTED",
          statusHistory: {
            create: {
              fromStatus: order.status,
              toStatus: "REFUND_REQUESTED",
              changedBy: "CUSTOMER",
              notes: `Refund requested (${refundNumber}): ${cleanReason} - ${cleanExplanation}`,
            },
          },
        },
      });

      return refund;
    });

    // Dispatch Telegram alert to store admin
    try {
      await sendTelegramRefundAlert({
        id: newRefund.id,
        refundNumber: newRefund.refundNumber,
        orderNumber: order.orderNumber,
        customerName: newRefund.customerName,
        customerPhone: newRefund.customerPhone,
        customerEmail: newRefund.customerEmail,
        requestedAmount: newRefund.requestedAmount,
        currency: order.currency,
        reason: newRefund.reason,
        explanation: newRefund.explanation,
      });
    } catch (telegramErr) {
      console.error("Telegram refund alert error:", telegramErr);
    }

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
