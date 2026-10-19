import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { normalizePhoneNumber } from "@/lib/countryCodes";

interface VerificationStore {
  code: string;
  expiresAt: number;
}
const otpStore = new Map<string, VerificationStore>();

export async function POST(req: Request) {
  try {
    const { action, phone, countryDialCode, code } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }

    const dial = countryDialCode || "+20";
    const normalizedPhone = normalizePhoneNumber(dial, phone);

    if (action === "REQUEST_OTP") {
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

      // Generate 6 digit numeric code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins
      otpStore.set(normalizedPhone, { code: otp, expiresAt });

      console.log(`[SMS OTP VERIFICATION] Verification code for ${normalizedPhone}: ${otp}`);

      // Check if SMS provider is configured
      const smsKey = process.env.SMS_API_KEY;
      const isSmsConfigured = Boolean(smsKey && smsKey.trim().length > 0);

      return NextResponse.json({
        success: true,
        message: isSmsConfigured
          ? `A 6-digit verification code was sent to ${normalizedPhone}.`
          : `SMS provider not configured in .env. For testing, your verification code is: ${otp}`,
        debugCode: isSmsConfigured ? undefined : otp,
      });
    }

    if (action === "VERIFY_OTP") {
      if (!code) {
        return NextResponse.json({ error: "Please enter the 6-digit verification code." }, { status: 400 });
      }

      const stored = otpStore.get(normalizedPhone);
      if (!stored || stored.expiresAt < Date.now()) {
        return NextResponse.json({ error: "Verification code has expired or is invalid. Please request a new code." }, { status: 400 });
      }

      if (stored.code !== code.trim()) {
        return NextResponse.json({ error: "Incorrect verification code. Please try again." }, { status: 400 });
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
        refundRequests: order.refundRequests,
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
