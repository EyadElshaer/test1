import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { generateUniqueOrderNumber } from "@/lib/orderNumber";
import { normalizePhoneNumber } from "@/lib/countryCodes";
import { getUserSession, createUserSession } from "@/lib/userAuth";
import { sendTelegramOrderAlert } from "@/lib/telegram";
import { sanitizeString } from "@/lib/sanitizer";
import { getClientIp } from "@/lib/security";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`order_create_${ip}`, 15, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many order creation requests. Please wait ${rateCheck.retryAfterSec} seconds before trying again.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      customerName,
      customerPhone,
      countryDialCode,
      countryCode,
      customerEmail,
      paymentMethodId,
      paymentReference,
      paymentScreenshotUrl,
      promoCode,
      customerNotes,
      items,
      autoSignup,
      password,
    } = body;

    const cleanCustomerName = sanitizeString(customerName, 80);
    const cleanCustomerEmail = sanitizeString(customerEmail, 100).toLowerCase();
    const cleanCustomerNotes = customerNotes ? sanitizeString(customerNotes, 500) : null;
    const cleanPaymentRef = paymentReference ? sanitizeString(paymentReference, 100) : null;

    // 1. Validate Customer Information
    if (!cleanCustomerName || cleanCustomerName.length < 2) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }
    if (!customerPhone || typeof customerPhone !== "string" || customerPhone.trim().length < 6) {
      return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
    }
    if (!cleanCustomerEmail || !cleanCustomerEmail.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const dial = countryDialCode || "+20";
    const normalizedPhone = normalizePhoneNumber(dial, customerPhone.trim());

    // 2. Validate Items
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Your shopping cart is empty." }, { status: 400 });
    }

    // 3. Validate Payment Method
    if (!paymentMethodId) {
      return NextResponse.json({ error: "Please select a payment method." }, { status: 400 });
    }

    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod || !paymentMethod.isActive) {
      return NextResponse.json({ error: "The selected payment method is unavailable." }, { status: 400 });
    }

    if (paymentMethod.requireScreenshot && !paymentScreenshotUrl) {
      return NextResponse.json(
        { error: `Payment receipt screenshot is required for ${paymentMethod.name}. Please upload your transfer confirmation.` },
        { status: 400 }
      );
    }

    // 4. Fetch Products from DB & Recompute Totals on Server
    const productIds = items.map((i: any) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isPublished: true,
        isArchived: false,
      },
      include: {
        images: { orderBy: { displayOrder: "asc" }, take: 1 },
      },
    });

    if (dbProducts.length !== productIds.length) {
      return NextResponse.json(
        { error: "One or more products in your cart are no longer available. Please review your cart." },
        { status: 400 }
      );
    }

    const dbProductMap = new Map((dbProducts as any[]).map((p: any) => [p.id, p]));

    let serverSubtotal = 0;
    const orderItemsSnapshot: {
      productId: string;
      productTitle: string;
      productSlug: string;
      productImage: string | null;
      quantity: number;
      originalPrice: number;
      salePrice: number;
      discountPercent: number;
      lineTotal: number;
    }[] = [];

    for (const item of items) {
      const dbProd: any = dbProductMap.get(item.productId);
      if (!dbProd) {
        return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 400 });
      }

      if (dbProd.availability === "OUT_OF_STOCK") {
        return NextResponse.json({ error: `"${dbProd.title}" is currently out of stock.` }, { status: 400 });
      }

      const qty = Math.max(1, parseInt(item.quantity) || 1);
      const lineTotal = dbProd.salePrice * qty;
      serverSubtotal += lineTotal;

      const primaryImg = dbProd.images[0]?.url || null;

      orderItemsSnapshot.push({
        productId: dbProd.id,
        productTitle: dbProd.title,
        productSlug: dbProd.slug,
        productImage: primaryImg,
        quantity: qty,
        originalPrice: dbProd.originalPrice,
        salePrice: dbProd.salePrice,
        discountPercent: dbProd.discountPercent,
        lineTotal,
      });
    }

    // 5. Server-side Promo Code Revalidation & Calculation
    let promoDiscountAmount = 0;
    let appliedPromoRecord: any = null;

    if (promoCode && typeof promoCode === "string" && promoCode.trim()) {
      const codeClean = promoCode.trim().toUpperCase();
      const promo = await prisma.promoCode.findUnique({
        where: { code: codeClean },
      });

      if (promo && promo.isActive) {
        const now = new Date();
        const validDates = (!promo.startDate || promo.startDate <= now) && (!promo.endDate || promo.endDate >= now);
        const validUses = !promo.maxUses || promo.currentUses < promo.maxUses;
        const validSubtotal = !promo.minSubtotal || serverSubtotal >= promo.minSubtotal;

        if (validDates && validUses && validSubtotal) {
          // Check item eligibility & minProductPrice
          let qualifyingSubtotal = 0;
          let eligiblePIds: string[] = [];
          try {
            if (promo.eligibleProductIds) eligiblePIds = JSON.parse(promo.eligibleProductIds);
          } catch (e) {}

          for (const itemSnap of orderItemsSnapshot) {
            if (promo.minProductPrice && itemSnap.salePrice < promo.minProductPrice) {
              continue;
            }
            if (eligiblePIds.length > 0 && !eligiblePIds.includes(itemSnap.productId)) {
              continue;
            }
            qualifyingSubtotal += itemSnap.salePrice * itemSnap.quantity;
          }

          if (qualifyingSubtotal > 0) {
            if (promo.discountType === "PERCENTAGE") {
              promoDiscountAmount = Math.round((qualifyingSubtotal * promo.discountValue) / 100);
              if (promo.maxDiscountAmount && promoDiscountAmount > promo.maxDiscountAmount) {
                promoDiscountAmount = promo.maxDiscountAmount;
              }
            } else {
              promoDiscountAmount = Math.min(promo.discountValue, qualifyingSubtotal);
            }
            promoDiscountAmount = Math.min(promoDiscountAmount, serverSubtotal);
            appliedPromoRecord = promo;
          }
        }
      }
    }

    const finalTotal = Math.max(0, serverSubtotal - promoDiscountAmount);

    // 6. Generate Unique Order Number (#DN...)
    const orderNumber = await generateUniqueOrderNumber();

    // Check if user is currently logged in or opted into auto-signup
    let orderUserId: string | null = null;
    const activeSessionUser = await getUserSession();
    if (activeSessionUser) {
      orderUserId = activeSessionUser.id;
    } else if (autoSignup && password && password.length >= 6) {
      const cleanEmail = customerEmail.trim().toLowerCase();
      try {
        let user = await prisma.user.findFirst({
          where: {
            OR: [{ email: cleanEmail }, { phone: normalizedPhone }],
          },
        });

        if (user) {
          orderUserId = user.id;
          const isMatch = await bcrypt.compare(password, user.passwordHash);
          if (isMatch) {
            await createUserSession(user.id, req.headers);
          }
        } else {
          const passwordHash = await bcrypt.hash(password, 10);
          user = await prisma.user.create({
            data: {
              name: cleanCustomerName,
              email: cleanEmail,
              phone: normalizedPhone,
              passwordHash,
            },
          });
          orderUserId = user.id;
          await createUserSession(user.id, req.headers);
        }
      } catch (authErr) {
        console.warn("Auto-signup note:", authErr);
      }
    }

    // 7. Atomic Database Transaction
    const newOrder = await prisma.$transaction(async (tx: any) => {
      // Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: orderUserId,
          customerName: cleanCustomerName,
          customerPhone: normalizedPhone,
          countryCode: countryCode || "EG",
          customerEmail: cleanCustomerEmail,
          status: "PENDING",
          paymentStatus: "AWAITING_VERIFICATION",
          paymentMethodId: paymentMethod.id,
          paymentMethodName: paymentMethod.name,
          paymentReference: cleanPaymentRef,
          paymentScreenshotUrl: paymentScreenshotUrl || null,
          subtotal: serverSubtotal,
          discountAmount: promoDiscountAmount,
          promoCodeId: appliedPromoRecord?.id || null,
          promoCodeCode: appliedPromoRecord?.code || null,
          totalAmount: finalTotal,
          currency: paymentMethod.currency || "EGP",
          customerNotes: cleanCustomerNotes,
          items: {
            create: orderItemsSnapshot.map((item) => ({
              productId: item.productId,
              productTitle: item.productTitle,
              productSlug: item.productSlug,
              productImage: item.productImage,
              quantity: item.quantity,
              originalPrice: item.originalPrice,
              salePrice: item.salePrice,
              discountPercent: item.discountPercent,
              lineTotal: item.lineTotal,
            })),
          },
          statusHistory: {
            create: {
              fromStatus: "NONE",
              toStatus: "PENDING",
              changedBy: "CUSTOMER",
              notes: `Order created online. Payment method: ${paymentMethod.name}. Awaiting manual verification.`,
            },
          },
        },
        include: {
          items: true,
        },
      });

      // Update promo code usage count
      if (appliedPromoRecord) {
        await tx.promoCode.update({
          where: { id: appliedPromoRecord.id },
          data: { currentUses: { increment: 1 } },
        });

        await tx.promoCodeUsage.create({
          data: {
            promoCodeId: appliedPromoRecord.id,
            orderId: order.id,
            customerPhone: normalizedPhone,
            customerEmail: customerEmail.trim().toLowerCase(),
            discountAmount: promoDiscountAmount,
          },
        });
      }

      // Clear cart for logged-in user upon order completion
      if (orderUserId) {
        await (tx.user as any).update({
          where: { id: orderUserId },
          data: { cartData: null, cartUpdatedAt: new Date() },
        }).catch(() => {});
      }

      return order;
    });

    // Dispatch Telegram notification with payment screenshot & interactive action buttons
    try {
      await sendTelegramOrderAlert({
        id: newOrder.id,
        orderNumber: newOrder.orderNumber,
        totalAmount: newOrder.totalAmount,
        subtotal: newOrder.subtotal,
        discountAmount: newOrder.discountAmount,
        promoCodeCode: newOrder.promoCodeCode,
        currency: newOrder.currency,
        paymentMethodName: newOrder.paymentMethodName,
        paymentReference: newOrder.paymentReference,
        paymentScreenshotUrl: newOrder.paymentScreenshotUrl,
        customerName: newOrder.customerName,
        customerPhone: newOrder.customerPhone,
        customerEmail: newOrder.customerEmail,
        customerNotes: newOrder.customerNotes,
        items: newOrder.items.map((i: any) => ({
          productTitle: i.productTitle,
          quantity: i.quantity,
          lineTotal: i.lineTotal,
        })),
      });
    } catch (telegramErr) {
      console.error("Telegram notification error:", telegramErr);
    }

    return NextResponse.json({
      success: true,
      orderNumber: newOrder.orderNumber,
      totalAmount: newOrder.totalAmount,
      currency: newOrder.currency,
      paymentMethodName: newOrder.paymentMethodName,
    });
  } catch (error) {
    console.error("Order creation failed:", error);
    return NextResponse.json({ error: "Failed to create order. Please try again." }, { status: 500 });
  }
}
