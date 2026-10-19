import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rateCheck = checkRateLimit(`lookup_${ip}`, 15, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many lookup attempts. Please try again in ${rateCheck.retryAfterSec} seconds.` },
        { status: 429 }
      );
    }

    const { orderNumber, phone, verificationCode } = await req.json();

    if (!orderNumber && !phone) {
      return NextResponse.json({ error: "Please provide an order number or phone number." }, { status: 400 });
    }

    // 1. Order Number Lookup
    if (orderNumber && typeof orderNumber === "string") {
      const cleanOrderNumber = orderNumber.trim().toUpperCase();
      const order = await prisma.order.findUnique({
        where: { orderNumber: cleanOrderNumber },
        include: {
          items: true,
          statusHistory: {
            orderBy: { createdAt: "asc" },
          },
          refundRequests: {
            orderBy: { createdAt: "desc" },
            include: {
              statusHistory: { orderBy: { createdAt: "asc" } },
            },
          },
        },
      });

      if (!order) {
        return NextResponse.json({ error: `Order ${cleanOrderNumber} was not found. Please double-check the order number.` }, { status: 404 });
      }

      // Sanitize sensitive admin notes for public customer view
      const customerSafeOrder = {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethodName: order.paymentMethodName,
        paymentReference: order.paymentReference,
        hasScreenshot: !!order.paymentScreenshotUrl,
        customerName: order.customerName,
        // Mask customer phone & email for privacy
        customerPhoneMasked: order.customerPhone.replace(/(\+\d{2,3})(\d{2,4})(\d+)(\d{2})/, "$1 $2 *** $4"),
        customerEmailMasked: order.customerEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        promoCodeCode: order.promoCodeCode,
        totalAmount: order.totalAmount,
        currency: order.currency,
        adminCustomerNote: order.adminCustomerNote,
        items: order.items.map((i: any) => ({
          id: i.id,
          productTitle: i.productTitle,
          productSlug: i.productSlug,
          productImage: i.productImage,
          quantity: i.quantity,
          salePrice: i.salePrice,
          originalPrice: i.originalPrice,
          discountPercent: i.discountPercent,
          lineTotal: i.lineTotal,
        })),
        statusTimeline: order.statusHistory.map((h: any) => ({
          toStatus: h.toStatus,
          notes: h.notes,
          createdAt: h.createdAt,
        })),
        refundRequests: order.refundRequests.map((r: any) => ({
          id: r.id,
          refundNumber: r.refundNumber,
          reason: r.reason,
          explanation: r.explanation,
          requestedAmount: r.requestedAmount,
          status: r.status,
          adminCustomerNote: r.adminCustomerNote,
          createdAt: r.createdAt,
          statusTimeline: r.statusHistory.map((sh: any) => ({
            toStatus: sh.toStatus,
            notes: sh.notes,
            createdAt: sh.createdAt,
          })),
        })),
      };

      return NextResponse.json({ success: true, order: customerSafeOrder });
    }

    // 2. Phone Lookup with Secure Verification
    // (Handled via phone-verify endpoints)
    return NextResponse.json({ error: "Invalid lookup request." }, { status: 400 });
  } catch (error) {
    console.error("Order lookup error:", error);
    return NextResponse.json({ error: "An error occurred during order lookup." }, { status: 500 });
  }
}
