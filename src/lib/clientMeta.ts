import { headers } from "next/headers";

export interface ParsedClientMeta {
  ipAddress: string;
  userAgent: string;
  device: string; // "Desktop" | "Mobile" | "Tablet"
  os: string; // "Windows 10/11", "macOS", "iOS", "Android", etc.
  browser: string; // "Chrome 124", "Safari 17", etc.
  country: string; // "Egypt", "United States", etc.
  city: string; // "Cairo", "Alexandria", etc.
}

const COUNTRY_NAMES: Record<string, string> = {
  EG: "Egypt",
  SA: "Saudi Arabia",
  AE: "United Arab Emirates",
  KW: "Kuwait",
  QA: "Qatar",
  OM: "Oman",
  BH: "Bahrain",
  JO: "Jordan",
  LB: "Lebanon",
  IQ: "Iraq",
  US: "United States",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  CA: "Canada",
  TR: "Turkey",
  NL: "Netherlands",
  IT: "Italy",
  ES: "Spain",
  IN: "India",
  PK: "Pakistan",
};

export function parseUserAgent(uaString: string): { device: string; os: string; browser: string } {
  if (!uaString) {
    return { device: "Unknown Device", os: "Unknown OS", browser: "Unknown Browser" };
  }

  // Detect OS
  let os = "Unknown OS";
  if (/Windows NT 10\.0/i.test(uaString)) os = "Windows 10/11";
  else if (/Windows NT 6\.3/i.test(uaString)) os = "Windows 8.1";
  else if (/Windows NT 6\.2/i.test(uaString)) os = "Windows 8";
  else if (/Windows NT 6\.1/i.test(uaString)) os = "Windows 7";
  else if (/Windows/i.test(uaString)) os = "Windows";
  else if (/iPhone OS ([\d_]+)/i.test(uaString)) {
    const v = uaString.match(/iPhone OS ([\d_]+)/i)?.[1]?.replace(/_/g, ".") || "";
    os = v ? `iOS ${v.split(".")[0]}` : "iOS";
  } else if (/iPad.*OS ([\d_]+)/i.test(uaString)) {
    const v = uaString.match(/iPad.*OS ([\d_]+)/i)?.[1]?.replace(/_/g, ".") || "";
    os = v ? `iPadOS ${v.split(".")[0]}` : "iPadOS";
  } else if (/Android ([\d\.]+)/i.test(uaString)) {
    const v = uaString.match(/Android ([\d\.]+)/i)?.[1] || "";
    os = v ? `Android ${v.split(".")[0]}` : "Android";
  } else if (/Mac OS X ([\d_]+)/i.test(uaString)) {
    os = "macOS";
  } else if (/CrOS/i.test(uaString)) {
    os = "Chrome OS";
  } else if (/Linux/i.test(uaString)) {
    os = "Linux";
  }

  // Detect Device Type
  let device = "Desktop";
  if (/iPad|Tablet/i.test(uaString)) {
    device = "Tablet";
  } else if (/iPhone|iPod|Mobile|Android.*Mobile/i.test(uaString)) {
    device = "Mobile";
  } else if (/Android/i.test(uaString)) {
    device = "Tablet";
  }

  // Detect Browser
  let browser = "Unknown Browser";
  if (/Edg\/([\d\.]+)/i.test(uaString)) {
    const v = uaString.match(/Edg\/([\d\.]+)/i)?.[1]?.split(".")[0];
    browser = v ? `Edge ${v}` : "Edge";
  } else if (/OPR\/([\d\.]+)/i.test(uaString)) {
    const v = uaString.match(/OPR\/([\d\.]+)/i)?.[1]?.split(".")[0];
    browser = v ? `Opera ${v}` : "Opera";
  } else if (/SamsungBrowser\/([\d\.]+)/i.test(uaString)) {
    const v = uaString.match(/SamsungBrowser\/([\d\.]+)/i)?.[1]?.split(".")[0];
    browser = v ? `Samsung Internet ${v}` : "Samsung Internet";
  } else if (/Chrome\/([\d\.]+)/i.test(uaString) && !/Chromium/i.test(uaString)) {
    const v = uaString.match(/Chrome\/([\d\.]+)/i)?.[1]?.split(".")[0];
    browser = v ? `Chrome ${v}` : "Chrome";
  } else if (/Firefox\/([\d\.]+)/i.test(uaString)) {
    const v = uaString.match(/Firefox\/([\d\.]+)/i)?.[1]?.split(".")[0];
    browser = v ? `Firefox ${v}` : "Firefox";
  } else if (/Version\/([\d\.]+).*Safari/i.test(uaString)) {
    const v = uaString.match(/Version\/([\d\.]+)/i)?.[1]?.split(".")[0];
    browser = v ? `Safari ${v}` : "Safari";
  } else if (/Safari/i.test(uaString)) {
    browser = "Safari";
  }

  return { device, os, browser };
}

export async function extractClientMeta(reqHeaders?: Headers): Promise<ParsedClientMeta> {
  const h = reqHeaders || (await headers());

  // IP extraction
  const rawIp =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "127.0.0.1";

  const cleanIp = rawIp.replace(/^::ffff:/, "");

  // Location extraction
  const countryCode = (h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || "").toUpperCase();
  const rawCity = h.get("x-vercel-ip-city") || "";
  const city = rawCity ? decodeURIComponent(rawCity) : "";

  let country = COUNTRY_NAMES[countryCode] || countryCode;
  if (!country) {
    if (cleanIp === "127.0.0.1" || cleanIp === "::1" || cleanIp.startsWith("192.168.") || cleanIp.startsWith("10.")) {
      country = "Local / Dev";
    } else {
      country = "Unknown";
    }
  }

  // User-Agent extraction
  const userAgent = h.get("user-agent") || "";
  const { device, os, browser } = parseUserAgent(userAgent);

  return {
    ipAddress: cleanIp,
    userAgent,
    device,
    os,
    browser,
    country,
    city: city || (country === "Local / Dev" ? "Localhost" : "Unknown"),
  };
}
