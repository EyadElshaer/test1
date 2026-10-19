import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession, logAdminAudit } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const paymentMethods = await prisma.paymentMethod.findMany({
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json({ success: true, paymentMethods });
  } catch (error) {
    console.error("Failed to load payment methods:", error);
    return NextResponse.json({ error: "Failed to load payment methods." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      code,
      description,
      icon,
      instructions,
      recipientName,
      accountDetails,
      currency,
      transferReferenceHint,
      deepLink,
      publicPaymentUrl,
      minAmount,
      maxAmount,
      requireScreenshot,
      displayOrder,
      isActive,
    } = await req.json();

    if (!name || !instructions) {
      return NextResponse.json({ error: "Name and payment instructions are required." }, { status: 400 });
    }

    const cleanCode = code?.trim()
      ? code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "")
      : name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");

    const method = await prisma.paymentMethod.create({
      data: {
        name: name.trim(),
        code: cleanCode,
        description: description?.trim() || null,
        icon: icon || null,
        instructions: instructions.trim(),
        recipientName: recipientName?.trim() || null,
        accountDetails: accountDetails?.trim() || null,
        currency: currency || "EGP",
        transferReferenceHint: transferReferenceHint?.trim() || null,
        deepLink: deepLink?.trim() || null,
        publicPaymentUrl: publicPaymentUrl?.trim() || null,
        minAmount: minAmount ? Number(minAmount) : null,
        maxAmount: maxAmount ? Number(maxAmount) : null,
        requireScreenshot: requireScreenshot !== undefined ? Boolean(requireScreenshot) : true,
        displayOrder: parseInt(displayOrder) || 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    await logAdminAudit(admin.id, "PAYMENT_METHOD_CREATED", `Payment method created: ${method.name}`);

    return NextResponse.json({ success: true, paymentMethod: method });
  } catch (error) {
    console.error("Failed to create payment method:", error);
    return NextResponse.json({ error: "Failed to create payment method." }, { status: 500 });
  }
}
