import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";

export interface ReceiptVerificationParams {
  screenshotUrl: string;
  expectedAmount: number;
  currency?: string;
  expectedRecipientName?: string | null;
  expectedAccountDetails?: string | null;
  paymentMethodName: string;
}

export interface ReceiptVerificationResult {
  status: "VERIFIED" | "DECLINED" | "SKIPPED";
  isValid: boolean;
  rejectionReason?: string | null;
  detectedAmount?: number | null;
  detectedReceiver?: string | null;
  transactionReference?: string | null;
  isSuccessfulTransaction?: boolean;
  amountMatches?: boolean;
  receiverMatches?: boolean;
  note?: string;
}

/**
 * Retrieve the Gemini API key from environment variables or database store settings
 */
export async function getGeminiApiKey(): Promise<{ apiKey: string | null; enabled: boolean }> {
  try {
    const envKey = process.env.GEMINI_API_KEY?.trim() || null;

    const dbSettings = await prisma.storeSetting.findMany({
      where: {
        key: { in: ["gemini_api_key", "gemini_verification_enabled"] },
      },
    });

    const settingsMap: Record<string, string> = {};
    for (const s of dbSettings) {
      settingsMap[s.key] = s.value;
    }

    const apiKey = settingsMap.gemini_api_key?.trim() || envKey;
    const enabled = settingsMap.gemini_verification_enabled !== "false";

    return { apiKey: apiKey || null, enabled };
  } catch (err) {
    console.error("Error retrieving Gemini API settings:", err);
    return { apiKey: process.env.GEMINI_API_KEY?.trim() || null, enabled: true };
  }
}

export interface ResolvedGeminiModel {
  endpointUrl: string;
  modelName: string;
  apiVersion: string;
}

// In-memory cache for resolved model per apiKey to keep calls ultra fast
const modelCache = new Map<string, { resolved: ResolvedGeminiModel; cachedAt: number }>();

/**
 * Automatically return the working Gemini Flash model endpoint for this API key
 */
export async function getAvailableGeminiModel(apiKey: string): Promise<ResolvedGeminiModel> {
  return {
    endpointUrl: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
    modelName: "gemini-3.5-flash",
    apiVersion: "v1beta",
  };
}

/**
 * Retrieve the screenshot image buffer from PostgreSQL or local disk
 */
async function loadScreenshotBuffer(
  screenshotUrl: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const cleanFilename = path.basename(screenshotUrl.split("?")[0]);
    if (!cleanFilename) return null;

    // 1. Try PostgreSQL database first
    const dbFile = await prisma.uploadedFile.findUnique({
      where: { filename: cleanFilename },
    });

    if (dbFile && dbFile.data) {
      return {
        buffer: Buffer.from(dbFile.data),
        mimeType: dbFile.mimeType || "image/jpeg",
      };
    }

    // 2. Fallback to local filesystem storage
    const localPath = path.join(process.cwd(), "storage", "screenshots", cleanFilename);
    if (fs.existsSync(localPath)) {
      const ext = path.extname(cleanFilename).toLowerCase();
      const mime =
        ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      return {
        buffer: fs.readFileSync(localPath),
        mimeType: mime,
      };
    }

    return null;
  } catch (err) {
    console.error("Failed to load screenshot buffer:", err);
    return null;
  }
}

/**
 * Verify a payment receipt screenshot using Google Gemini 1.5 Flash Vision (100% Free Tier)
 */
export async function verifyPaymentReceiptWithGemini(
  params: ReceiptVerificationParams
): Promise<ReceiptVerificationResult> {
  const { apiKey, enabled } = await getGeminiApiKey();

  // If no API key is configured or verification is disabled, skip gracefully so orders still work
  if (!apiKey || !enabled) {
    return {
      status: "SKIPPED",
      isValid: true,
      note: !apiKey
        ? "Verification skipped: GEMINI_API_KEY is not configured."
        : "Verification skipped: Gemini verification disabled in settings.",
    };
  }

  // Load screenshot image data
  const imageData = await loadScreenshotBuffer(params.screenshotUrl);
  if (!imageData) {
    console.warn("Screenshot buffer could not be loaded; passing to manual review.");
    return {
      status: "SKIPPED",
      isValid: true,
      note: "Screenshot file could not be loaded for automatic scanning; passed to manual review.",
    };
  }

  try {
    const base64Image = imageData.buffer.toString("base64");
    const currency = params.currency || "EGP";
    const expectedAmount = Number(params.expectedAmount) || 0;
    const recipientName = (params.expectedRecipientName || "").trim();
    const accountDetails = (params.expectedAccountDetails || "").trim();

    const prompt = `You are an automated financial transaction auditor verifying an uploaded payment receipt or transfer screenshot for an e-commerce order.

--- EXPECTED ORDER DETAILS ---
• Expected Payment Amount: ${expectedAmount} ${currency}
• Expected Store Recipient Name: "${recipientName}"
• Expected Account / Phone / Handle / IBAN: "${accountDetails}"
• Payment Method: "${params.paymentMethodName}"

--- INSTRUCTIONS ---
1. Identify if this image is a genuine payment confirmation receipt / transfer screen (e.g. InstaPay Egypt, Vodafone Cash, Orange Money, Etisalat Cash, Telda, Bank Transfer, CIB, Banque Misr, NBE, PayPal).
   - If it is a meme, product screenshot, selfie, random picture, or not a payment screenshot, mark "isLegitimateReceipt": false.
2. Check Transaction Status:
   - Must be a successful/completed transfer (e.g. "Successful", "تم التحويل بنجاح", "Completed", "Done").
   - If it is "Pending", "Failed", "Cancelled", or an unsubmitted draft/form screen, mark "isSuccessfulTransaction": false.
3. Check Recipient:
   - Does the recipient name, handle (e.g. InstaPay IPA), or wallet phone number match the expected details?
   - Note: Names can be in Arabic or English, or transliterated (e.g., "Ahmed Mohamed" matches "احمد محمد" or "PremiKeys" matches "بريمي كيز").
   - If expected recipient is empty, mark "receiverMatches": true.
4. Check Amount:
   - Does the transferred amount on the receipt match or exceed ${expectedAmount} ${currency}?
   - Allow a tiny tolerance of up to 1.0 unit for rounding. If paid amount is less, mark "amountMatches": false.
5. Extract Transaction Reference:
   - Extract any visible reference number, transaction ID, or operation code.

--- STRICT OUTPUT FORMAT ---
Respond ONLY with a valid JSON object matching this schema:
{
  "isLegitimateReceipt": boolean,
  "isSuccessfulTransaction": boolean,
  "detectedAmount": number or null,
  "amountMatches": boolean,
  "detectedReceiver": string or null,
  "receiverMatches": boolean,
  "transactionReference": string or null,
  "isValid": boolean,
  "rejectionReason": string or null
}

"isValid" MUST be true ONLY if:
- isLegitimateReceipt is true
- isSuccessfulTransaction is true
- amountMatches is true
- receiverMatches is true

If "isValid" is false, "rejectionReason" MUST be a clear, user-friendly explanation in English (e.g. "The receipt shows an amount of 100 EGP, but your order total is 350 EGP", "The recipient name on the receipt does not match our store account", or "The screenshot does not show a completed transaction").`;

    // Resolve best available Gemini Vision model for this API key (auto-discovers gemini-2.0-flash / gemini-1.5-flash)
    const resolved = await getAvailableGeminiModel(apiKey);
    const geminiUrl =
      resolved?.endpointUrl ||
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: imageData.mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.warn(`Gemini API error (HTTP ${apiResponse.status}):`, errText);
      // Fallback: don't crash checkout if Google API has a temporary rate limit or hiccup
      return {
        status: "SKIPPED",
        isValid: true,
        note: `Gemini verification unavailable (${apiResponse.status}); passed to manual review.`,
      };
    }

    const data = await apiResponse.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!candidateText) {
      return {
        status: "SKIPPED",
        isValid: true,
        note: "Empty response from AI vision model; passed to manual review.",
      };
    }

    let parsed: any = null;
    try {
      const cleanJson = candidateText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      const match = candidateText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {}
      }
    }

    if (!parsed || typeof parsed !== "object") {
      console.warn("Failed to parse AI response as JSON:", candidateText);
      return {
        status: "SKIPPED",
        isValid: true,
        note: "Could not parse AI response JSON; passed to manual review.",
      };
    }

    // If Gemini marked it as invalid, decline the order
    if (!parsed.isValid) {
      return {
        status: "DECLINED",
        isValid: false,
        rejectionReason: parsed.rejectionReason || "Payment screenshot verification failed.",
        detectedAmount: parsed.detectedAmount,
        detectedReceiver: parsed.detectedReceiver,
        transactionReference: parsed.transactionReference,
        isSuccessfulTransaction: parsed.isSuccessfulTransaction,
        amountMatches: parsed.amountMatches,
        receiverMatches: parsed.receiverMatches,
      };
    }

    // Anti-Fraud: Check for duplicate transaction reference IDs across past orders
    if (parsed.transactionReference && typeof parsed.transactionReference === "string") {
      const cleanRef = parsed.transactionReference.trim();
      if (cleanRef.length >= 6) {
        const existingOrder = await prisma.order.findFirst({
          where: {
            paymentReference: cleanRef,
          },
          select: { orderNumber: true, createdAt: true },
        });

        if (existingOrder) {
          return {
            status: "DECLINED",
            isValid: false,
            rejectionReason: `This payment transaction reference (${cleanRef}) was already used for order ${existingOrder.orderNumber}. Reusing old receipts is not allowed.`,
            detectedAmount: parsed.detectedAmount,
            detectedReceiver: parsed.detectedReceiver,
            transactionReference: cleanRef,
          };
        }
      }
    }

    return {
      status: "VERIFIED",
      isValid: true,
      detectedAmount: parsed.detectedAmount,
      detectedReceiver: parsed.detectedReceiver,
      transactionReference: parsed.transactionReference,
      isSuccessfulTransaction: true,
      amountMatches: true,
      receiverMatches: true,
    };
  } catch (error: any) {
    console.error("Gemini receipt verification exception:", error);
    // On unexpected parsing or network errors, do not block genuine user checkout
    return {
      status: "SKIPPED",
      isValid: true,
      note: `Verification exception (${error?.message || "unknown"}); passed to manual review.`,
    };
  }
}
