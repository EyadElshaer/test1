import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, logAdminAudit } from "@/lib/auth";
import { isValidId, sanitizeString } from "@/lib/sanitizer";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin("promo-codes");
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid promo code ID." }, { status: 400 });
    }
    const body = await req.json();

    const numVal = Number(body.discountValue);
    if (!body.code || isNaN(numVal) || numVal <= 0) {
      return NextResponse.json({ error: "Valid code and positive discountValue required." }, { status: 400 });
    }
    if (body.discountType !== "FIXED" && numVal > 100) {
      return NextResponse.json({ error: "Percentage discount cannot exceed 100%." }, { status: 400 });
    }

    const updated = await prisma.promoCode.update({
      where: { id },
      data: {
        code: String(body.code).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
        description: body.description ? sanitizeString(body.description, 300) : null,
        discountType: body.discountType === "FIXED" ? "FIXED" : "PERCENTAGE",
        discountValue: Number(body.discountValue),
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        isActive: Boolean(body.isActive),
        maxUses: body.maxUses ? parseInt(body.maxUses) : null,
        maxUsesPerCustomer: body.maxUsesPerCustomer ? parseInt(body.maxUsesPerCustomer) : 1,
        minSubtotal: body.minSubtotal ? Number(body.minSubtotal) : null,
        maxDiscountAmount: body.maxDiscountAmount ? Number(body.maxDiscountAmount) : null,
        eligibleCategoryIds: body.eligibleCategoryIds ? JSON.stringify(body.eligibleCategoryIds) : null,
        eligibleProductIds: body.eligibleProductIds ? JSON.stringify(body.eligibleProductIds) : null,
        minProductPrice: body.minProductPrice ? Number(body.minProductPrice) : null,
      },
    });

    await logAdminAudit(admin.id, "PROMO_UPDATED", `Promo code updated: ${updated.code}`);

    return NextResponse.json({ success: true, promoCode: updated });
  } catch (error) {
    console.error("Failed to update promo code:", error);
    return NextResponse.json({ error: "Failed to update promo code." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin("promo-codes");
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid promo code ID." }, { status: 400 });
    }
    const deleted = await prisma.promoCode.delete({ where: { id } });
    await logAdminAudit(admin.id, "PROMO_DELETED", `Promo code deleted: ${deleted.code}`);

    return NextResponse.json({ success: true, message: "Promo code deleted successfully." });
  } catch (error) {
    console.error("Failed to delete promo code:", error);
    return NextResponse.json({ error: "Failed to delete promo code." }, { status: 500 });
  }
}
