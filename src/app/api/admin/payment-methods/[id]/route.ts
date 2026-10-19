import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession, logAdminAudit } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const updated = await prisma.paymentMethod.update({
      where: { id },
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        icon: body.icon || null,
        instructions: body.instructions.trim(),
        recipientName: body.recipientName?.trim() || null,
        accountDetails: body.accountDetails?.trim() || null,
        currency: body.currency || "EGP",
        transferReferenceHint: body.transferReferenceHint?.trim() || null,
        deepLink: body.deepLink?.trim() || null,
        publicPaymentUrl: body.publicPaymentUrl?.trim() || null,
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
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const deleted = await prisma.paymentMethod.delete({ where: { id } });
    await logAdminAudit(admin.id, "PAYMENT_METHOD_DELETED", `Payment method deleted: ${deleted.name}`);

    return NextResponse.json({ success: true, message: "Payment method removed successfully." });
  } catch (error) {
    console.error("Failed to delete payment method:", error);
    return NextResponse.json({ error: "Failed to delete payment method." }, { status: 500 });
  }
}
