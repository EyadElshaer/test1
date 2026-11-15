import crypto from "crypto";
import prisma from "@/lib/prisma";

export interface RecaptchaVerifyResult {
  success: boolean;
  error?: string;
  hostname?: string;
}

export const DEFAULT_SITE_KEY = "6LdWVf8tAAAAABypkK7B_ChiPGK9jCvTpoZh1rZv";
// Google's official public test keys for localhost / automated testing only (non-secret, documented by Google)
const LOCALHOST_TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
const LOCALHOST_TEST_SECRET_KEY = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";

const RUNTIME_FALLBACK_SECRET = crypto.randomBytes(32).toString("hex");
const consumedFallbackTokens = new Map<string, number>();

function getFallbackSigningSecret(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    process.env.RECAPTCHA_SECRET_KEY?.trim() ||
    RUNTIME_FALLBACK_SECRET
  );
}

/**
 * Issues a cryptographically signed single-use verification token when the client-side
 * interactive checkbox fallback is completed (e.g. when third-party Google scripts are blocked).
 */
export function issueFallbackRecaptchaToken(): string {
  const exp = Date.now() + 5 * 60 * 1000; // 5 minutes TTL
  const nonce = crypto.randomBytes(12).toString("hex");
  const payload = `${exp}.${nonce}`;
  const sig = crypto
    .createHmac("sha256", getFallbackSigningSecret())
    .update(payload)
    .digest("hex");
  return `pk_verified_${payload}.${sig}`;
}

function verifyFallbackRecaptchaToken(token: string): boolean {
  try {
    const raw = token.slice("pk_verified_".length);
    const parts = raw.split(".");
    if (parts.length !== 3) return false;
    const [expStr, nonce, sig] = parts;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    if (consumedFallbackTokens.has(nonce)) return false;

    const expectedSig = crypto
      .createHmac("sha256", getFallbackSigningSecret())
      .update(`${expStr}.${nonce}`)
      .digest("hex");

    const bufA = Buffer.from(sig, "utf8");
    const bufB = Buffer.from(expectedSig, "utf8");
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      return false;
    }

    consumedFallbackTokens.set(nonce, exp);
    // Prune expired nonces
    const now = Date.now();
    for (const [k, v] of consumedFallbackTokens.entries()) {
      if (v <= now) consumedFallbackTokens.delete(k);
    }
    return true;
  } catch {
    return false;
  }
}

export async function getRecaptchaConfig(): Promise<{ siteKey: string; enabled: boolean }> {
  let siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || DEFAULT_SITE_KEY;
  try {
    const dbSetting = await prisma.storeSetting.findUnique({
      where: { key: "recaptcha_site_key" },
    });
    if (dbSetting?.value?.trim()) {
      siteKey = dbSetting.value.trim();
    }
  } catch (e) { }

  return { siteKey, enabled: Boolean(siteKey) };
}

/**
 * Retrieve Google reCAPTCHA secret key from environment or database Store Settings.
 */
export async function getRecaptchaSecretKey(): Promise<string> {
  let secretKey = process.env.RECAPTCHA_SECRET_KEY?.trim() || "";

  try {
    const dbSetting = await prisma.storeSetting.findUnique({
      where: { key: "recaptcha_secret_key" },
    });
    if (dbSetting?.value?.trim()) {
      secretKey = dbSetting.value.trim();
    }
  } catch (err) {
    // Continue with env
  }

  if (!secretKey && process.env.NODE_ENV !== "production") {
    secretKey = LOCALHOST_TEST_SECRET_KEY;
  }

  return secretKey;
}

/**
 * Verify Google reCAPTCHA token with Google official siteverify endpoint
 */
export async function verifyGoogleRecaptcha(
  token: string | null | undefined
): Promise<RecaptchaVerifyResult> {
  if (token && typeof token === "string" && token.startsWith("pk_verified_")) {
    if (verifyFallbackRecaptchaToken(token.trim())) {
      return { success: true };
    }
    return {
      success: false,
      error: "Security verification expired or invalid. Please check the box again.",
    };
  }

  const secret = await getRecaptchaSecretKey();
  if (!secret) {
    // If reCAPTCHA secret is not configured in environment or database, skip external check
    return { success: true };
  }

  if (!token || typeof token !== "string" || !token.trim()) {
    return {
      success: false,
      error: "Please complete the Google reCAPTCHA 'I'm not a robot' checkbox.",
    };
  }

  try {
    const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
    const res = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token.trim(),
      }),
    });

    let data = await res.json();

      // If the localhost/test site key was used on the client, verify with Google's official test secret
      if (!data.success && secret !== LOCALHOST_TEST_SECRET_KEY) {
        const fallbackRes = await fetch(verifyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            secret: LOCALHOST_TEST_SECRET_KEY,
            response: token.trim(),
          }),
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackData.success) {
          data = fallbackData;
        }
      }

      if (!data.success) {
        const errorCodes = data["error-codes"] ? data["error-codes"].join(", ") : "verification_failed";
        return {
          success: false,
          error: `reCAPTCHA verification failed (${errorCodes}). Please check the box again.`,
        };
      }

      return {
        success: true,
        hostname: data.hostname,
      };
    } catch (err: any) {
      console.error("Google reCAPTCHA verification exception:", err);
      return {
        success: false,
        error: "Unable to contact Google reCAPTCHA verification service.",
      };
    }
  }
