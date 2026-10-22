import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";

export interface TelegramConfig {
  botToken?: string;
  chatId?: string;
  enabled?: boolean;
  siteUrl?: string;
}

/**
 * Retrieve Telegram notification configuration from store settings
 */
export async function getTelegramConfig(): Promise<TelegramConfig> {
  try {
    const settings = await prisma.storeSetting.findMany({
      where: {
        key: {
          in: ["telegram_bot_token", "telegram_chat_id", "telegram_enabled", "site_url"],
        },
      },
    });

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    return {
      botToken: map.telegram_bot_token?.trim(),
      chatId: map.telegram_chat_id?.trim(),
      enabled: map.telegram_enabled === "true" || map.telegram_enabled === "1",
      siteUrl: map.site_url?.trim() || "https://premikeys.com",
    };
  } catch (error) {
    console.error("Failed to fetch Telegram settings:", error);
    return { enabled: false };
  }
}

/**
 * Answer a callback query popup in Telegram
 */
export async function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
  text: string,
  showAlert: boolean = false
) {
  try {
    const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      }),
    });
  } catch (err) {
    console.error("Failed to answer callback query:", err);
  }
}

/**
 * Edit message caption (for photo messages)
 */
export async function editMessageCaption(
  token: string,
  chatId: string | number,
  messageId: number,
  caption: string,
  replyMarkup?: any
) {
  try {
    const url = `https://api.telegram.org/bot${token}/editMessageCaption`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        caption,
        parse_mode: "HTML",
        reply_markup: replyMarkup,
      }),
    });
  } catch (err) {
    console.error("Failed to edit message caption:", err);
  }
}

/**
 * Edit text message
 */
export async function editMessageText(
  token: string,
  chatId: string | number,
  messageId: number,
  text: string,
  replyMarkup?: any
) {
  try {
    const url = `https://api.telegram.org/bot${token}/editMessageText`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "HTML",
        reply_markup: replyMarkup,
      }),
    });
  } catch (err) {
    console.error("Failed to edit message text:", err);
  }
}

/**
 * Dispatch an alert when a customer creates a new order
 */
export async function sendTelegramOrderAlert(order: {
  id?: string;
  orderNumber: string;
  totalAmount: number;
  subtotal?: number;
  discountAmount?: number;
  promoCodeCode?: string | null;
  currency: string;
  paymentMethodName: string;
  paymentReference?: string | null;
  paymentScreenshotUrl?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNotes?: string | null;
  items?: Array<{
    productTitle: string;
    quantity: number;
    lineTotal: number;
  }>;
}) {
  try {
    const config = await getTelegramConfig();

    if (!config.enabled || !config.botToken || !config.chatId) {
      return { success: false, skipped: true };
    }

    const token = config.botToken;
    const chatId = config.chatId;
    const siteUrl = config.siteUrl || "https://premikeys.com";

    // 1. Format order items summary
    const itemsSummary =
      order.items && order.items.length > 0
        ? order.items
            .map(
              (i) =>
                `• <b>${escapeHtml(i.productTitle)}</b> × ${i.quantity} (${i.lineTotal} ${order.currency})`
            )
            .join("\n")
        : "• 1x Digital Product";

    // 2. Format promo code information
    let promoLine = "None";
    if (order.promoCodeCode) {
      const disc = order.discountAmount ? ` (-${order.discountAmount} ${order.currency})` : "";
      promoLine = `<code>${escapeHtml(order.promoCodeCode)}</code>${disc}`;
    }

    // 3. Format customer notes
    const notesBlock = order.customerNotes?.trim()
      ? `\n📝 <b>Customer Notes:</b> <i>"${escapeHtml(order.customerNotes.trim())}"</i>\n`
      : "";

    // 4. Format payment reference
    const refLine = order.paymentReference?.trim()
      ? `\n🔖 <b>Reference No:</b> <code>${escapeHtml(order.paymentReference.trim())}</code>`
      : "";

    // 5. Build rich HTML message
    const messageHtml =
      `🔔 <b>NEW ORDER RECEIVED!</b> 🔔\n\n` +
      `🧾 <b>Order:</b> <code>${order.orderNumber}</code>\n` +
      `💰 <b>Total:</b> <b>${order.totalAmount} ${order.currency}</b>` +
      (order.subtotal && order.discountAmount && order.discountAmount > 0
        ? ` <i>(Subtotal: ${order.subtotal} ${order.currency})</i>`
        : "") +
      `\n💳 <b>Payment:</b> ${escapeHtml(order.paymentMethodName)}${refLine}\n\n` +
      `👤 <b>Customer Details:</b>\n` +
      `• <b>Name:</b> ${escapeHtml(order.customerName)}\n` +
      `• <b>Phone:</b> <code>${escapeHtml(order.customerPhone)}</code>\n` +
      `• <b>Email:</b> <code>${escapeHtml(order.customerEmail)}</code>\n\n` +
      `🎟 <b>Promo Code:</b> ${promoLine}\n\n` +
      `🛒 <b>Items:</b>\n` +
      `${itemsSummary}\n` +
      notesBlock +
      `\n⚡ <i>Click below to approve or reject directly from Telegram:</i>`;

    // 6. Build interactive keyboard buttons
    const orderId = order.id || order.orderNumber;
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ Approve Order", callback_data: `ord_app:${orderId}` },
          { text: "❌ Reject Order", callback_data: `ord_rej:${orderId}` },
        ],
        [
          {
            text: "🖥 Open in Admin Dashboard",
            url: `${siteUrl}/admin/orders?search=${encodeURIComponent(order.orderNumber)}`,
          },
        ],
      ],
    };

    // 7. Check if screenshot exists and retrieve buffer
    let screenshotBuffer: Buffer | null = null;
    let screenshotMime = "image/jpeg";
    let screenshotFilename = "payment_receipt.jpg";

    if (order.paymentScreenshotUrl) {
      const cleanFilename = path.basename(order.paymentScreenshotUrl.split("?")[0]);
      if (cleanFilename && cleanFilename.startsWith("proof_")) {
        try {
          // Check database storage first
          const dbFile = await prisma.uploadedFile.findUnique({
            where: { filename: cleanFilename },
          });

          if (dbFile && dbFile.data) {
            screenshotBuffer = Buffer.from(dbFile.data);
            screenshotMime = dbFile.mimeType || "image/jpeg";
            screenshotFilename = cleanFilename;
          } else {
            // Check disk storage
            const diskPath = path.join(process.cwd(), "storage", "screenshots", cleanFilename);
            if (fs.existsSync(diskPath)) {
              screenshotBuffer = fs.readFileSync(diskPath);
              screenshotFilename = cleanFilename;
            }
          }
        } catch (e) {
          console.warn("Could not load screenshot for Telegram dispatch:", e);
        }
      }
    }

    // 8. If screenshot exists, send as Photo with caption & buttons
    if (screenshotBuffer) {
      // Telegram photo caption has a 1024 char limit
      const safeCaption =
        messageHtml.length > 1000 ? messageHtml.slice(0, 995) + "...</i>" : messageHtml;

      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append(
        "photo",
        new Blob([new Uint8Array(screenshotBuffer)], { type: screenshotMime }),
        screenshotFilename
      );
      formData.append("caption", safeCaption);
      formData.append("parse_mode", "HTML");
      formData.append("reply_markup", JSON.stringify(inlineKeyboard));

      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.ok) {
        return { success: true, messageId: json.result?.message_id };
      }
      console.warn("sendPhoto failed, falling back to sendMessage:", json);
    }

    // 9. Fallback: send text message with inline buttons
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageHtml,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: inlineKeyboard,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      return { success: false, error: json.description || "Telegram API error" };
    }

    return { success: true, messageId: json.result?.message_id };
  } catch (err: any) {
    console.error("Failed to send Telegram order alert:", err);
    return { success: false, error: err?.message };
  }
}

/**
 * Dispatch an alert when a customer requests a refund
 */
export async function sendTelegramRefundAlert(refund: {
  id: string;
  refundNumber: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  requestedAmount: number;
  currency?: string;
  reason: string;
  explanation: string;
}) {
  try {
    const config = await getTelegramConfig();

    if (!config.enabled || !config.botToken || !config.chatId) {
      return { success: false, skipped: true };
    }

    const token = config.botToken;
    const chatId = config.chatId;
    const siteUrl = config.siteUrl || "https://premikeys.com";
    const curr = refund.currency || "EGP";

    const messageHtml =
      `🔄 <b>NEW REFUND REQUEST!</b> 🔄\n\n` +
      `🎫 <b>Refund Request:</b> <code>${refund.refundNumber}</code>\n` +
      `🧾 <b>For Order:</b> <code>${refund.orderNumber}</code>\n` +
      `💵 <b>Amount Requested:</b> <b>${refund.requestedAmount} ${curr}</b>\n\n` +
      `👤 <b>Customer Details:</b>\n` +
      `• <b>Name:</b> ${escapeHtml(refund.customerName)}\n` +
      `• <b>Phone:</b> <code>${escapeHtml(refund.customerPhone)}</code>\n` +
      `• <b>Email:</b> <code>${escapeHtml(refund.customerEmail)}</code>\n\n` +
      `❓ <b>Reason:</b> ${escapeHtml(refund.reason)}\n` +
      `📝 <b>Customer Explanation:</b>\n` +
      `<i>"${escapeHtml(refund.explanation)}"</i>\n\n` +
      `⚡ <i>Click below to approve or decline directly:</i>`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ Approve Refund", callback_data: `ref_app:${refund.id}` },
          { text: "❌ Decline Refund", callback_data: `ref_dec:${refund.id}` },
        ],
        [
          {
            text: "🖥 Open Refunds in Dashboard",
            url: `${siteUrl}/admin/refunds`,
          },
        ],
      ],
    };

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageHtml,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: inlineKeyboard,
      }),
    });

    const json = await res.json();
    return { success: json.ok, data: json.result };
  } catch (err: any) {
    console.error("Failed to send Telegram refund alert:", err);
    return { success: false, error: err?.message };
  }
}

/**
 * Handle incoming callback query when admin presses an inline button in Telegram
 */
export async function handleTelegramCallbackQuery(callbackQuery: any): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const config = await getTelegramConfig();
    if (!config.botToken || !config.chatId) {
      return { success: false, message: "Telegram bot not configured" };
    }

    const token = config.botToken;
    const queryId = callbackQuery.id;
    const data = callbackQuery.data as string;
    const fromId = String(callbackQuery.from?.id);
    const chat = callbackQuery.message?.chat;
    const messageId = callbackQuery.message?.message_id;
    const hasPhoto = Boolean(callbackQuery.message?.photo);
    const originalText = callbackQuery.message?.caption || callbackQuery.message?.text || "";

    // Security check: only allow actions from the authorized admin chat ID
    if (String(chat?.id) !== String(config.chatId) && fromId !== String(config.chatId)) {
      await answerCallbackQuery(
        token,
        queryId,
        "⛔ Unauthorized. Only the configured administrator can approve or reject orders.",
        true
      );
      return { success: false, message: "Unauthorized" };
    }

    // 1. Order Approval: ord_app:<orderIdOrNumber>
    if (data.startsWith("ord_app:")) {
      const orderTarget = data.replace("ord_app:", "").trim();

      const order = await prisma.order.findFirst({
        where: {
          OR: [{ id: orderTarget }, { orderNumber: orderTarget }],
        },
      });

      if (!order) {
        await answerCallbackQuery(token, queryId, "❌ Order not found in database.", true);
        return { success: false, message: "Order not found" };
      }

      if (order.status === "APPROVED" || order.status === "DONE") {
        await answerCallbackQuery(
          token,
          queryId,
          `ℹ️ Order ${order.orderNumber} is already marked as ${order.status}.`,
          true
        );
        return { success: true };
      }

      // Answer Telegram IMMEDIATELY so the button spinner stops and user gets immediate feedback (<100ms)
      await answerCallbackQuery(
        token,
        queryId,
        `✅ Order ${order.orderNumber} Approved! Updating website...`
      );

      // Update Order in database
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "APPROVED",
            paymentStatus: "VERIFIED",
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: "APPROVED",
            changedBy: `TELEGRAM_BOT (@${callbackQuery.from?.username || fromId})`,
            notes: "Payment approved and verified directly via Telegram Bot button.",
          },
        });
      });

      // Auto-delete screenshot to free storage space
      if (order.paymentScreenshotUrl) {
        const filename = path.basename(order.paymentScreenshotUrl.split("?")[0]);
        prisma.uploadedFile
          .deleteMany({ where: { filename } })
          .catch((e) => console.warn("Screenshot purge err:", e));
        try {
          const diskPath = path.join(process.cwd(), "storage", "screenshots", filename);
          if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
        } catch {}
      }

      // Format concise, high-visibility updated banner (well under 1024 char limit)
      const adminName = callbackQuery.from?.username
        ? `@${callbackQuery.from.username}`
        : callbackQuery.from?.first_name || "Admin";

      const updatedCard =
        `✅ <b>ORDER APPROVED &amp; VERIFIED</b> ✅\n\n` +
        `🧾 <b>Order:</b> <code>${order.orderNumber}</code>\n` +
        `💰 <b>Total:</b> <b>${order.totalAmount} ${order.currency}</b>\n` +
        `👤 <b>Customer:</b> ${escapeHtml(order.customerName)} (<code>${escapeHtml(order.customerPhone)}</code>)\n` +
        `💳 <b>Payment:</b> ${escapeHtml(order.paymentMethodName)}\n` +
        `📅 <b>Processed:</b> ${new Date().toLocaleTimeString()} by ${escapeHtml(adminName)}\n\n` +
        `⚡ <i>Status updated to APPROVED on website. Payment verified.</i>`;

      const updatedKeyboard = {
        inline_keyboard: [
          [{ text: "🟢 Status: APPROVED (Verified)", callback_data: "noop" }],
          [
            {
              text: "🖥 Open in Admin Dashboard",
              url: `${config.siteUrl}/admin/orders?search=${encodeURIComponent(order.orderNumber)}`,
            },
          ],
        ],
      };

      if (hasPhoto) {
        await editMessageCaption(token, chat.id, messageId, updatedCard, updatedKeyboard);
      } else {
        await editMessageText(token, chat.id, messageId, updatedCard, updatedKeyboard);
      }

      return { success: true, message: `Order ${order.orderNumber} approved` };
    }

    // 2. Order Rejection: ord_rej:<orderIdOrNumber>
    if (data.startsWith("ord_rej:")) {
      const orderTarget = data.replace("ord_rej:", "").trim();

      const order = await prisma.order.findFirst({
        where: {
          OR: [{ id: orderTarget }, { orderNumber: orderTarget }],
        },
      });

      if (!order) {
        await answerCallbackQuery(token, queryId, "❌ Order not found.", true);
        return { success: false, message: "Order not found" };
      }

      // Answer Telegram immediately
      await answerCallbackQuery(
        token,
        queryId,
        `❌ Order ${order.orderNumber} Rejected. Updating website...`
      );

      // Update Order in database
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "REJECTED",
            paymentStatus: "REJECTED",
            rejectionReason: "Payment transfer proof rejected by admin via Telegram.",
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: "REJECTED",
            changedBy: `TELEGRAM_BOT (@${callbackQuery.from?.username || fromId})`,
            notes: "Order transfer proof rejected directly via Telegram Bot button.",
          },
        });
      });

      // Auto-delete screenshot
      if (order.paymentScreenshotUrl) {
        const filename = path.basename(order.paymentScreenshotUrl.split("?")[0]);
        prisma.uploadedFile
          .deleteMany({ where: { filename } })
          .catch((e) => console.warn("Screenshot purge err:", e));
        try {
          const diskPath = path.join(process.cwd(), "storage", "screenshots", filename);
          if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
        } catch {}
      }

      const adminName = callbackQuery.from?.username
        ? `@${callbackQuery.from.username}`
        : callbackQuery.from?.first_name || "Admin";

      const updatedCard =
        `❌ <b>ORDER REJECTED BY ADMIN</b> ❌\n\n` +
        `🧾 <b>Order:</b> <code>${order.orderNumber}</code>\n` +
        `💰 <b>Total:</b> <b>${order.totalAmount} ${order.currency}</b>\n` +
        `👤 <b>Customer:</b> ${escapeHtml(order.customerName)} (<code>${escapeHtml(order.customerPhone)}</code>)\n` +
        `💳 <b>Payment:</b> ${escapeHtml(order.paymentMethodName)}\n` +
        `📅 <b>Processed:</b> ${new Date().toLocaleTimeString()} by ${escapeHtml(adminName)}\n\n` +
        `⚡ <i>Order status updated to REJECTED on website. Transfer proof declined.</i>`;

      const updatedKeyboard = {
        inline_keyboard: [
          [{ text: "🔴 Status: REJECTED", callback_data: "noop" }],
          [
            {
              text: "🖥 Open in Admin Dashboard",
              url: `${config.siteUrl}/admin/orders?search=${encodeURIComponent(order.orderNumber)}`,
            },
          ],
        ],
      };

      if (hasPhoto) {
        await editMessageCaption(token, chat.id, messageId, updatedCard, updatedKeyboard);
      } else {
        await editMessageText(token, chat.id, messageId, updatedCard, updatedKeyboard);
      }

      return { success: true, message: `Order ${order.orderNumber} rejected` };
    }

    // 3. Refund Approval: ref_app:<refundId>
    if (data.startsWith("ref_app:")) {
      const refundId = data.replace("ref_app:", "").trim();

      const refund = await prisma.refundRequest.findUnique({
        where: { id: refundId },
        include: { order: true },
      });

      if (!refund) {
        await answerCallbackQuery(token, queryId, "❌ Refund request not found.", true);
        return { success: false, message: "Refund not found" };
      }

      await answerCallbackQuery(
        token,
        queryId,
        `✅ Refund ${refund.refundNumber} Approved! Updating website...`
      );

      await prisma.$transaction(async (tx) => {
        await tx.refundRequest.update({
          where: { id: refund.id },
          data: {
            status: "APPROVED",
            adminCustomerNote: "Refund approved by store administration via Telegram.",
          },
        });

        await tx.refundStatusHistory.create({
          data: {
            refundRequestId: refund.id,
            fromStatus: refund.status,
            toStatus: "APPROVED",
            changedBy: `TELEGRAM_BOT (@${callbackQuery.from?.username || fromId})`,
            notes: "Refund approved directly via Telegram Bot button.",
          },
        });

        if (refund.order) {
          await tx.order.update({
            where: { id: refund.order.id },
            data: {
              status: "REFUND_APPROVED",
              paymentStatus: "REFUNDED",
            },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: refund.order.id,
              fromStatus: refund.order.status,
              toStatus: "REFUND_APPROVED",
              changedBy: `TELEGRAM_BOT (@${callbackQuery.from?.username || fromId})`,
              notes: `Refund ${refund.refundNumber} approved via Telegram.`,
            },
          });
        }
      });

      const adminName = callbackQuery.from?.username
        ? `@${callbackQuery.from.username}`
        : callbackQuery.from?.first_name || "Admin";

      const updatedCard =
        `✅ <b>REFUND APPROVED VIA TELEGRAM</b> ✅\n\n` +
        `🎫 <b>Refund Request:</b> <code>${refund.refundNumber}</code>\n` +
        `🧾 <b>Order:</b> <code>${refund.order?.orderNumber || "N/A"}</code>\n` +
        `💵 <b>Amount:</b> <b>${refund.requestedAmount} ${refund.order?.currency || "EGP"}</b>\n` +
        `👤 <b>Customer:</b> ${escapeHtml(refund.customerName)} (<code>${escapeHtml(refund.customerPhone)}</code>)\n` +
        `📅 <b>Processed:</b> ${new Date().toLocaleTimeString()} by ${escapeHtml(adminName)}\n\n` +
        `⚡ <i>Refund approved. Order status changed to REFUND_APPROVED on website.</i>`;

      const updatedKeyboard = {
        inline_keyboard: [
          [{ text: "🟢 Refund Status: APPROVED", callback_data: "noop" }],
          [{ text: "🖥 Open Refunds in Dashboard", url: `${config.siteUrl}/admin/refunds` }],
        ],
      };

      await editMessageText(token, chat.id, messageId, updatedCard, updatedKeyboard);
      return { success: true };
    }

    // 4. Refund Decline: ref_dec:<refundId>
    if (data.startsWith("ref_dec:")) {
      const refundId = data.replace("ref_dec:", "").trim();

      const refund = await prisma.refundRequest.findUnique({
        where: { id: refundId },
        include: { order: true },
      });

      if (!refund) {
        await answerCallbackQuery(token, queryId, "❌ Refund request not found.", true);
        return { success: false, message: "Refund not found" };
      }

      await answerCallbackQuery(
        token,
        queryId,
        `❌ Refund ${refund.refundNumber} Declined. Updating website...`
      );

      await prisma.$transaction(async (tx) => {
        await tx.refundRequest.update({
          where: { id: refund.id },
          data: {
            status: "DECLINED",
            adminCustomerNote: "Refund request was declined by store management.",
          },
        });

        await tx.refundStatusHistory.create({
          data: {
            refundRequestId: refund.id,
            fromStatus: refund.status,
            toStatus: "DECLINED",
            changedBy: `TELEGRAM_BOT (@${callbackQuery.from?.username || fromId})`,
            notes: "Refund declined directly via Telegram Bot button.",
          },
        });

        if (refund.order) {
          await tx.order.update({
            where: { id: refund.order.id },
            data: { status: "DONE" },
          });
        }
      });

      const adminName = callbackQuery.from?.username
        ? `@${callbackQuery.from.username}`
        : callbackQuery.from?.first_name || "Admin";

      const updatedCard =
        `❌ <b>REFUND DECLINED VIA TELEGRAM</b> ❌\n\n` +
        `🎫 <b>Refund Request:</b> <code>${refund.refundNumber}</code>\n` +
        `🧾 <b>Order:</b> <code>${refund.order?.orderNumber || "N/A"}</code>\n` +
        `💵 <b>Amount:</b> <b>${refund.requestedAmount} ${refund.order?.currency || "EGP"}</b>\n` +
        `👤 <b>Customer:</b> ${escapeHtml(refund.customerName)} (<code>${escapeHtml(refund.customerPhone)}</code>)\n` +
        `📅 <b>Processed:</b> ${new Date().toLocaleTimeString()} by ${escapeHtml(adminName)}\n\n` +
        `⚡ <i>Refund request was declined by store administration.</i>`;

      const updatedKeyboard = {
        inline_keyboard: [
          [{ text: "🔴 Refund Status: DECLINED", callback_data: "noop" }],
          [{ text: "🖥 Open Refunds in Dashboard", url: `${config.siteUrl}/admin/refunds` }],
        ],
      };

      await editMessageText(token, chat.id, messageId, updatedCard, updatedKeyboard);
      return { success: true };
    }

    if (data === "noop") {
      await answerCallbackQuery(token, queryId, "This status has already been finalized.");
      return { success: true };
    }

    await answerCallbackQuery(token, queryId, "Action processed.");
    return { success: true };
  } catch (err: any) {
    console.error("handleTelegramCallbackQuery error:", err);
    return { success: false, message: err?.message };
  }
}

/**
 * Poll pending updates from Telegram (useful for local development or background checks)
 */
export async function pollTelegramUpdates(): Promise<{ processed: number; error?: string }> {
  try {
    const config = await getTelegramConfig();
    if (!config.botToken) return { processed: 0 };

    const token = config.botToken;

    // Fetch last stored update offset
    const offsetSetting = await prisma.storeSetting.findUnique({
      where: { key: "telegram_last_update_id" },
    });
    const lastOffset = offsetSetting ? parseInt(offsetSetting.value, 10) : 0;

    const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastOffset + 1}&limit=20&timeout=0`;
    const res = await fetch(url);
    const json = await res.json();

    if (!json.ok || !Array.isArray(json.result)) {
      return { processed: 0, error: json.description };
    }

    const updates = json.result;
    let maxUpdateId = lastOffset;
    let processedCount = 0;

    for (const update of updates) {
      if (update.update_id > maxUpdateId) {
        maxUpdateId = update.update_id;
      }

      if (update.callback_query) {
        await handleTelegramCallbackQuery(update.callback_query);
        processedCount++;
      }
    }

    if (maxUpdateId > lastOffset) {
      await prisma.storeSetting.upsert({
        where: { key: "telegram_last_update_id" },
        update: { value: String(maxUpdateId) },
        create: { key: "telegram_last_update_id", value: String(maxUpdateId) },
      });
    }

    return { processed: processedCount };
  } catch (err: any) {
    console.error("pollTelegramUpdates error:", err);
    return { processed: 0, error: err?.message };
  }
}

/**
 * Test sending a test message to verify BotFather token and Chat ID
 */
export async function testTelegramBot(
  token: string,
  chatId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const testText =
      `🚀 <b>PremiKeys Telegram Bot Active!</b>\n\n` +
      `✅ Your Telegram Bot integration is working properly!\n` +
      `You will receive instant alerts on this chat whenever a customer places an order or requests a refund on <b>PremiKeys</b>.\n\n` +
      `⚡ <i>Interactive buttons will allow you to approve or reject orders directly from this chat.</i>\n\n` +
      `<i>Timestamp: ${new Date().toISOString()}</i>`;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: testText,
        parse_mode: "HTML",
      }),
    });

    const json = await res.json();
    if (!json.ok) {
      return { success: false, error: json.description || "Failed to deliver test message" };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error connecting to Telegram" };
  }
}

/**
 * Register public Webhook URL with Telegram
 */
export async function setTelegramWebhook(
  token: string,
  webhookUrl: string
): Promise<{ success: boolean; description?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
      }),
    });
    const json = await res.json();
    return { success: json.ok, description: json.description };
  } catch (err: any) {
    return { success: false, description: err?.message };
  }
}

/**
 * Get current webhook status from Telegram
 */
export async function getTelegramWebhookInfo(token: string): Promise<any> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const json = await res.json();
    return json.result || null;
  } catch {
    return null;
  }
}

function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
