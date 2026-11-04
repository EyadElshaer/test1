import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, logAdminAudit } from "@/lib/auth";
import { sanitizeString } from "@/lib/sanitizer";

export async function GET() {
  try {
    const auth = await requireAdmin("promo-codes");
    if (!auth.authorized) return auth.response;

    const promoCodes = await prisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { usages: true, orders: true } },
      },
    });

    return NextResponse.json({ success: true, promoCodes });
  } catch (error) {
    console.error("Failed to load promo codes:", error);
    return NextResponse.json({ error: "Failed to load promo codes." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin("promo-codes");
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

    const {
      code,
      description,
      discountType,
      discountValue,
      startDate,
      endDate,
      isActive,
      maxUses,
      maxUsesPerCustomer,
      minSubtotal,
      maxDiscountAmount,
      eligibleCategoryIds,
      eligibleProductIds,
      minProductPrice,
    } = await req.json();

    if (!code || isNaN(Number(discountValue)) || Number(discountValue) <= 0) {
      return NextResponse.json({ error: "Code and a positive discount value are required." }, { status: 400 });
    }

    const cleanCode = String(code).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    const existing = await prisma.promoCode.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json({ error: `Promo code '${cleanCode}' already exists.` }, { status: 400 });
    }

    const numVal = Number(discountValue);
    if (discountType !== "FIXED" && numVal > 100) {
      return NextResponse.json({ error: "Percentage discount cannot exceed 100%." }, { status: 400 });
    }

    const promo = await prisma.promoCode.create({
      data: {
        code: cleanCode,
        description: description ? sanitizeString(description, 300) : null,
        discountType: discountType === "FIXED" ? "FIXED" : "PERCENTAGE",
        discountValue: Number(discountValue),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        maxUses: maxUses ? parseInt(maxUses) : null,
        maxUsesPerCustomer: maxUsesPerCustomer ? parseInt(maxUsesPerCustomer) : 1,
        minSubtotal: minSubtotal ? Number(minSubtotal) : null,
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
        eligibleCategoryIds: eligibleCategoryIds ? JSON.stringify(eligibleCategoryIds) : null,
        eligibleProductIds: eligibleProductIds ? JSON.stringify(eligibleProductIds) : null,
        minProductPrice: minProductPrice ? Number(minProductPrice) : null,
      },
    });

    await logAdminAudit(admin.id, "PROMO_CREATED", `Promo code created: ${promo.code}`);

    return NextResponse.json({ success: true, promoCode: promo });
  } catch (error) {
    console.error("Failed to create promo code:", error);
    return NextResponse.json({ error: "Failed to create promo code." }, { status: 500 });
  }
}
