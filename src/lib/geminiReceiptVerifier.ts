import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";

export interface ReceiptVerificationParams {
  screenshotUrl: string;
  expectedAmount: number;
  currency?: string;
  expectedRecipientName?: string | null;
  expectedAccountDetails?: string | null;
  customerVisibleNotes?: string | null;
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
let cachedApiKey: string | null = process.env.GEMINI_API_KEY?.trim() || null;
let cachedEnabled: boolean = true;
let lastCacheTime = 0;

/**
 * Retrieve the Gemini API key from environment variables or database store settings
 */
export async function getGeminiApiKey(): Promise<{ apiKey: string | null; enabled: boolean }> {
  const envKey = process.env.GEMINI_API_KEY?.trim() || null;
  if (envKey) {
    cachedApiKey = envKey;
    return { apiKey: envKey, enabled: true };
  }

  // Use cached key if retrieved within last 5 minutes
  if (cachedApiKey && Date.now() - lastCacheTime < 300000) {
    return { apiKey: cachedApiKey, enabled: cachedEnabled };
  }

  try {
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

    cachedApiKey = apiKey || null;
    cachedEnabled = enabled;
    lastCacheTime = Date.now();

    return { apiKey: apiKey || null, enabled };
  } catch (err) {
    console.warn("Could not query storeSetting for Gemini key, falling back to cache/env:", err);
    return { apiKey: cachedApiKey || envKey || null, enabled: cachedEnabled };
  }
}

export interface ResolvedGeminiModel {
  endpointUrl: string;
  modelName: string;
  apiVersion: string;
}

/**
 * Retrieve the screenshot image buffer from local disk or PostgreSQL
 */
async function loadScreenshotBuffer(
  screenshotUrl: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const cleanFilename = path.basename(screenshotUrl.split("?")[0]);
    if (!cleanFilename) return null;

    // 1. Try local filesystem storage first (ultra-fast 0ms, immune to DB connection pool latency)
    const candidateDirs = [
      path.join(process.cwd(), "storage", "screenshots"),
      "C:\\Users\\ayman\\Documents\\test3\\storage\\screenshots",
      "C:\\Users\\ayman\\Documents\\test1\\storage\\screenshots",
    ];

    for (const dir of candidateDirs) {
      const candidatePath = path.join(dir, cleanFilename);
      if (fs.existsSync(candidatePath)) {
        const ext = path.extname(cleanFilename).toLowerCase();
        const mime =
          ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
        return {
          buffer: fs.readFileSync(candidatePath),
          mimeType: mime,
        };
      }
    }

    // 2. Fallback to PostgreSQL database storage
    const dbFile = await prisma.uploadedFile.findUnique({
      where: { filename: cleanFilename },
    });

    if (dbFile && dbFile.data) {
      return {
        buffer: Buffer.from(dbFile.data),
        mimeType: dbFile.mimeType || "image/jpeg",
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
    const customerNotes = (params.customerVisibleNotes || "").trim();

    const prompt = `You are an automated financial transaction auditor verifying an uploaded payment transfer receipt or transaction screenshot for an e-commerce order.

--- EXPECTED ORDER & STORE DETAILS ---
• Expected Order Amount: ${expectedAmount} ${currency}
• Expected Store Recipient Name: "${recipientName}"
• Expected Recipient Phone / Wallet / Account / IPA: "${accountDetails}"
• Payment Method Instructions & Notes Visible to the Customer:
"""
${customerNotes}
"""
• Payment Method Name: "${params.paymentMethodName}"

--- AUDIT INSTRUCTIONS ---
1. IDENTIFY LEGITIMATE PAYMENT RECEIPT:
   - Check if this image is a genuine financial transfer confirmation receipt or screenshot (e.g., InstaPay Egypt, Vodafone Cash, Orange Money, Etisalat Cash, WE Pay, Telda, Bank Transfer, CIB, NBE, Banque Misr, QNB, etc.).
   - If it is a meme, product screenshot, selfie, random picture, or unrelated image, mark "isLegitimateReceipt": false.

2. CHECK TRANSACTION STATUS:
   - The transaction MUST be completed and successful (e.g. "Successful", "تم التحويل بنجاح", "تمت العملية بنجاح", "Transaction Succeeded", "Completed", "Done").
   - If it is "Pending" (قيد التنفيذ), "Failed" (فشلت), "Cancelled", a draft/review transfer screen, or awaiting OTP/confirmation, mark "isSuccessfulTransaction": false.

3. CHECK RECIPIENT PERSON & PHONE / WALLET NUMBER:
   - Carefully read the "Payment Method Instructions & Notes Visible to the Customer" above. It contains our official store recipient name, phone number, wallet number, and/or InstaPay address.
   - Look at the recipient details in the screenshot (name, phone number, wallet number, InstaPay IPA, IBAN, or bank account).
   - NUMBER & NAME MATCHING RULES:
     * Check both English and Arabic digits (e.g. 010... vs ٠١٠...).
     * Phone Number Normalization: Ignore spaces, hyphens, parentheses, leading zeros, and country dial codes (+20, 0020, 20). For instance, "01012345678", "010 1234 5678", "+201012345678", and "٠١٠١٢٣٤٥٦٧٨" are all the EXACT same phone number.
     * Name Matching: Support Arabic, English, transliterations, and partial names (e.g., "Ahmed Mohamed", "احمد محمد", "PremiKeys", "بريمي كيز").
     * Verification Check:
       - If the screenshot shows a recipient phone or account number, it MUST match the number in our notes/account details.
       - If the screenshot shows a recipient name, it MUST match the recipient name in our notes/store details.
       - If the screenshot displays BOTH the recipient name AND the phone/account number, BOTH must match our authorized details.
       - If the screenshot clearly shows money was sent to a WRONG person or WRONG phone number not in our notes/instructions, mark "receiverMatches": false and state in rejectionReason that the transfer was sent to the wrong recipient or number.

4. CHECK AMOUNT (WITH COMMON ROUNDING-UP LOGIC):
   - Expected Order Amount: ${expectedAmount} ${currency}.
   - CRITICAL ROUNDING-UP RULE: In Egypt, customers frequently round up amounts when sending transfers via InstaPay or mobile cash wallets to avoid awkward change:
     * If the order price is 399 ${currency}, BOTH 399 AND 400 are 100% correct and valid!
     * If the order price is 199 ${currency}, BOTH 199 AND 200 are 100% correct and valid!
     * If the order price is 299 ${currency}, BOTH 299 AND 300 are 100% correct and valid!
     * If the order price is 499 ${currency}, BOTH 499 AND 500 are 100% correct and valid!
     * If the order price is 99 ${currency}, BOTH 99 AND 100 are 100% correct and valid!
     * If the order price is 799 ${currency}, BOTH 799 AND 800 are 100% correct and valid!
     * If the order price is 999 ${currency}, BOTH 999 AND 1000 are 100% correct and valid!
     * If the order price is 395 ${currency}, BOTH 395 AND 400 are 100% correct and valid!
     * Rule: Any transferred amount that EQUALS ${expectedAmount} OR is rounded up to the next integer, 5, 10, or 100 (or up to +5 to +20 ${currency} convenience) is VALID ("amountMatches": true).
   - STRICT UNDERPAYMENT RULE:
     * If the transferred amount in the screenshot is LESS than ${expectedAmount} (for example, paid 100, 200, 300, or 350 when 399 was required), mark "amountMatches": false and set rejectionReason to "The transferred amount ({detectedAmount} ${currency}) is less than the required order total (${expectedAmount} ${currency})."

5. EXTRACT TRANSACTION REFERENCE:
   - Extract any visible transaction ID, reference number, or operation sequence code.

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

If "isValid" is false, "rejectionReason" MUST be a clear, polite explanation in English (e.g. "The transferred amount is 100 EGP, but your order total is 399 EGP", "The transfer was sent to an incorrect recipient or phone number", or "The screenshot does not show a completed successful transfer").`;

    // 100% Free Tier Google Gemini Vision models (each model has its own daily free quota pool)
    const freeFlashModels = [
      "gemini-3-flash-preview",
      "gemini-3.7-flash",
      "gemini-3.5-flash",
      "gemini-3.8-flash",
    ];
    let candidateText = "";
    let lastError = "";
    let anyQuotaExceeded = false;
    let anyTemporaryOverload = false;

    for (const model of freeFlashModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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

        if (apiResponse.ok) {
          const data = await apiResponse.json();
          candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (candidateText) break;
        } else {
          const status = apiResponse.status;
          lastError = await apiResponse.text();
          console.warn(`Gemini model ${model} returned HTTP ${status}:`, lastError);
          if (status === 429) {
            anyQuotaExceeded = true;
          } else if (status === 503) {
            anyTemporaryOverload = true;
          }
        }
      } catch (err: any) {
        lastError = err?.message || "fetch error";
        console.warn(`Gemini model ${model} fetch failed:`, lastError);
      }
    }

    if (!candidateText) {
      // If daily free quota ended or all models are busy, gracefully auto-approve
      // and pass through for manual admin review so customer checkout is never blocked
      if (anyQuotaExceeded || anyTemporaryOverload) {
        console.warn("[GEMINI VERIFY] Daily AI free quota reached or service busy. Auto-allowing order through for manual review.");
        return {
          status: "SKIPPED",
          isValid: true,
          note: anyQuotaExceeded
            ? "Daily AI verification quota reached (HTTP 429). Order automatically passed through for manual admin review."
            : "AI verification service temporarily busy (HTTP 503). Order automatically passed through for manual admin review.",
        };
      }

      return {
        status: "DECLINED",
        isValid: false,
        rejectionReason:
          "Unable to automatically verify payment receipt image. Please ensure you upload a clear, legible screenshot of your completed transfer confirmation.",
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
