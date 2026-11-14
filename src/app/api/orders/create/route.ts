import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { generateUniqueOrderNumber } from "@/lib/orderNumber";
import {
  normalizePhoneNumber,
  findCountryByCode,
  findCountryByDialCode,
  validatePhoneForCountry,
} from "@/lib/countryCodes";
import { getUserSession, createUserSession } from "@/lib/userAuth";
import { sendTelegramOrderAlert } from "@/lib/telegram";
import { sanitizeString } from "@/lib/sanitizer";
import { getClientIp } from "@/lib/security";
import { checkRateLimit } from "@/lib/rateLimit";
import { extractConfigurations } from "@/lib/configurations";
import { syncOrderToGoogleSheets } from "@/lib/googleSheets";
import { verifyPaymentReceiptWithGemini } from "@/lib/geminiReceiptVerifier";

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
    let cleanPaymentRef = paymentReference ? sanitizeString(paymentReference, 100) : null;

    // 1. Validate Customer Information
    if (!cleanCustomerName || cleanCustomerName.length < 2) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }

    const targetCountry = countryCode
      ? findCountryByCode(countryCode)
      : findCountryByDialCode(countryDialCode || "+20");

    const phoneValidation = validatePhoneForCountry(targetCountry, customerPhone);
    if (!phoneValidation.isValid) {
      return NextResponse.json({ error: phoneValidation.error || "Please enter a valid phone number." }, { status: 400 });
    }

    if (!cleanCustomerEmail || !cleanCustomerEmail.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const normalizedPhone = phoneValidation.fullInternationalNumber;

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

    if (paymentScreenshotUrl) {
      if (
        typeof paymentScreenshotUrl !== "string" ||
        !/^\/api\/admin\/screenshots\/proof_[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp|gif)$/i.test(paymentScreenshotUrl)
      ) {
        return NextResponse.json({ error: "Invalid payment screenshot URL format." }, { status: 400 });
      }

      // Prevent reusing a previously uploaded receipt screenshot across multiple orders
      if (!paymentScreenshotUrl.includes("proof_mock_")) {
        const duplicateReceiptOrder = await prisma.order.findFirst({
          where: { paymentScreenshotUrl },
          select: { id: true },
        });
        if (duplicateReceiptOrder) {
          return NextResponse.json(
            { error: "This payment screenshot has already been used for another order. Please upload a fresh receipt." },
            { status: 400 }
          );
        }
      }
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
        attributeValues: true,
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

      if (dbProd.availability === "OUT_OF_STOCK" || (typeof dbProd.stockQuantity === "number" && dbProd.stockQuantity <= 0)) {
        return NextResponse.json({ error: `"${dbProd.title}" is currently out of stock.` }, { status: 400 });
      }

      const qty = Math.max(1, Math.min(50, parseInt(item.quantity) || 1));
      if (typeof dbProd.stockQuantity === "number" && qty > dbProd.stockQuantity) {
        return NextResponse.json(
          { error: `Only ${dbProd.stockQuantity} unit(s) of "${dbProd.title}" are currently available.` },
          { status: 400 }
        );
      }

      // Check for matching configuration
      const prodConfigs = extractConfigurations(dbProd);
      let matchedConfig = null;
      if (item.configurationId) {
        matchedConfig = prodConfigs.find((c) => c.id === item.configurationId);
      }
      if (!matchedConfig && item.configurationName) {
        matchedConfig = prodConfigs.find((c) => c.name.toLowerCase() === item.configurationName.toLowerCase());
      }

      const effectiveSalePrice = matchedConfig ? matchedConfig.salePrice : dbProd.salePrice;
      const effectiveOriginalPrice = matchedConfig ? matchedConfig.originalPrice : dbProd.originalPrice;
      const effectiveDiscount = matchedConfig ? matchedConfig.discountPercent : dbProd.discountPercent;
      const effectiveTitle = matchedConfig ? `${dbProd.title} (${matchedConfig.name})` : dbProd.title;

      const lineTotal = effectiveSalePrice * qty;
      serverSubtotal += lineTotal;

      const primaryImg = dbProd.images[0]?.url || null;

      orderItemsSnapshot.push({
        productId: dbProd.id,
        productTitle: effectiveTitle,
        productSlug: dbProd.slug,
        productImage: primaryImg,
        quantity: qty,
        originalPrice: effectiveOriginalPrice,
        salePrice: effectiveSalePrice,
        discountPercent: effectiveDiscount,
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

        let validPerCustomer = true;
        if (promo.maxUsesPerCustomer && promo.maxUsesPerCustomer > 0) {
          const customerUses = await prisma.promoCodeUsage.count({
            where: {
              promoCodeId: promo.id,
              OR: [
                { customerPhone: normalizedPhone },
                { customerEmail: cleanCustomerEmail },
              ],
            },
          });
          if (customerUses >= promo.maxUsesPerCustomer) {
            validPerCustomer = false;
          }
        }

        if (validDates && validUses && validSubtotal && validPerCustomer) {
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

    // 5.5 Validate Payment Method Min/Max Amount Constraints
    if (typeof paymentMethod.minAmount === "number" && paymentMethod.minAmount > 0 && finalTotal < paymentMethod.minAmount) {
      return NextResponse.json(
        { error: `Minimum order total for ${paymentMethod.name} is ${paymentMethod.minAmount} ${paymentMethod.currency || "EGP"}.` },
        { status: 400 }
      );
    }
    if (typeof paymentMethod.maxAmount === "number" && paymentMethod.maxAmount > 0 && finalTotal > paymentMethod.maxAmount) {
      return NextResponse.json(
        { error: `Maximum order total for ${paymentMethod.name} is ${paymentMethod.maxAmount} ${paymentMethod.currency || "EGP"}.` },
        { status: 400 }
      );
    }

    // 6. Generate Unique Order Number (#DN...)
    const orderNumber = await generateUniqueOrderNumber();

    // Check if user is currently logged in or opted into auto-signup
    let orderUserId: string | null = null;
    const activeSessionUser = await getUserSession();
    if (activeSessionUser) {
      orderUserId = activeSessionUser.id;
    } else if (autoSignup && password && typeof password === "string" && password.length >= 8 && password.length <= 128) {
      const cleanEmail = customerEmail.trim().toLowerCase();
      try {
        let user = await prisma.user.findFirst({
          where: {
            OR: [{ email: cleanEmail }, { phone: normalizedPhone }],
          },
        });

        if (user) {
          // Security: Only link the order and sign in if the caller proves ownership of the existing account
          if (user.passwordHash) {
            const isMatch = await bcrypt.compare(password, user.passwordHash);
            if (isMatch) {
              orderUserId = user.id;
              await createUserSession(user.id, req.headers);
            }
          }
        } else {
          const passwordHash = await bcrypt.hash(password, 12);
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

    // 6.5. Automated Payment Proof Verification (Google Gemini 1.5 Flash - Free Tier)
    let isAiVerified = false;
    let aiVerificationNote = "";
    let aiDetectedAmount: number | null = null;
    let aiDetectedReceiver: string | null = null;
    let initialPaymentStatus = "AWAITING_VERIFICATION";

    if (paymentMethod.requireScreenshot && paymentScreenshotUrl) {
      const customerVisibleNotes = [
        paymentMethod.instructions,
        paymentMethod.description,
        paymentMethod.accountDetails ? `Account / Phone / Wallet: ${paymentMethod.accountDetails}` : null,
        paymentMethod.recipientName ? `Recipient Name: ${paymentMethod.recipientName}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const verification = await verifyPaymentReceiptWithGemini({
        screenshotUrl: paymentScreenshotUrl,
        expectedAmount: finalTotal,
        currency: paymentMethod.currency || "EGP",
        expectedRecipientName: paymentMethod.recipientName,
        expectedAccountDetails: paymentMethod.accountDetails,
        customerVisibleNotes,
        paymentMethodName: paymentMethod.name,
      });

      if (!verification.isValid) {
        // Auto-declined: Screenshot fails amount, receiver name, or authenticity
        return NextResponse.json(
          {
            error: `Payment Proof Verification Declined: ${
              verification.rejectionReason || "The uploaded screenshot does not match the required payment details."
            }`,
          },
          { status: 400 }
        );
      }

      if (verification.status === "VERIFIED") {
        isAiVerified = true;
        initialPaymentStatus = "VERIFIED";
        aiDetectedAmount = verification.detectedAmount || finalTotal;
        aiDetectedReceiver = verification.detectedReceiver || paymentMethod.recipientName || null;
        aiVerificationNote = ` [AI Verified: Matched ${aiDetectedAmount} ${paymentMethod.currency || "EGP"}]`;

        if (!cleanPaymentRef && verification.transactionReference) {
          cleanPaymentRef = verification.transactionReference;
        }
      } else if (verification.status === "SKIPPED" && verification.note) {
        aiVerificationNote = ` [${verification.note}]`;
      }
    }

    // 7. Atomic Database Transaction (prevents race conditions on stock, promo codes, and receipt replay)
    const newOrder = await prisma.$transaction(async (tx: any) => {
      // 7a. Re-verify duplicate screenshot inside transaction to prevent concurrent receipt replay
      if (paymentScreenshotUrl && !paymentScreenshotUrl.includes("proof_mock_")) {
        const dupInTx = await tx.order.findFirst({
          where: { paymentScreenshotUrl },
          select: { id: true },
        });
        if (dupInTx) {
          throw new Error("BUSINESS_ERROR:This payment screenshot has already been used for another order. Please upload a fresh receipt.");
        }
      }

      // 7b. Decrement product stock quantities atomically and verify availability
      for (const itemSnap of orderItemsSnapshot) {
        const stockUpdate = await tx.product.updateMany({
          where: {
            id: itemSnap.productId,
            isPublished: true,
            isArchived: false,
            NOT: { availability: "OUT_OF_STOCK" },
            stockQuantity: { gte: itemSnap.quantity },
          },
          data: {
            stockQuantity: { decrement: itemSnap.quantity },
          },
        });

        if (stockUpdate.count === 0) {
          throw new Error(
            `BUSINESS_ERROR:Insufficient stock for "${itemSnap.productTitle}". Another customer may have just purchased the last available unit.`
          );
        }
      }

      // 7c. Atomically validate and increment promo code usage inside transaction
      let effectivePromoRecord = appliedPromoRecord;
      let effectiveDiscountAmount = promoDiscountAmount;

      if (effectivePromoRecord) {
        let canRedeemInTx = true;

        if (effectivePromoRecord.maxUsesPerCustomer && effectivePromoRecord.maxUsesPerCustomer > 0) {
          const customerUsesInTx = await tx.promoCodeUsage.count({
            where: {
              promoCodeId: effectivePromoRecord.id,
              OR: [
                { customerPhone: normalizedPhone },
                { customerEmail: cleanCustomerEmail },
              ],
            },
          });
          if (customerUsesInTx >= effectivePromoRecord.maxUsesPerCustomer) {
            canRedeemInTx = false;
          }
        }

        if (canRedeemInTx) {
          const promoWhere: any = {
            id: effectivePromoRecord.id,
            isActive: true,
          };
          if (effectivePromoRecord.maxUses && effectivePromoRecord.maxUses > 0) {
            promoWhere.currentUses = { lt: effectivePromoRecord.maxUses };
          }

          const promoUpdate = await tx.promoCode.updateMany({
            where: promoWhere,
            data: { currentUses: { increment: 1 } },
          });

          if (promoUpdate.count === 0) {
            canRedeemInTx = false;
          }
        }

        if (!canRedeemInTx) {
          effectivePromoRecord = null;
          effectiveDiscountAmount = 0;
        }
      }

      const effectiveFinalTotal = Math.max(0, serverSubtotal - effectiveDiscountAmount);

      // 7d. Create order record
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: orderUserId,
          customerName: cleanCustomerName,
          customerPhone: normalizedPhone,
          countryCode: countryCode || "EG",
          customerEmail: cleanCustomerEmail,
          status: "PENDING",
          paymentStatus: initialPaymentStatus,
          paymentMethodId: paymentMethod.id,
          paymentMethodName: paymentMethod.name,
          paymentReference: cleanPaymentRef,
          paymentScreenshotUrl: paymentScreenshotUrl || null,
          subtotal: serverSubtotal,
          discountAmount: effectiveDiscountAmount,
          promoCodeId: effectivePromoRecord?.id || null,
          promoCodeCode: effectivePromoRecord?.code || null,
          totalAmount: effectiveFinalTotal,
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
              notes: `Order created online. Payment method: ${paymentMethod.name}.${aiVerificationNote || " Awaiting manual verification."}`,
            },
          },
        },
        include: {
          items: true,
        },
      });

      // 7e. Record promo code usage linked to the created order
      if (effectivePromoRecord) {
        await tx.promoCodeUsage.create({
          data: {
            promoCodeId: effectivePromoRecord.id,
            orderId: order.id,
            customerPhone: normalizedPhone,
            customerEmail: cleanCustomerEmail,
            discountAmount: effectiveDiscountAmount,
          },
        });
      }

      // 7f. Clear cart for logged-in user upon order completion
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
        aiVerified: isAiVerified,
        detectedAmount: aiDetectedAmount,
        detectedReceiver: aiDetectedReceiver,
        items: newOrder.items.map((i: any) => ({
          productTitle: i.productTitle,
          quantity: i.quantity,
          lineTotal: i.lineTotal,
        })),
      });
    } catch (telegramErr) {
      console.error("Telegram notification error:", telegramErr);
    }

    // Sync order to Google Sheets if configured
    try {
      await syncOrderToGoogleSheets(newOrder);
    } catch (sheetErr) {
      console.warn("Google Sheets order sync note:", sheetErr);
    }

    return NextResponse.json({
      success: true,
      orderNumber: newOrder.orderNumber,
      totalAmount: newOrder.totalAmount,
      currency: newOrder.currency,
      paymentMethodName: newOrder.paymentMethodName,
    });
  } catch (error: any) {
    if (typeof error?.message === "string" && error.message.startsWith("BUSINESS_ERROR:")) {
      return NextResponse.json(
        { error: error.message.replace("BUSINESS_ERROR:", "") },
        { status: 400 }
      );
    }
    console.error("Order creation failed:", error);
    return NextResponse.json({ error: "Failed to create order. Please try again." }, { status: 500 });
  }
}
