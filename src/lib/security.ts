import { logAdminAudit } from "@/lib/auth";

/**
 * Security Engine: Brute Force Protection, IP Lockout & Anti-Automated Attack
 */

export interface SecurityRecord {
  failedAttempts: number;
  lastAttemptAt: number;
  isLocked: boolean;
  lockedUntil?: number;
  scope: "customer" | "admin";
  target?: string;
}

// Configurable security thresholds
export const SECURITY_CONFIG = {
  customer: {
    maxFailedAttempts: 10, // After 10 failed passwords -> Lockout
    captchaThreshold: 3, // After 3 failed passwords -> Require CAPTCHA
    windowMs: 15 * 60 * 1000, // 15 minutes window
    lockoutDurationMs: 15 * 60 * 1000, // 15 minutes lockout
  },
  admin: {
    maxFailedAttempts: 5, // Stricter for admin portal
    captchaThreshold: 2, // Require CAPTCHA after 2 failed attempts
    windowMs: 30 * 60 * 1000, // 30 minutes window
    lockoutDurationMs: 30 * 60 * 1000, // 30 minutes lockout
  },
};

// In-memory security records keyed by IP and/or target account
const securityMap = new Map<string, SecurityRecord>();

// Cleanup stale records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of securityMap.entries()) {
    if (record.lockedUntil && record.lockedUntil <= now) {
      record.isLocked = false;
      record.failedAttempts = 0;
      delete record.lockedUntil;
    } else if (!record.isLocked && now - record.lastAttemptAt > 60 * 60 * 1000) {
      securityMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Accurately extract client IP address across standard proxies, Cloudflare, Nginx, and Vercel
 */
export function getClientIp(reqOrHeaders: Request | Headers): string {
  const headers = reqOrHeaders instanceof Headers ? reqOrHeaders : reqOrHeaders.headers;

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  const realIp = headers.get("x-real-ip");
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded && forwarded.trim()) {
    const firstIp = forwarded.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  return "127.0.0.1";
}

/**
 * Check if the given IP or target account is currently locked or requires CAPTCHA
 */
export function checkLoginSecurity(
  ip: string,
  targetIdentifier?: string,
  scope: "customer" | "admin" = "customer"
): {
  isLocked: boolean;
  requiresCaptcha: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
  message?: string;
} {
  const now = Date.now();
  const config = SECURITY_CONFIG[scope];

  const ipKey = `${scope}_ip_${ip}`;
  const targetKey = targetIdentifier ? `${scope}_target_${targetIdentifier.toLowerCase()}` : null;

  const ipRecord = securityMap.get(ipKey);
  const targetRecord = targetKey ? securityMap.get(targetKey) : null;

  // 1. Check IP lockout
  if (ipRecord?.isLocked && ipRecord.lockedUntil) {
    if (ipRecord.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((ipRecord.lockedUntil - now) / 1000);
      const minutes = Math.ceil(retryAfterSeconds / 60);
      return {
        isLocked: true,
        requiresCaptcha: true,
        remainingAttempts: 0,
        retryAfterSeconds,
        message: `Too many failed login attempts. Your IP address is temporarily restricted for security. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
      };
    } else {
      // Lock expired
      ipRecord.isLocked = false;
      ipRecord.failedAttempts = 0;
      delete ipRecord.lockedUntil;
    }
  }

  // 2. Check target account lockout (prevents distributed brute-force targeting one account)
  if (targetRecord?.isLocked && targetRecord.lockedUntil) {
    if (targetRecord.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((targetRecord.lockedUntil - now) / 1000);
      const minutes = Math.ceil(retryAfterSeconds / 60);
      return {
        isLocked: true,
        requiresCaptcha: true,
        remainingAttempts: 0,
        retryAfterSeconds,
        message: `Too many failed login attempts on this account. Account access is temporarily restricted for security. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
      };
    } else {
      targetRecord.isLocked = false;
      targetRecord.failedAttempts = 0;
      delete targetRecord.lockedUntil;
    }
  }

  // Evaluate failed count
  const failedAttempts = Math.max(ipRecord?.failedAttempts || 0, targetRecord?.failedAttempts || 0);
  const requiresCaptcha = failedAttempts >= config.captchaThreshold;
  const remainingAttempts = Math.max(0, config.maxFailedAttempts - failedAttempts);

  return {
    isLocked: false,
    requiresCaptcha,
    remainingAttempts,
  };
}

/**
 * Record a failed password attempt.
 * If failed count reaches threshold (e.g. 10 for customer, 5 for admin), trigger IP and account lockout.
 */
export async function recordFailedLogin(
  ip: string,
  targetIdentifier?: string,
  scope: "customer" | "admin" = "customer"
): Promise<{
  isLocked: boolean;
  requiresCaptcha: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
  message: string;
}> {
  const now = Date.now();
  const config = SECURITY_CONFIG[scope];
  const ipKey = `${scope}_ip_${ip}`;
  const targetKey = targetIdentifier ? `${scope}_target_${targetIdentifier.toLowerCase()}` : null;

  // Retrieve or create IP record
  let ipRecord = securityMap.get(ipKey);
  if (!ipRecord || (ipRecord.lastAttemptAt && now - ipRecord.lastAttemptAt > config.windowMs)) {
    ipRecord = {
      failedAttempts: 1,
      lastAttemptAt: now,
      isLocked: false,
      scope,
      target: targetIdentifier,
    };
  } else {
    ipRecord.failedAttempts += 1;
    ipRecord.lastAttemptAt = now;
    if (targetIdentifier) ipRecord.target = targetIdentifier;
  }

  // Check if IP reached lockout threshold
  if (ipRecord.failedAttempts >= config.maxFailedAttempts) {
    ipRecord.isLocked = true;
    ipRecord.lockedUntil = now + config.lockoutDurationMs;

    // Log admin security audit for this incident
    try {
      await logAdminAudit(
        null,
        "SECURITY_IP_LOCKOUT",
        `IP ${ip} was temporarily locked out after ${ipRecord.failedAttempts} failed ${scope} login attempts (Target: ${targetIdentifier || "unknown"}).`,
        ip
      );
    } catch (e) {
      console.warn("Failed to log security lockout audit:", e);
    }
  }
  securityMap.set(ipKey, ipRecord);

  // Update target record as well
  if (targetKey) {
    let targetRecord = securityMap.get(targetKey);
    if (!targetRecord || (targetRecord.lastAttemptAt && now - targetRecord.lastAttemptAt > config.windowMs)) {
      targetRecord = {
        failedAttempts: 1,
        lastAttemptAt: now,
        isLocked: false,
        scope,
        target: targetIdentifier,
      };
    } else {
      targetRecord.failedAttempts += 1;
      targetRecord.lastAttemptAt = now;
    }

    if (targetRecord.failedAttempts >= config.maxFailedAttempts) {
      targetRecord.isLocked = true;
      targetRecord.lockedUntil = now + config.lockoutDurationMs;
    }
    securityMap.set(targetKey, targetRecord);
  }

  const isLocked = ipRecord.isLocked;
  const retryAfterSeconds = isLocked && ipRecord.lockedUntil ? Math.ceil((ipRecord.lockedUntil - now) / 1000) : 0;
  const remainingAttempts = Math.max(0, config.maxFailedAttempts - ipRecord.failedAttempts);
  const requiresCaptcha = ipRecord.failedAttempts >= config.captchaThreshold;

  if (isLocked) {
    const minutes = Math.ceil(retryAfterSeconds / 60);
    return {
      isLocked: true,
      requiresCaptcha: true,
      remainingAttempts: 0,
      retryAfterSeconds,
      message: `Security Lockout: Your IP address has been temporarily restricted due to repeated incorrect password attempts. Please wait ${minutes} minute${minutes > 1 ? "s" : ""} before trying again.`,
    };
  }

  let warningMessage = "Incorrect password. Please try again.";
  if (requiresCaptcha) {
    warningMessage = `Incorrect password. Security challenge required. (${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining before temporary IP lockout)`;
  } else if (remainingAttempts <= 5) {
    warningMessage = `Incorrect password. ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining before your IP is restricted.`;
  }

  return {
    isLocked: false,
    requiresCaptcha,
    remainingAttempts,
    message: warningMessage,
  };
}

/**
 * Clear failed attempt records upon successful login
 */
export function recordSuccessfulLogin(
  ip: string,
  targetIdentifier?: string,
  scope: "customer" | "admin" = "customer"
): void {
  const ipKey = `${scope}_ip_${ip}`;
  securityMap.delete(ipKey);

  if (targetIdentifier) {
    const targetKey = `${scope}_target_${targetIdentifier.toLowerCase()}`;
    securityMap.delete(targetKey);
  }
}

/**
 * Tarpit / Artificial delay against brute force automated scripts
 */
export async function applyTarpitDelay(failedAttempts: number): Promise<void> {
  if (failedAttempts >= 3) {
    // Delay between 1000ms and 2000ms
    const delay = Math.min(2000, 800 + failedAttempts * 200);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Get active lockouts list for admin inspection
 */
export function getActiveLockouts(): Array<{
  ip: string;
  scope: "customer" | "admin";
  target?: string;
  failedAttempts: number;
  remainingSeconds: number;
  lockedUntil: string;
}> {
  const now = Date.now();
  const list: any[] = [];

  for (const [key, record] of securityMap.entries()) {
    if (record.isLocked && record.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      const isIpKey = key.includes("_ip_");
      const ip = isIpKey ? key.split("_ip_")[1] : "Multiple/Account";

      list.push({
        ip,
        scope: record.scope,
        target: record.target,
        failedAttempts: record.failedAttempts,
        remainingSeconds,
        lockedUntil: new Date(record.lockedUntil).toISOString(),
      });
    }
  }

  return list;
}

/**
 * Admin manual unblock function
 */
export function unblockIp(ipOrIdentifier: string): boolean {
  let unblocked = false;
  const needle = ipOrIdentifier.toLowerCase();
  for (const [key, record] of Array.from(securityMap.entries())) {
    if (key.includes(needle) || (record.target && record.target.toLowerCase() === needle)) {
      record.isLocked = false;
      record.failedAttempts = 0;
      delete record.lockedUntil;
      securityMap.delete(key);
      unblocked = true;

      // Also remove associated target record if unblocking by IP
      if (record.target) {
        const targetKey = `${record.scope}_target_${record.target.toLowerCase()}`;
        securityMap.delete(targetKey);
      }
    }
  }
  return unblocked;
}
