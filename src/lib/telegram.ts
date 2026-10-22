import prisma from "@/lib/prisma";

export interface TelegramConfig {
  botToken?: string;
  chatId?: string;
  enabled?: boolean;
}

/**
 * Retrieve Telegram notification configuration from store settings
 */
export async function getTelegramConfig(): Promise<TelegramConfig> {
  try {
    const settings = await prisma.storeSetting.findMany({
      where: {
        key: {
          in: ["telegram_bot_token", "telegram_chat_id", "telegram_enabled"],
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
    };
  } catch (error) {
    console.error("Failed to fetch Telegram settings:", error);
    return { enabled: false };
  }
}

/**
 * Send a raw Telegram message using a specific bot token and chat ID
 */
export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!token || !chatId) {
      return { success: false, error: "Bot token and Chat ID are required." };
    }

    const cleanToken = token.trim();
    const cleanChatId = chatId.trim();

    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

    const json = await res.json();

    if (!res.ok || !json.ok) {
      return {
        success: false,
        error: json.description || `Telegram API error (status ${res.status})`,
      };
    }

    return { success: true, data: json.result };
  } catch (err: any) {
    console.error("Telegram dispatch error:", err);
    return {
      success: false,
      error: err.message || "Network error connecting to Telegram API.",
    };
  }
}

/**
 * Test sending a test message to verify BotFather token and Chat ID
 */
export async function testTelegramBot(
  token: string,
  chatId: string
): Promise<{ success: boolean; error?: string }> {
  const testText =
    `🚀 *PremiKeys Alert Test*\n\n` +
    `✅ Your Telegram Bot integration is working properly!\n` +
    `You will receive instant alerts on this chat whenever a customer places an order on *PremiKeys*.\n\n` +
    `_Timestamp: ${new Date().toISOString()}_`;

  return await sendTelegramMessage(token, chatId, testText);
}

/**
 * Dispatch an alert when a customer creates a new order
 */
export async function sendTelegramOrderAlert(order: {
  orderNumber: string;
  totalAmount: number;
  currency: string;
  paymentMethodName: string;
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
      // Telegram notifications not enabled or not configured
      return { success: false, skipped: true };
    }

    // Build items bullet list
    const itemsList =
      order.items && order.items.length > 0
        ? order.items
            .map(
              (i) =>
                `• *${escapeMarkdown(i.productTitle)}* × ${i.quantity} — ${i.lineTotal} ${order.currency}`
            )
            .join("\n")
        : "• 1x Order Item";

    const notesBlock = order.customerNotes
      ? `\n📝 *Notes:* _${escapeMarkdown(order.customerNotes)}_`
      : "";

    const message =
      `🔔 *NEW ORDER RECEIVED!* 🔔\n\n` +
      `🧾 *Order Number:* \`${order.orderNumber}\`\n` +
      `💰 *Total:* *${order.totalAmount} ${order.currency}*\n` +
      `💳 *Payment Method:* ${escapeMarkdown(order.paymentMethodName)}\n\n` +
      `👤 *Customer Info:*\n` +
      `• *Name:* ${escapeMarkdown(order.customerName)}\n` +
      `• *Phone:* \`${escapeMarkdown(order.customerPhone)}\`\n` +
      `• *Email:* \`${escapeMarkdown(order.customerEmail)}\`\n\n` +
      `🛒 *Items Ordered:*\n` +
      `${itemsList}\n` +
      notesBlock +
      `\n\n⚡ _Open the Admin Dashboard to verify payment and dispatch keys._`;

    return await sendTelegramMessage(config.botToken, config.chatId, message);
  } catch (err) {
    console.error("Failed to send Telegram order alert:", err);
    return { success: false, error: (err as any)?.message };
  }
}

/**
 * Simple helper to escape special characters for Telegram Markdown (V1)
 */
function escapeMarkdown(text: string): string {
  if (!text) return "";
  // Telegram Markdown V1 requires escaping *, _, `
  return text.replace(/[*_`]/g, " ");
}
