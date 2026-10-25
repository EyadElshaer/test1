import { NextResponse } from "next/server";
import { COUNTRY_CODES, findCountryByCode } from "@/lib/countryCodes";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const h = req.headers;

    // Detect country code from reverse proxies (Vercel, Cloudflare, AWS, etc.)
    const headerCountry =
      h.get("x-vercel-ip-country") ||
      h.get("cf-ipcountry") ||
      h.get("x-country-code") ||
      "";

    const clientIp =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      h.get("cf-connecting-ip") ||
      "127.0.0.1";

    let detectedCode = headerCountry.trim().toUpperCase();

    // Default to Egypt if local development or header not present
    if (!detectedCode || detectedCode === "XX" || detectedCode === "T1") {
      detectedCode = "EG";
    }

    const matchedCountry = findCountryByCode(detectedCode);

    return NextResponse.json({
      success: true,
      countryCode: matchedCountry.code,
      countryName: matchedCountry.name,
      dialCode: matchedCountry.dialCode,
      flag: matchedCountry.flag,
      ip: clientIp,
    });
  } catch (error) {
    console.error("Geo detection error:", error);
    return NextResponse.json({
      success: false,
      countryCode: "EG",
      countryName: "Egypt",
      dialCode: "+20",
      flag: "🇪🇬",
    });
  }
}
