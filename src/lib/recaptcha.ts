import prisma from "@/lib/prisma";

export interface RecaptchaVerifyResult {
  success: boolean;
  error?: string;
  hostname?: string;
}

// Google official test keys (always passes on localhost out-of-the-box)
export const DEFAULT_TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
export const DEFAULT_TEST_SECRET_KEY = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";

export async function getRecaptchaConfig(): Promise<{ siteKey: string; enabled: boolean }> {
  let siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || DEFAULT_TEST_SITE_KEY;
  try {
    const dbSetting = await prisma.storeSetting.findUnique({
      where: { key: "recaptcha_site_key" },
    });
    if (dbSetting?.value?.trim()) {
      siteKey = dbSetting.value.trim();
    }
  } catch (e) {}

  return { siteKey, enabled: true };
}

/**
 * Retrieve Google reCAPTCHA secret key from environment or database Store Settings
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

  return secretKey || DEFAULT_TEST_SECRET_KEY;
}

/**
 * Verify Google reCAPTCHA token with Google official siteverify endpoint
 */
export async function verifyGoogleRecaptcha(
  token: string | null | undefined
): Promise<RecaptchaVerifyResult> {
  if (!token || typeof token !== "string" || !token.trim()) {
    return {
      success: false,
      error: "Please complete the Google reCAPTCHA 'I'm not a robot' checkbox.",
    };
  }

  const secret = await getRecaptchaSecretKey();

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

    const data = await res.json();

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
