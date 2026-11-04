import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, logAdminAudit } from "@/lib/auth";
import { isValidId, sanitizeString, sanitizeText, sanitizeSafeUrl } from "@/lib/sanitizer";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin("payment-methods");
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid payment method ID." }, { status: 400 });
    }
    const body = await req.json();

    if (body.deepLink && !sanitizeSafeUrl(body.deepLink, { allowedProtocols: ["https:", "http:", "instapay:", "tel:"] })) {
      return NextResponse.json({ error: "Invalid deepLink URL scheme." }, { status: 400 });
    }
    if (body.publicPaymentUrl && !sanitizeSafeUrl(body.publicPaymentUrl, { allowedProtocols: ["https:", "http:"] })) {
      return NextResponse.json({ error: "Invalid publicPaymentUrl scheme." }, { status: 400 });
    }

    const updated = await prisma.paymentMethod.update({
      where: { id },
      data: {
        name: sanitizeString(body.name, 100),
        description: body.description ? sanitizeString(body.description, 500) : null,
        icon: body.icon ? sanitizeString(body.icon, 100) : null,
        instructions: sanitizeText(body.instructions, 3000),
        recipientName: body.recipientName ? sanitizeString(body.recipientName, 120) : null,
        accountDetails: body.accountDetails ? sanitizeString(body.accountDetails, 200) : null,
        currency: body.currency ? sanitizeString(body.currency, 10) : "EGP",
        transferReferenceHint: body.transferReferenceHint ? sanitizeString(body.transferReferenceHint, 200) : null,
        deepLink: body.deepLink ? sanitizeSafeUrl(body.deepLink, { allowedProtocols: ["https:", "http:", "instapay:", "tel:"] }) : null,
        publicPaymentUrl: body.publicPaymentUrl ? sanitizeSafeUrl(body.publicPaymentUrl, { allowedProtocols: ["https:", "http:"] }) : null,
        minAmount: body.minAmount ? Number(body.minAmount) : null,
        maxAmount: body.maxAmount ? Number(body.maxAmount) : null,
        requireScreenshot: Boolean(body.requireScreenshot),
        displayOrder: parseInt(body.displayOrder) || 0,
        isActive: Boolean(body.isActive),
      },
    });

    await logAdminAudit(admin.id, "PAYMENT_METHOD_UPDATED", `Payment method updated: ${updated.name}`);

    return NextResponse.json({ success: true, paymentMethod: updated });
  } catch (error) {
    console.error("Failed to update payment method:", error);
    return NextResponse.json({ error: "Failed to update payment method." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin("payment-methods");
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid payment method ID." }, { status: 400 });
    }
    const deleted = await prisma.paymentMethod.delete({ where: { id } });
    await logAdminAudit(admin.id, "PAYMENT_METHOD_DELETED", `Payment method deleted: ${deleted.name}`);

    return NextResponse.json({ success: true, message: "Payment method removed successfully." });
  } catch (error) {
    console.error("Failed to delete payment method:", error);
    return NextResponse.json({ error: "Failed to delete payment method." }, { status: 500 });
  }
}
