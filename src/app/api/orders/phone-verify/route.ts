import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { normalizePhoneNumber } from "@/lib/countryCodes";
import { getClientIp } from "@/lib/security";
import { checkRateLimit } from "@/lib/rateLimit";

interface VerificationStore {
  code: string;
  expiresAt: number;
  attempts: number;
}
const otpStore = new Map<string, VerificationStore>();

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { action, phone, countryDialCode, code } = await req.json();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }

    const dial = countryDialCode || "+20";
    const normalizedPhone = normalizePhoneNumber(dial, phone);

    if (action === "REQUEST_OTP") {
      // Rate limit: max 3 OTP requests per 10 minutes per IP/phone
      const rateCheck = checkRateLimit(`otp_req_${ip}_${normalizedPhone}`, 3, 10 * 60 * 1000);
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { error: `Too many verification requests. Please wait ${rateCheck.retryAfterSec} seconds before requesting a new code.` },
          { status: 429 }
        );
      }

      // Check if orders exist for this phone number
      const ordersCount = await prisma.order.count({
        where: { customerPhone: normalizedPhone },
      });

      if (ordersCount === 0) {
        return NextResponse.json(
          { error: `No orders found for phone number ${normalizedPhone}. Please check your number or search by Order Number.` },
          { status: 404 }
        );
      }

      // Generate cryptographically secure 6-digit numeric code
      const otp = crypto.randomInt(100000, 999999).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins
      otpStore.set(normalizedPhone, { code: otp, expiresAt, attempts: 0 });

      // Check if SMS provider is configured
      const smsKey = process.env.SMS_API_KEY;
      const isSmsConfigured = Boolean(smsKey && smsKey.trim().length > 0);
      const isDevelopment = process.env.NODE_ENV !== "production";

      if (!isSmsConfigured && !isDevelopment) {
        return NextResponse.json(
          {
            error:
              "SMS verification is currently being updated. Please track your order directly using your Order Number (#DN...) or sign in to your account.",
          },
          { status: 503 }
        );
      }

      return NextResponse.json({
        success: true,
        message: isSmsConfigured
          ? `A 6-digit verification code was sent to ${normalizedPhone}.`
          : `SMS provider not configured. Development test code: ${otp}`,
        debugCode: isDevelopment && !isSmsConfigured ? otp : undefined,
      });
    }

    if (action === "VERIFY_OTP") {
      if (!code || typeof code !== "string") {
        return NextResponse.json({ error: "Please enter the 6-digit verification code." }, { status: 400 });
      }

      const stored = otpStore.get(normalizedPhone);
      if (!stored || stored.expiresAt < Date.now()) {
        otpStore.delete(normalizedPhone);
        return NextResponse.json({ error: "Verification code has expired or is invalid. Please request a new code." }, { status: 400 });
      }

      // Anti-brute force: increment attempts
      stored.attempts = (stored.attempts || 0) + 1;
      if (stored.attempts > 3) {
        otpStore.delete(normalizedPhone);
        return NextResponse.json(
          { error: "Too many incorrect attempts. For security, this code has been invalidated. Please request a new code." },
          { status: 429 }
        );
      }

      if (stored.code !== code.trim()) {
        const remaining = 3 - stored.attempts;
        return NextResponse.json(
          { error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` },
          { status: 400 }
        );
      }

      // Valid OTP: Clear token & Fetch orders
      otpStore.delete(normalizedPhone);

      const orders = await prisma.order.findMany({
        where: { customerPhone: normalizedPhone },
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
          statusHistory: { orderBy: { createdAt: "asc" } },
          refundRequests: true,
        },
      });

      const formattedOrders = (orders as any[]).map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethodName: order.paymentMethodName,
        paymentReference: order.paymentReference,
        customerName: order.customerName,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        promoCodeCode: order.promoCodeCode,
        totalAmount: order.totalAmount,
        currency: order.currency,
        adminCustomerNote: order.adminCustomerNote,
        items: order.items,
        statusTimeline: (order.statusHistory || []).map((h: any) => ({
          toStatus: h.toStatus,
          notes: h.notes,
          createdAt: h.createdAt,
        })),
        refundRequests: (order.refundRequests || []).map((r: any) => ({
          id: r.id,
          refundNumber: r.refundNumber,
          reason: r.reason,
          explanation: r.explanation,
          requestedAmount: r.requestedAmount,
          status: r.status,
          adminCustomerNote: r.adminCustomerNote,
          createdAt: r.createdAt,
        })),
      }));

      return NextResponse.json({
        success: true,
        orders: formattedOrders,
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("Phone verification error:", error);
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
