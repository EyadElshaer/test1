// Token-bucket / fixed-window rate limiter with automatic memory-bounded eviction
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const MAX_RATE_LIMIT_KEYS = 10_000;
const rateLimitMap = new Map<string, RateLimitRecord>();
let lastCleanupAt = Date.now();

function pruneExpiredRecords(now: number) {
  if (now - lastCleanupAt < 60_000 && rateLimitMap.size < MAX_RATE_LIMIT_KEYS) {
    return;
  }
  lastCleanupAt = now;
  for (const [k, rec] of rateLimitMap.entries()) {
    if (rec.resetAt <= now) {
      rateLimitMap.delete(k);
    }
  }
  // Hard cap protection against spoofed IP floods
  if (rateLimitMap.size >= MAX_RATE_LIMIT_KEYS) {
    const oldestKey = rateLimitMap.keys().next().value;
    if (oldestKey) rateLimitMap.delete(oldestKey);
  }
}

export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 60 * 1000
): { allowed: boolean; remaining: number; retryAfterSec?: number; limit: number } {
  const now = Date.now();
  pruneExpiredRecords(now);

  const record = rateLimitMap.get(key);

  if (!record || record.resetAt <= now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, maxAttempts - 1), limit: maxAttempts };
  }

  if (record.count >= maxAttempts) {
    const retryAfterSec = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec, limit: maxAttempts };
  }

  record.count += 1;
  return { allowed: true, remaining: Math.max(0, maxAttempts - record.count), limit: maxAttempts };
}
