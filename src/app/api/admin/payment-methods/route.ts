import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, logAdminAudit } from "@/lib/auth";
import { sanitizeString, sanitizeText, sanitizeSafeUrl } from "@/lib/sanitizer";

export async function GET() {
  try {
    const auth = await requireAdmin("payment-methods");
    if (!auth.authorized) return auth.response;

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
    const auth = await requireAdmin("payment-methods");
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

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

    if (deepLink && !sanitizeSafeUrl(deepLink, { allowedProtocols: ["https:", "http:", "instapay:", "tel:"] })) {
      return NextResponse.json({ error: "Invalid deepLink URL scheme." }, { status: 400 });
    }
    if (publicPaymentUrl && !sanitizeSafeUrl(publicPaymentUrl, { allowedProtocols: ["https:", "http:"] })) {
      return NextResponse.json({ error: "Invalid publicPaymentUrl scheme." }, { status: 400 });
    }

    const cleanCode = code?.trim()
      ? code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "")
      : name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");

    const method = await prisma.paymentMethod.create({
      data: {
        name: sanitizeString(name, 100),
        code: cleanCode,
        description: description ? sanitizeString(description, 500) : null,
        icon: icon ? sanitizeString(icon, 100) : null,
        instructions: sanitizeText(instructions, 3000),
        recipientName: recipientName ? sanitizeString(recipientName, 120) : null,
        accountDetails: accountDetails ? sanitizeString(accountDetails, 200) : null,
        currency: currency ? sanitizeString(currency, 10) : "EGP",
        transferReferenceHint: transferReferenceHint ? sanitizeString(transferReferenceHint, 200) : null,
        deepLink: deepLink ? sanitizeSafeUrl(deepLink, { allowedProtocols: ["https:", "http:", "instapay:", "tel:"] }) : null,
        publicPaymentUrl: publicPaymentUrl ? sanitizeSafeUrl(publicPaymentUrl, { allowedProtocols: ["https:", "http:"] }) : null,
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
