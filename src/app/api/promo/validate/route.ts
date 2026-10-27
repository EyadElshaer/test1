import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getClientIp } from "@/lib/security";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`promo_val_${ip}`, 20, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          valid: false,
          message: `Too many promo code attempts. Please wait ${rateCheck.retryAfterSec} seconds.`,
        },
        { status: 429 }
      );
    }

    const { code, subtotal, items } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ valid: false, message: "Promo code is required." }, { status: 400 });
    }

    const promo = await prisma.promoCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!promo || !promo.isActive) {
      return NextResponse.json({ valid: false, message: "This promo code is invalid or no longer active." }, { status: 400 });
    }

    const now = new Date();
    if (promo.startDate && promo.startDate > now) {
      return NextResponse.json({ valid: false, message: "This promo code has not started yet." }, { status: 400 });
    }
    if (promo.endDate && promo.endDate < now) {
      return NextResponse.json({ valid: false, message: "This promo code has expired." }, { status: 400 });
    }

    if (promo.maxUses && promo.currentUses >= promo.maxUses) {
      return NextResponse.json({ valid: false, message: "This promo code has reached its maximum global usage limit." }, { status: 400 });
    }

    const orderSubtotal = Number(subtotal) || 0;
    if (promo.minSubtotal && orderSubtotal < promo.minSubtotal) {
      return NextResponse.json({
        valid: false,
        message: `This code requires a minimum order subtotal of ${promo.minSubtotal} EGP.`,
      }, { status: 400 });
    }

    // Determine eligible items and eligible subtotal
    let eligibleSubtotal = orderSubtotal;
    let eligibleProductIds: string[] = [];
    let eligibleCategoryIds: string[] = [];

    try {
      if (promo.eligibleProductIds) eligibleProductIds = JSON.parse(promo.eligibleProductIds);
    } catch (e) { /* ignore */ }
    try {
      if (promo.eligibleCategoryIds) eligibleCategoryIds = JSON.parse(promo.eligibleCategoryIds);
    } catch (e) { /* ignore */ }

    // If item details provided, calculate item-level qualification including minProductPrice
    if (Array.isArray(items) && items.length > 0) {
      let qualifyingSum = 0;
      for (const item of items) {
        const itemPrice = Number(item.price) || 0;
        const itemQty = Number(item.quantity) || 1;

        // Check minProductPrice rule: "The promo code does not apply to products priced below a specified minimum price."
        if (promo.minProductPrice && itemPrice < promo.minProductPrice) {
          continue; // Item does not qualify
        }

        // Check product ID whitelist if set
        if (eligibleProductIds.length > 0 && !eligibleProductIds.includes(item.productId)) {
          continue;
        }

        qualifyingSum += itemPrice * itemQty;
      }

      if (qualifyingSum <= 0) {
        return NextResponse.json({
          valid: false,
          message: promo.minProductPrice 
            ? `This code only applies to qualifying items priced at ${promo.minProductPrice} EGP or higher.`
            : "None of the items in your cart are eligible for this promo code.",
        }, { status: 400 });
      }

      eligibleSubtotal = qualifyingSum;
    }

    let discountAmount = 0;
    if (promo.discountType === "PERCENTAGE") {
      discountAmount = Math.round((eligibleSubtotal * promo.discountValue) / 100);
      if (promo.maxDiscountAmount && discountAmount > promo.maxDiscountAmount) {
        discountAmount = promo.maxDiscountAmount;
      }
    } else {
      // FIXED discount
      discountAmount = Math.min(promo.discountValue, eligibleSubtotal);
    }

    // Safety checks: discount cannot exceed order subtotal
    discountAmount = Math.min(discountAmount, orderSubtotal);

    return NextResponse.json({
      valid: true,
      discountAmount,
      promo: {
        id: promo.id,
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        description: promo.description,
      },
    });
  } catch (error) {
    console.error("Promo validation error:", error);
    return NextResponse.json({ valid: false, message: "Error validating promo code." }, { status: 500 });
  }
}
