import prisma from "@/lib/prisma";

export interface GoogleSheetsConfig {
  webhookUrl?: string;
  enabled?: boolean;
}

/**
 * Retrieve Google Sheets configuration from store settings
 */
export async function getGoogleSheetsConfig(): Promise<GoogleSheetsConfig> {
  try {
    const settings = await prisma.storeSetting.findMany({
      where: {
        key: {
          in: ["google_sheets_webhook_url", "google_sheets_enabled"],
        },
      },
    });

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    return {
      webhookUrl: map.google_sheets_webhook_url?.trim(),
      enabled: map.google_sheets_enabled === "true" || map.google_sheets_enabled === "1",
    };
  } catch (error) {
    console.error("Failed to fetch Google Sheets settings:", error);
    return { enabled: false };
  }
}

/**
 * Format order items array into a readable summary string
 */
function formatItemsSummary(items?: any[]): string {
  if (!items || items.length === 0) return "1x Digital Product";
  return items
    .map((item) => `${item.productTitle || "Item"} (x${item.quantity || 1})`)
    .join(", ");
}

/**
 * Test connectivity with a Google Apps Script Webhook URL
 */
export async function testGoogleSheetsWebhook(webhookUrl?: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    let url = webhookUrl?.trim();
    if (!url) {
      const config = await getGoogleSheetsConfig();
      url = config.webhookUrl;
    }

    if (!url) {
      return { success: false, error: "Please enter a Google Sheets Webhook URL first." };
    }

    if (!url.startsWith("https://script.google.com/macros/s/")) {
      return {
        success: false,
        error: "Invalid Google Apps Script URL. It must begin with https://script.google.com/macros/s/",
      };
    }

    const payload = {
      action: "TEST_PING",
      timestamp: new Date().toISOString(),
      message: "Connection test from PremiKeys Store Admin",
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Google returned HTTP status ${res.status} (${res.statusText})`,
      };
    }

    const responseText = await res.text();
    let json: any = {};
    try {
      json = JSON.parse(responseText);
    } catch {
      // Some scripts return plain text
      if (responseText.toLowerCase().includes("success")) {
        return { success: true, message: responseText };
      }
    }

    if (json.status === "error") {
      return { success: false, error: json.message || "Google Apps Script error" };
    }

    return {
      success: true,
      message: json.message || "Successfully connected to Google Sheet!",
    };
  } catch (err: any) {
    console.error("testGoogleSheetsWebhook error:", err);
    return { success: false, error: err?.message || "Failed to contact Google Apps Script." };
  }
}

/**
 * Sync a single order to Google Sheets
 */
export async function syncOrderToGoogleSheets(orderOrId: any): Promise<{
  success: boolean;
  skipped?: boolean;
  error?: string;
}> {
  try {
    const config = await getGoogleSheetsConfig();
    if (!config.enabled || !config.webhookUrl) {
      return { success: false, skipped: true };
    }

    let orderData = orderOrId;
    if (typeof orderOrId === "string") {
      orderData = await prisma.order.findUnique({
        where: { id: orderOrId },
        include: { items: true },
      });
    } else if (!orderData.items && orderData.id) {
      const freshOrder = await prisma.order.findUnique({
        where: { id: orderData.id },
        include: { items: true },
      });
      if (freshOrder) orderData = freshOrder;
    }

    if (!orderData || !orderData.orderNumber) {
      return { success: false, error: "Order not found or missing orderNumber." };
    }

    const payload = {
      action: "UPSERT_ORDER",
      order: {
        orderNumber: orderData.orderNumber,
        createdAt: orderData.createdAt ? new Date(orderData.createdAt).toISOString() : new Date().toISOString(),
        customerName: orderData.customerName || "Customer",
        customerPhone: orderData.customerPhone || "",
        customerEmail: orderData.customerEmail || "",
        itemsSummary: formatItemsSummary(orderData.items),
        totalAmount: orderData.totalAmount || 0,
        currency: orderData.currency || "EGP",
        subtotal: orderData.subtotal || orderData.totalAmount || 0,
        discountAmount: orderData.discountAmount || 0,
        promoCodeCode: orderData.promoCodeCode || "None",
        paymentMethodName: orderData.paymentMethodName || "Manual",
        paymentReference: orderData.paymentReference || "",
        paymentScreenshotUrl: orderData.paymentScreenshotUrl || null,
        status: orderData.status || "PENDING",
        paymentStatus: orderData.paymentStatus || "AWAITING_VERIFICATION",
        customerNotes: orderData.customerNotes || "",
        adminCustomerNote: orderData.adminCustomerNote || "",
        adminInternalNote: orderData.adminInternalNote || "",
      },
    };

    const res = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    if (!res.ok) {
      console.warn("Google Sheets sync responded with non-200:", res.status);
      return { success: false, error: `HTTP ${res.status}` };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Failed to sync order to Google Sheets:", err);
    return { success: false, error: err?.message };
  }
}

/**
 * Bulk sync all existing orders to Google Sheets
 */
export async function syncAllOrdersToGoogleSheets(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    const config = await getGoogleSheetsConfig();
    if (!config.enabled || !config.webhookUrl) {
      return {
        success: false,
        count: 0,
        error: "Google Sheets sync is not enabled or Webhook URL is missing in Admin Settings.",
      };
    }

    const allOrders = await prisma.order.findMany({
      orderBy: { createdAt: "asc" },
      include: { items: true },
    });

    if (allOrders.length === 0) {
      return { success: true, count: 0 };
    }

    const formattedOrders = allOrders.map((ord) => ({
      orderNumber: ord.orderNumber,
      createdAt: ord.createdAt ? new Date(ord.createdAt).toISOString() : new Date().toISOString(),
      customerName: ord.customerName || "Customer",
      customerPhone: ord.customerPhone || "",
      customerEmail: ord.customerEmail || "",
      itemsSummary: formatItemsSummary(ord.items),
      totalAmount: ord.totalAmount || 0,
      currency: ord.currency || "EGP",
      subtotal: ord.subtotal || ord.totalAmount || 0,
      discountAmount: ord.discountAmount || 0,
      promoCodeCode: ord.promoCodeCode || "None",
      paymentMethodName: ord.paymentMethodName || "Manual",
      paymentReference: ord.paymentReference || "",
      paymentScreenshotUrl: ord.paymentScreenshotUrl || null,
      status: ord.status || "PENDING",
      paymentStatus: ord.paymentStatus || "AWAITING_VERIFICATION",
      customerNotes: ord.customerNotes || "",
      adminCustomerNote: ord.adminCustomerNote || "",
      adminInternalNote: ord.adminInternalNote || "",
    }));

    const payload = {
      action: "BATCH_UPSERT",
      orders: formattedOrders,
    };

    const res = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    if (!res.ok) {
      return {
        success: false,
        count: 0,
        error: `Google Sheets returned HTTP status ${res.status}`,
      };
    }

    return { success: true, count: formattedOrders.length };
  } catch (err: any) {
    console.error("Failed to batch sync orders to Google Sheets:", err);
    return { success: false, count: 0, error: err?.message };
  }
}
