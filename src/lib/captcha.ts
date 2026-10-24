import crypto from "crypto";

const CAPTCHA_SECRET =
  process.env.JWT_SECRET ||
  process.env.SESSION_SECRET ||
  "premikeys_ultra_secure_captcha_signature_salt_99812";

// Characters excluding ambiguous ones (no 0/O, 1/I/l, 8/B confusion)
const CHAR_SET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

// In-memory cache for consumed token signatures to prevent replay attacks
const consumedTokens = new Map<string, number>();

// Periodic cleanup of expired consumed tokens
setInterval(() => {
  const now = Date.now();
  for (const [key, exp] of consumedTokens.entries()) {
    if (exp <= now) {
      consumedTokens.delete(key);
    }
  }
}, 60 * 1000);

export interface CaptchaChallenge {
  token: string;
  svgDataUrl: string;
  expiresAt: number;
}

/**
 * Generate a cryptographically signed SVG CAPTCHA challenge
 */
export function generateCaptcha(): CaptchaChallenge {
  // Generate a 5-character random code
  let code = "";
  for (let i = 0; i < 5; i++) {
    const randomIndex = crypto.randomInt(0, CHAR_SET.length);
    code += CHAR_SET[randomIndex];
  }

  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity
  const salt = crypto.randomBytes(8).toString("hex");

  // Sign the answer
  const signatureData = `${code.toLowerCase()}:${expiresAt}:${salt}`;
  const hmac = crypto
    .createHmac("sha256", CAPTCHA_SECRET)
    .update(signatureData)
    .digest("hex");

  const tokenPayload = {
    exp: expiresAt,
    salt,
    sig: hmac,
  };

  const token = Buffer.from(JSON.stringify(tokenPayload)).toString("base64url");

  // Generate SVG Image
  const width = 200;
  const height = 55;

  const colors = ["#38bdf8", "#818cf8", "#34d399", "#f472b6", "#fbbf24", "#60a5fa"];

  // Random curved noise lines
  let noiseLines = "";
  for (let i = 0; i < 4; i++) {
    const stroke = colors[i % colors.length];
    const x1 = crypto.randomInt(5, 40);
    const y1 = crypto.randomInt(10, height - 10);
    const cx = crypto.randomInt(60, 140);
    const cy = crypto.randomInt(5, height - 5);
    const x2 = crypto.randomInt(150, width - 5);
    const y2 = crypto.randomInt(10, height - 10);
    noiseLines += `<path d="M${x1},${y1} Q${cx},${cy} ${x2},${y2}" stroke="${stroke}" stroke-width="1.8" fill="none" opacity="0.45" />`;
  }

  // Random noise dots
  let noiseDots = "";
  for (let i = 0; i < 35; i++) {
    const cx = crypto.randomInt(5, width - 5);
    const cy = crypto.randomInt(5, height - 5);
    const r = (crypto.randomInt(10, 25) / 10).toFixed(1);
    const dotColor = colors[i % colors.length];
    noiseDots += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${dotColor}" opacity="0.4" />`;
  }

  // Character glyphs with randomized rotation, vertical offset, and distinct colors
  let charElements = "";
  const charSpacing = (width - 40) / 5;

  for (let i = 0; i < 5; i++) {
    const char = code[i];
    const x = 20 + i * charSpacing + crypto.randomInt(-2, 3);
    const y = 38 + crypto.randomInt(-4, 4);
    const rotate = crypto.randomInt(-22, 23);
    const fontSize = crypto.randomInt(28, 33);
    const charColor = colors[(i + 1) % colors.length];

    charElements += `
      <text
        x="${x}"
        y="${y}"
        font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        font-size="${fontSize}"
        font-weight="900"
        fill="${charColor}"
        transform="rotate(${rotate}, ${x + 6}, ${y - 12})"
        letter-spacing="2"
      >${char}</text>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#050a1a" />
        <stop offset="50%" stop-color="#0a122e" />
        <stop offset="100%" stop-color="#050a1a" />
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" rx="12" fill="url(#bgGrad)" stroke="#1e293b" stroke-width="1.2" />
    ${noiseLines}
    ${noiseDots}
    ${charElements}
  </svg>`;

  const svgBase64 = Buffer.from(svg).toString("base64");
  const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`;

  return {
    token,
    svgDataUrl,
    expiresAt,
  };
}

/**
 * Verify a submitted CAPTCHA answer
 */
export function verifyCaptcha(
  token: string | null | undefined,
  answer: string | null | undefined
): { valid: boolean; error?: string } {
  if (!token || typeof token !== "string" || !answer || typeof answer !== "string") {
    return { valid: false, error: "Please enter the security verification code." };
  }

  try {
    const rawPayload = Buffer.from(token, "base64url").toString("utf-8");
    const payload = JSON.parse(rawPayload);

    if (!payload.exp || !payload.salt || !payload.sig) {
      return { valid: false, error: "Invalid security verification token." };
    }

    // Check expiry
    if (Date.now() > payload.exp) {
      return { valid: false, error: "Verification code has expired. Please refresh the code." };
    }

    // Check if token was already used (replay prevention)
    if (consumedTokens.has(payload.sig)) {
      return { valid: false, error: "Verification code has already been used. Please refresh." };
    }

    // Recompute signature for user's answer
    const cleanAnswer = answer.trim().toLowerCase();
    const expectedSig = crypto
      .createHmac("sha256", CAPTCHA_SECRET)
      .update(`${cleanAnswer}:${payload.exp}:${payload.salt}`)
      .digest("hex");

    const sigBufferA = Buffer.from(expectedSig, "utf-8");
    const sigBufferB = Buffer.from(payload.sig, "utf-8");

    if (sigBufferA.length !== sigBufferB.length || !crypto.timingSafeEqual(sigBufferA, sigBufferB)) {
      return { valid: false, error: "Incorrect verification code. Please try again." };
    }

    // Mark as consumed
    consumedTokens.set(payload.sig, payload.exp);

    return { valid: true };
  } catch (err) {
    return { valid: false, error: "Verification failed. Please try again." };
  }
}
