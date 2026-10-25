import prisma from "@/lib/prisma";
import { normalizePhone } from "@/lib/userAuth";

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean | string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export function getGoogleClientId(): string {
  return (
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    ""
  ).trim();
}

export function getGoogleClientSecret(): string {
  return (process.env.GOOGLE_CLIENT_SECRET || "").trim();
}

export function getSiteBaseUrl(req?: Request): string {
  // 1. If request is provided, inspect the incoming host header (dynamically works for premikeys.vercel.app, premikeys.com, etc.)
  if (req) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (host) {
      const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
      const proto = isLocal
        ? req.headers.get("x-forwarded-proto") || "http"
        : "https";
      return `${proto}://${host}`.replace(/\/+$/, "");
    }
  }

  // 2. Check Vercel deployment environment variables
  if (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/+$/, "");
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/+$/, "")}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, "")}`;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

export function getGoogleRedirectUri(req?: Request): string {
  return `${getSiteBaseUrl(req)}/api/auth/google/callback`;
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(getGoogleClientId() && getGoogleClientSecret());
}

/**
 * Builds the Google OAuth 2.0 authorization URL for redirect-based login
 */
export function buildGoogleOAuthUrl(stateParam: string, req?: Request): string {
  const clientId = getGoogleClientId();
  const redirectUri = getGoogleRedirectUri(req);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile https://www.googleapis.com/auth/user.phonenumbers.read",
    access_type: "offline",
    prompt: "select_account",
    state: stateParam,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges the Google authorization code for access and ID tokens
 */
export async function exchangeGoogleCode(
  code: string,
  req?: Request
): Promise<{ access_token: string; id_token?: string }> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const redirectUri = getGoogleRedirectUri(req);

  const bodyParams = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: bodyParams.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data.error_description || data.error || "Failed to exchange Google authorization code"
    );
  }

  return data;
}

/**
 * Retrieves the user profile from Google's userinfo endpoint
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.sub || !data.email) {
    throw new Error("Failed to fetch verified user profile from Google");
  }

  return data as GoogleProfile;
}

/**
 * Verifies a Google ID token / GIS One Tap credential
 */
export async function verifyGoogleCredential(credential: string): Promise<GoogleProfile> {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
  );

  const data = await res.json();
  if (!res.ok || data.error || !data.sub || !data.email) {
    throw new Error(data.error_description || "Invalid Google ID token");
  }

  const configuredClientId = getGoogleClientId();
  if (configuredClientId && data.aud !== configuredClientId) {
    throw new Error("Google ID token client audience mismatch");
  }

  const isVerified =
    data.email_verified === true || data.email_verified === "true";
  if (!isVerified) {
    throw new Error("Google email address is not verified.");
  }

  return {
    sub: data.sub,
    email: data.email,
    email_verified: isVerified,
    name: data.name || data.given_name || "Customer",
    picture: data.picture,
    given_name: data.given_name,
    family_name: data.family_name,
  };
}

/**
 * Attempts to retrieve user's phone number from Google People API if accessible
 */
export async function fetchGoogleUserPhoneNumber(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      "https://people.googleapis.com/v1/people/me?personFields=phoneNumbers",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (Array.isArray(data.phoneNumbers) && data.phoneNumbers.length > 0) {
      // Find the primary or first valid phone number
      const primaryPhone =
        data.phoneNumbers.find((p: any) => p.metadata?.primary) ||
        data.phoneNumbers[0];
      const val = primaryPhone?.value || primaryPhone?.canonicalForm;
      if (val && typeof val === "string") {
        return val.trim();
      }
    }
    return null;
  } catch (err) {
    // If People API is disabled or user profile has no public phone, fail gracefully
    return null;
  }
}

/**
 * Looks up existing user by googleId or email, or creates a new user, and backlinks past orders
 */
export async function syncGoogleUser(
  profile: GoogleProfile,
  rawPhoneNumber?: string | null
) {
  const cleanEmail = profile.email.trim().toLowerCase();
  const displayName = profile.name?.trim() || "Customer";
  const cleanPhone = rawPhoneNumber ? normalizePhone(rawPhoneNumber) : null;

  // 1. Search by Google sub ID or email
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ googleId: profile.sub }, { email: cleanEmail }],
    },
  });

  if (user) {
    // Update existing user with Google ID, avatar, and phone if needed
    const updates: any = {};
    if (!user.googleId) {
      updates.googleId = profile.sub;
    }
    if (profile.picture && (!user.avatar || user.authProvider === "google")) {
      updates.avatar = profile.picture;
    }
    if (!user.name && displayName) {
      updates.name = displayName;
    }
    // If user has no phone set and Google provided a phone number
    if (!user.phone && cleanPhone) {
      const phoneTaken = await prisma.user.findFirst({
        where: { phone: cleanPhone, NOT: { id: user.id } },
      });
      if (!phoneTaken) {
        updates.phone = cleanPhone;
      }
    }

    if (Object.keys(updates).length > 0) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: updates,
      });
    }
  } else {
    // Check if phone number is already taken by another account before setting on new user
    let phoneToSet: string | null = null;
    if (cleanPhone) {
      const phoneTaken = await prisma.user.findUnique({
        where: { phone: cleanPhone },
      });
      if (!phoneTaken) {
        phoneToSet = cleanPhone;
      }
    }

    // Create new customer account
    user = await prisma.user.create({
      data: {
        name: displayName,
        email: cleanEmail,
        phone: phoneToSet,
        googleId: profile.sub,
        avatar: profile.picture || null,
        authProvider: "google",
        passwordHash: null,
      },
    });
  }

  // 2. Automatically link any guest orders previously placed with this email or phone
  try {
    const orderConditions: any[] = [{ customerEmail: cleanEmail }];
    if (user.phone) {
      orderConditions.push({ customerPhone: user.phone });
    }
    await prisma.order.updateMany({
      where: {
        userId: null,
        OR: orderConditions,
      },
      data: {
        userId: user.id,
      },
    });
  } catch (linkErr) {
    console.warn("Could not backlink guest orders to Google user:", linkErr);
  }

  return user;
}
