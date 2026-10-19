export interface CountryCode {
  name: string;
  dialCode: string;
  code: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { name: "Egypt", dialCode: "+20", code: "EG", flag: "🇪🇬" },
  { name: "Saudi Arabia", dialCode: "+966", code: "SA", flag: "🇸🇦" },
  { name: "United Arab Emirates", dialCode: "+971", code: "AE", flag: "🇦🇪" },
  { name: "Kuwait", dialCode: "+965", code: "KW", flag: "🇰🇼" },
  { name: "Qatar", dialCode: "+974", code: "QA", flag: "🇶🇦" },
  { name: "Bahrain", dialCode: "+973", code: "BH", flag: "🇧🇭" },
  { name: "Oman", dialCode: "+968", code: "OM", flag: "🇴🇲" },
  { name: "Jordan", dialCode: "+962", code: "JO", flag: "🇯🇴" },
  { name: "Iraq", dialCode: "+964", code: "IQ", flag: "🇮🇶" },
  { name: "Lebanon", dialCode: "+961", code: "LB", flag: "🇱🇧" },
  { name: "Morocco", dialCode: "+212", code: "MA", flag: "🇲🇦" },
  { name: "Algeria", dialCode: "+213", code: "DZ", flag: "🇩🇿" },
  { name: "Tunisia", dialCode: "+216", code: "TN", flag: "🇹🇳" },
  { name: "Libya", dialCode: "+218", code: "LY", flag: "🇱🇾" },
  { name: "United States", dialCode: "+1", code: "US", flag: "🇺🇸" },
  { name: "United Kingdom", dialCode: "+44", code: "GB", flag: "🇬🇧" },
  { name: "Germany", dialCode: "+49", code: "DE", flag: "🇩🇪" },
  { name: "France", dialCode: "+33", code: "FR", flag: "🇫🇷" },
  { name: "Canada", dialCode: "+1", code: "CA", flag: "🇨🇦" },
  { name: "Australia", dialCode: "+61", code: "AU", flag: "🇦🇺" },
  { name: "Turkey", dialCode: "+90", code: "TR", flag: "🇹🇷" },
  { name: "Netherlands", dialCode: "+31", code: "NL", flag: "🇳🇱" },
  { name: "Italy", dialCode: "+39", code: "IT", flag: "🇮🇹" },
  { name: "Spain", dialCode: "+34", code: "ES", flag: "🇪🇸" },
  { name: "Sweden", dialCode: "+46", code: "SE", flag: "🇸🇪" },
  { name: "Switzerland", dialCode: "+41", code: "CH", flag: "🇨🇭" },
  { name: "India", dialCode: "+91", code: "IN", flag: "🇮🇳" },
  { name: "Pakistan", dialCode: "+92", code: "PK", flag: "🇵🇰" },
  { name: "Brazil", dialCode: "+55", code: "BR", flag: "🇧🇷" },
  { name: "Japan", dialCode: "+81", code: "JP", flag: "🇯🇵" },
];

export function normalizePhoneNumber(countryDialCode: string, localNumber: string): string {
  const cleanLocal = localNumber.replace(/\D/g, "");
  const cleanDial = countryDialCode.startsWith("+") ? countryDialCode : `+${countryDialCode}`;
  
  // If local starts with 0 (e.g. 010... in Egypt), strip leading 0
  const formattedLocal = cleanLocal.startsWith("0") ? cleanLocal.slice(1) : cleanLocal;
  return `${cleanDial}${formattedLocal}`;
}
