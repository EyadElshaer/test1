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

    const updated = await prisma.promoCode.update({
      where: { id },
      data: {
        code: body.code.trim().toUpperCase(),
        description: body.description?.trim() || null,
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
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const deleted = await prisma.promoCode.delete({ where: { id } });
    await logAdminAudit(admin.id, "PROMO_DELETED", `Promo code deleted: ${deleted.code}`);

    return NextResponse.json({ success: true, message: "Promo code deleted successfully." });
  } catch (error) {
    console.error("Failed to delete promo code:", error);
    return NextResponse.json({ error: "Failed to delete promo code." }, { status: 500 });
  }
}
