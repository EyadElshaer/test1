export interface CountryCode {
  name: string;
  dialCode: string;
  code: string;
  flag: string;
  minLength: number;
  maxLength: number;
  exactLength?: number;
  placeholder: string;
  hint: string;
  prefixPattern?: RegExp;
}

export const COUNTRY_CODES: CountryCode[] = [
  {
    name: "Egypt",
    dialCode: "+20",
    code: "EG",
    flag: "🇪🇬",
    minLength: 10,
    maxLength: 10,
    exactLength: 10,
    placeholder: "010 1234 5678",
    hint: "10 digits (e.g. 010, 011, 012, 015)",
    prefixPattern: /^(10|11|12|15)/,
  },
  {
    name: "Saudi Arabia",
    dialCode: "+966",
    code: "SA",
    flag: "🇸🇦",
    minLength: 9,
    maxLength: 9,
    exactLength: 9,
    placeholder: "50 123 4567",
    hint: "9 digits starting with 5",
    prefixPattern: /^5/,
  },
  {
    name: "United Arab Emirates",
    dialCode: "+971",
    code: "AE",
    flag: "🇦🇪",
    minLength: 9,
    maxLength: 9,
    exactLength: 9,
    placeholder: "50 123 4567",
    hint: "9 digits starting with 5",
    prefixPattern: /^5/,
  },
  {
    name: "Kuwait",
    dialCode: "+965",
    code: "KW",
    flag: "🇰🇼",
    minLength: 8,
    maxLength: 8,
    exactLength: 8,
    placeholder: "5123 4567",
    hint: "8 digits starting with 5, 6, or 9",
    prefixPattern: /^[569]/,
  },
  {
    name: "Qatar",
    dialCode: "+974",
    code: "QA",
    flag: "🇶🇦",
    minLength: 8,
    maxLength: 8,
    exactLength: 8,
    placeholder: "3312 3456",
    hint: "8 digits starting with 3, 5, 6, or 7",
    prefixPattern: /^[3567]/,
  },
  {
    name: "Bahrain",
    dialCode: "+973",
    code: "BH",
    flag: "🇧🇭",
    minLength: 8,
    maxLength: 8,
    exactLength: 8,
    placeholder: "3612 3456",
    hint: "8 digits",
  },
  {
    name: "Oman",
    dialCode: "+968",
    code: "OM",
    flag: "🇴🇲",
    minLength: 8,
    maxLength: 8,
    exactLength: 8,
    placeholder: "7123 4567",
    hint: "8 digits",
  },
  {
    name: "Jordan",
    dialCode: "+962",
    code: "JO",
    flag: "🇯🇴",
    minLength: 9,
    maxLength: 9,
    exactLength: 9,
    placeholder: "79 123 4567",
    hint: "9 digits starting with 7",
    prefixPattern: /^7/,
  },
  {
    name: "Iraq",
    dialCode: "+964",
    code: "IQ",
    flag: "🇮🇶",
    minLength: 10,
    maxLength: 10,
    exactLength: 10,
    placeholder: "770 123 4567",
    hint: "10 digits starting with 7",
    prefixPattern: /^7/,
  },
  {
    name: "Lebanon",
    dialCode: "+961",
    code: "LB",
    flag: "🇱🇧",
    minLength: 7,
    maxLength: 8,
    exactLength: 8,
    placeholder: "70 123 456",
    hint: "8 digits",
  },
  {
    name: "Morocco",
    dialCode: "+212",
    code: "MA",
    flag: "🇲🇦",
    minLength: 9,
    maxLength: 9,
    exactLength: 9,
    placeholder: "612 345 678",
    hint: "9 digits starting with 6 or 7",
    prefixPattern: /^[67]/,
  },
  {
    name: "Algeria",
    dialCode: "+213",
    code: "DZ",
    flag: "🇩🇿",
    minLength: 9,
    maxLength: 9,
    exactLength: 9,
    placeholder: "551 234 567",
    hint: "9 digits starting with 5, 6, or 7",
    prefixPattern: /^[567]/,
  },
  {
    name: "Tunisia",
    dialCode: "+216",
    code: "TN",
    flag: "🇹🇳",
    minLength: 8,
    maxLength: 8,
    exactLength: 8,
    placeholder: "20 123 456",
    hint: "8 digits",
  },
  {
    name: "Libya",
    dialCode: "+218",
    code: "LY",
    flag: "🇱🇾",
    minLength: 9,
    maxLength: 9,
    exactLength: 9,
    placeholder: "91 123 4567",
    hint: "9 digits starting with 9",
    prefixPattern: /^9/,
  },
  {
    name: "United States",
    dialCode: "+1",
    code: "US",
    flag: "🇺🇸",
    minLength: 10,
    maxLength: 10,
    exactLength: 10,
    placeholder: "202 555 0123",
    hint: "10 digits (area code + number)",
  },
  {
    name: "United Kingdom",
    dialCode: "+44",
    code: "GB",
    flag: "🇬🇧",
    minLength: 10,
    maxLength: 10,
    exactLength: 10,
    placeholder: "7911 123456",
    hint: "10 digits starting with 7",
    prefixPattern: /^7/,
  },
  {
    name: "Canada",
    dialCode: "+1",
    code: "CA",
    flag: "🇨🇦",
    minLength: 10,
    maxLength: 10,
    exactLength: 10,
    placeholder: "416 555 0123",
    hint: "10 digits",
  },
  {
    name: "Germany",
    dialCode: "+49",
    code: "DE",
    flag: "🇩🇪",
    minLength: 10,
    maxLength: 11,
    placeholder: "151 12345678",
    hint: "10 to 11 digits",
  },
  {
    name: "France",
    dialCode: "+33",
    code: "FR",
    flag: "🇫🇷",
    minLength: 9,
    maxLength: 9,
    exactLength: 9,
    placeholder: "6 12 34 56 78",
    hint: "9 digits starting with 6 or 7",
    prefixPattern: /^[67]/,
  },
  {
    name: "Turkey",
    dialCode: "+90",
    code: "TR",
    flag: "🇹🇷",
    minLength: 10,
    maxLength: 10,
    exactLength: 10,
    placeholder: "532 123 4567",
    hint: "10 digits starting with 5",
    prefixPattern: /^5/,
  },
  {
    name: "Netherlands",
    dialCode: "+31",
    code: "NL",
    flag: "🇳🇱",
    minLength: 9,
    maxLength: 9,
    exactLength: 9,
    placeholder: "6 12345678",
    hint: "9 digits starting with 6",
    prefixPattern: /^6/,
  },
  {
    name: "Italy",
    dialCode: "+39",
    code: "IT",
    flag: "🇮🇹",
    minLength: 10,
    maxLength: 10,
    exactLength: 10,
    placeholder: "312 345 6789",
    hint: "10 digits",
  },
  {
    name: "Spain",
    dialCode: "+34",
    code: "ES",
    flag: "🇪🇸",
    minLength: 9,
    maxLength: 9,
    exactLength: 9,
    placeholder: "612 345 678",
    hint: "9 digits starting with 6 or 7",
    prefixPattern: /^[67]/,
  },
  {
    name: "Sweden",
    dialCode: "+46",
    code: "SE",
    flag: "🇸🇪",
    minLength: 9,
    maxLength: 9,
    exactLength: 9,
    placeholder: "70 123 4567",
    hint: "9 digits starting with 7",
    prefixPattern: /^7/,
  },
  {
    name: "Switzerland",
    dialCode: "+41",
    code: "CH",
    flag: "🇨🇭",
    minLength: 9,
    maxLength: 9,
    exactLength: 9,
    placeholder: "79 123 4567",
    hint: "9 digits starting with 7",
    prefixPattern: /^7/,
  },
  {
    name: "Australia",
    dialCode: "+61",
    code: "AU",
    flag: "🇦🇺",
    minLength: 9,
    maxLength: 9,
    exactLength: 9,
    placeholder: "412 345 678",
    hint: "9 digits starting with 4",
    prefixPattern: /^4/,
  },
  {
    name: "India",
    dialCode: "+91",
    code: "IN",
    flag: "🇮🇳",
    minLength: 10,
    maxLength: 10,
    exactLength: 10,
    placeholder: "98765 43210",
    hint: "10 digits starting with 6, 7, 8, or 9",
    prefixPattern: /^[6789]/,
  },
  {
    name: "Pakistan",
    dialCode: "+92",
    code: "PK",
    flag: "🇵🇰",
    minLength: 10,
    maxLength: 10,
    exactLength: 10,
    placeholder: "300 1234567",
    hint: "10 digits starting with 3",
    prefixPattern: /^3/,
  },
  {
    name: "Brazil",
    dialCode: "+55",
    code: "BR",
    flag: "🇧🇷",
    minLength: 11,
    maxLength: 11,
    exactLength: 11,
    placeholder: "11 91234 5678",
    hint: "11 digits",
  },
  {
    name: "Japan",
    dialCode: "+81",
    code: "JP",
    flag: "🇯🇵",
    minLength: 10,
    maxLength: 10,
    exactLength: 10,
    placeholder: "90 1234 5678",
    hint: "10 digits starting with 70, 80, or 90",
    prefixPattern: /^(70|80|90)/,
  },
];

export function findCountryByCode(code?: string | null): CountryCode {
  if (!code) return COUNTRY_CODES[0];
  const upper = code.trim().toUpperCase();
  return COUNTRY_CODES.find((c) => c.code === upper) || COUNTRY_CODES[0];
}

export function findCountryByDialCode(dialCode?: string | null): CountryCode {
  if (!dialCode) return COUNTRY_CODES[0];
  const clean = dialCode.trim().startsWith("+") ? dialCode.trim() : `+${dialCode.trim()}`;
  return COUNTRY_CODES.find((c) => c.dialCode === clean) || COUNTRY_CODES[0];
}

/**
 * Attempts to parse an arbitrary international number into country + clean national digits
 */
export function detectCountryFromPhone(phone?: string | null): {
  country: CountryCode;
  nationalNumber: string;
} {
  if (!phone) {
    return { country: COUNTRY_CODES[0], nationalNumber: "" };
  }

  const digits = phone.trim().replace(/\D/g, "");

  // Match from longest dial code to shortest to prevent +1 matching before +1416
  const sorted = [...COUNTRY_CODES].sort(
    (a, b) => b.dialCode.replace("+", "").length - a.dialCode.replace("+", "").length
  );

  for (const c of sorted) {
    const rawDial = c.dialCode.replace("+", "");
    if (digits.startsWith(rawDial)) {
      const rest = digits.slice(rawDial.length).replace(/^0+/, "");
      return { country: c, nationalNumber: rest };
    }
  }

  // If starts with 0 and matches Egyptian 11-digit mobile
  if (digits.startsWith("01") && digits.length === 11) {
    return { country: COUNTRY_CODES[0], nationalNumber: digits.slice(1) };
  }

  return { country: COUNTRY_CODES[0], nationalNumber: digits.replace(/^0+/, "") };
}

export interface PhoneValidationResult {
  isValid: boolean;
  cleanNationalDigits: string;
  fullInternationalNumber: string;
  digitsCount: number;
  expectedLengthText: string;
  error?: string;
}

/**
 * Validates whether the given national phone number strictly satisfies the country's exact digit requirements
 */
export function validatePhoneForCountry(
  country: CountryCode,
  rawInput?: string | null
): PhoneValidationResult {
  if (!rawInput || typeof rawInput !== "string") {
    return {
      isValid: false,
      cleanNationalDigits: "",
      fullInternationalNumber: "",
      digitsCount: 0,
      expectedLengthText: country.exactLength
        ? `${country.exactLength} digits`
        : `${country.minLength}-${country.maxLength} digits`,
      error: "Please enter your mobile phone number.",
    };
  }

  let clean = rawInput.trim().replace(/\D/g, "");

  // Strip dial code if user typed or pasted with country code (e.g. +2010... or 2010...)
  const dialDigits = country.dialCode.replace("+", "");
  if (clean.startsWith(dialDigits) && clean.length > dialDigits.length + 5) {
    clean = clean.slice(dialDigits.length);
  }

  // Strip leading national trunk zero (e.g. 010... -> 10..., 05... -> 5...)
  if (clean.startsWith("0")) {
    clean = clean.slice(1);
  }

  const count = clean.length;
  const expectedText = country.exactLength
    ? `${country.exactLength} digits`
    : `${country.minLength}-${country.maxLength} digits`;

  if (count === 0) {
    return {
      isValid: false,
      cleanNationalDigits: "",
      fullInternationalNumber: "",
      digitsCount: 0,
      expectedLengthText: expectedText,
      error: `Please enter a mobile phone number for ${country.name}.`,
    };
  }

  // Check exact length or range
  if (country.exactLength !== undefined) {
    if (count < country.exactLength) {
      return {
        isValid: false,
        cleanNationalDigits: clean,
        fullInternationalNumber: `${country.dialCode}${clean}`,
        digitsCount: count,
        expectedLengthText: expectedText,
        error: `${country.name} numbers must have exactly ${country.exactLength} digits (${count}/${country.exactLength} entered).`,
      };
    }
    if (count > country.exactLength) {
      return {
        isValid: false,
        cleanNationalDigits: clean,
        fullInternationalNumber: `${country.dialCode}${clean}`,
        digitsCount: count,
        expectedLengthText: expectedText,
        error: `${country.name} numbers cannot exceed ${country.exactLength} digits (${count} digits entered).`,
      };
    }
  } else {
    if (count < country.minLength) {
      return {
        isValid: false,
        cleanNationalDigits: clean,
        fullInternationalNumber: `${country.dialCode}${clean}`,
        digitsCount: count,
        expectedLengthText: expectedText,
        error: `${country.name} numbers must be at least ${country.minLength} digits (${count} entered).`,
      };
    }
    if (count > country.maxLength) {
      return {
        isValid: false,
        cleanNationalDigits: clean,
        fullInternationalNumber: `${country.dialCode}${clean}`,
        digitsCount: count,
        expectedLengthText: expectedText,
        error: `${country.name} numbers cannot exceed ${country.maxLength} digits (${count} entered).`,
      };
    }
  }

  // Check country prefix pattern if defined
  if (country.prefixPattern && !country.prefixPattern.test(clean)) {
    return {
      isValid: false,
      cleanNationalDigits: clean,
      fullInternationalNumber: `${country.dialCode}${clean}`,
      digitsCount: count,
      expectedLengthText: expectedText,
      error: `Invalid number format for ${country.name}. ${country.hint}.`,
    };
  }

  return {
    isValid: true,
    cleanNationalDigits: clean,
    fullInternationalNumber: `${country.dialCode}${clean}`,
    digitsCount: count,
    expectedLengthText: expectedText,
  };
}

export function normalizePhoneNumber(countryDialCode: string, localNumber: string): string {
  const cleanLocal = localNumber.replace(/\D/g, "");
  const cleanDial = countryDialCode.startsWith("+") ? countryDialCode : `+${countryDialCode}`;

  // If local starts with 0 (e.g. 010... in Egypt), strip leading 0
  const formattedLocal = cleanLocal.startsWith("0") ? cleanLocal.slice(1) : cleanLocal;
  return `${cleanDial}${formattedLocal}`;
}
