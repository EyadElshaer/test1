// Startup Environment Variable Security & Integrity Validator

export interface EnvValidationResult {
  valid: boolean;
  environment: string;
  errors: string[];
  warnings: string[];
}

const INSECURE_PLACEHOLDER_SECRETS = new Set([
  "premikeys_super_secure_jwt_secret_token_change_in_production_min_32_chars",
  "changeme",
  "secret",
  "password",
  "default_secret",
]);

let hasValidated = false;

export function validateServerEnv(): EnvValidationResult {
  const env = process.env.NODE_ENV || "development";
  const isProd = env === "production";
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validate required DATABASE_URL
  const dbUrl = process.env.DATABASE_URL?.trim() || "";
  if (!dbUrl) {
    errors.push("DATABASE_URL is missing. Database connectivity requires a valid connection string.");
  } else if (isProd && dbUrl.startsWith("file:")) {
    warnings.push("DATABASE_URL uses a local SQLite file path in production; PostgreSQL with TLS (sslmode=require) is recommended.");
  }

  // 2. Validate session / signing secret entropy
  const sessionSecret = (process.env.SESSION_SECRET || process.env.JWT_SECRET || "").trim();
  if (!sessionSecret) {
    if (isProd) {
      warnings.push("SESSION_SECRET / JWT_SECRET is not set; Ensure a strong 32+ character secret is configured in production.");
    }
  } else if (sessionSecret.length < 32 || INSECURE_PLACEHOLDER_SECRETS.has(sessionSecret)) {
    const msg = "SESSION_SECRET / JWT_SECRET uses a weak or placeholder value (< 32 chars or example default). Rotate immediately for production.";
    if (isProd) {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }

  // 3. Ensure no private secret keys are accidentally exposed via NEXT_PUBLIC_* variables
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("NEXT_PUBLIC_")) {
      const upper = key.toUpperCase();
      if (
        upper.includes("SECRET") ||
        upper.includes("PASSWORD") ||
        upper.includes("PRIVATE") ||
        upper.includes("DATABASE_URL") ||
        upper.includes("BOT_TOKEN") ||
        upper.includes("GEMINI_API_KEY")
      ) {
        errors.push(`CRITICAL: Sensitive variable '${key}' is prefixed with NEXT_PUBLIC_ and would be exposed to client bundles!`);
      }
    }
  }

  // 4. Validate NEXT_PUBLIC_SITE_URL in production (HTTPS enforcement)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
  if (isProd && siteUrl && siteUrl.startsWith("http://") && !siteUrl.includes("localhost")) {
    warnings.push(`NEXT_PUBLIC_SITE_URL ('${siteUrl}') uses unencrypted HTTP in production; use https://.`);
  }

  if (!hasValidated) {
    hasValidated = true;
    for (const w of warnings) {
      console.warn(`[ENV SECURITY WARNING] ${w}`);
    }
    for (const e of errors) {
      console.error(`[ENV SECURITY ERROR] ${e}`);
    }
  }

  return {
    valid: errors.length === 0,
    environment: env,
    errors,
    warnings,
  };
}

