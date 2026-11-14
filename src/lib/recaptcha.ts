import prisma from "@/lib/prisma";

export interface RecaptchaVerifyResult {
  success: boolean;
  error?: string;
  hostname?: string;
}

// Google's official public test keys for localhost / automated testing only (non-secret, documented by Google)
const LOCALHOST_TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
const LOCALHOST_TEST_SECRET_KEY = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";

export async function getRecaptchaConfig(): Promise<{ siteKey: string; enabled: boolean }> {
  let siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || "";
  try {
    const dbSetting = await prisma.storeSetting.findUnique({
      where: { key: "recaptcha_site_key" },
    });
    if (dbSetting?.value?.trim()) {
      siteKey = dbSetting.value.trim();
    }
  } catch (e) {}

  if (!siteKey && process.env.NODE_ENV !== "production") {
    siteKey = LOCALHOST_TEST_SITE_KEY;
  }

  return { siteKey, enabled: Boolean(siteKey) };
}

/**
 * Retrieve Google reCAPTCHA secret key strictly from server environment or database Store Settings.
 * Never hardcode production private keys in source code.
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

  return secretKey;
}

/**
 * Verify Google reCAPTCHA token with Google official siteverify endpoint
 */
export async function verifyGoogleRecaptcha(
  token: string | null | undefined
): Promise<RecaptchaVerifyResult> {
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

    // If running in localhost / dev where the localhost test site key was used, verify with Google's official test secret
    const isLocalEnv =
      process.env.NODE_ENV !== "production" ||
      Boolean(process.env.NEXT_PUBLIC_SITE_URL?.includes("localhost")) ||
      Boolean(process.env.NEXT_PUBLIC_SITE_URL?.includes("127.0.0.1"));
    if (!data.success && isLocalEnv) {
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
