import prisma from "@/lib/prisma";

export interface RecaptchaVerifyResult {
  success: boolean;
  score?: number;
  action?: string;
  error?: string;
  skipped?: boolean;
}

/**
 * Retrieve Google reCAPTCHA v3 keys from environment or Store Settings
 */
export async function getRecaptchaConfig(): Promise<{
  siteKey: string;
  secretKey: string;
  enabled: boolean;
}> {
  let siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || "";
  let secretKey = process.env.RECAPTCHA_SECRET_KEY?.trim() || "";

  try {
    const dbSettings = await prisma.storeSetting.findMany({
      where: {
        key: { in: ["recaptcha_site_key", "recaptcha_secret_key", "recaptcha_enabled"] },
      },
    });

    let isExplicitlyDisabled = false;
    for (const s of dbSettings) {
      if (s.key === "recaptcha_site_key" && s.value?.trim()) {
        siteKey = s.value.trim();
      }
      if (s.key === "recaptcha_secret_key" && s.value?.trim()) {
        secretKey = s.value.trim();
      }
      if (s.key === "recaptcha_enabled" && s.value === "false") {
        isExplicitlyDisabled = true;
      }
    }

    if (isExplicitlyDisabled) {
      return { siteKey: "", secretKey: "", enabled: false };
    }
  } catch (err) {
    // Continue with env variables if DB lookup fails
  }

  return {
    siteKey,
    secretKey,
    enabled: Boolean(siteKey && secretKey),
  };
}

/**
 * Verify Google reCAPTCHA v3 token against Google's official verification API
 * @param token The token received from window.grecaptcha.execute() on client
 * @param expectedAction Expected action name (e.g. 'customer_login', 'admin_login')
 * @param minScore Minimum score threshold between 0.0 (bot) and 1.0 (human), default 0.5
 */
export async function verifyGoogleRecaptcha(
  token: string | null | undefined,
  expectedAction: string,
  minScore: number = 0.5
): Promise<RecaptchaVerifyResult> {
  const config = await getRecaptchaConfig();

  // If secret key is not yet configured, log development notice and allow access
  if (!config.secretKey) {
    return {
      success: true,
      skipped: true,
      score: 1.0,
    };
  }

  if (!token || typeof token !== "string") {
    return {
      success: false,
      error: "Google reCAPTCHA verification token missing.",
    };
  }

  try {
    const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
    const res = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: config.secretKey,
        response: token,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      const errorCodes = data["error-codes"] ? data["error-codes"].join(", ") : "verification_failed";
      return {
        success: false,
        error: `Google reCAPTCHA verification failed (${errorCodes}).`,
      };
    }

    const score = typeof data.score === "number" ? data.score : 1.0;

    // Reject automated bots with low risk score
    if (score < minScore) {
      return {
        success: false,
        score,
        error: `High automated risk score detected by Google reCAPTCHA (${score.toFixed(2)}). Login blocked.`,
      };
    }

    return {
      success: true,
      score,
      action: data.action,
    };
  } catch (err: any) {
    console.error("Google reCAPTCHA verification exception:", err);
    return {
      success: false,
      error: "Unable to reach Google reCAPTCHA verification servers.",
    };
  }
}
