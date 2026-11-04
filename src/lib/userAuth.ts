import { cookies } from "next/headers";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { extractClientMeta } from "@/lib/clientMeta";

export const USER_COOKIE_NAME = "premikeys_user_session";
// 90 days persistent session absolute expiry, 30 days inactivity timeout
export const USER_SESSION_DAYS = 90;
export const USER_IDLE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return "";
  let cleaned = rawPhone.trim().replace(/[^\d+]/g, "");
  // If starts with 0 and 11 digits (Egyptian standard e.g. 010... or 011...), convert to +201...
  if (cleaned.startsWith("01") && cleaned.length === 11) {
    cleaned = "+2" + cleaned;
  } else if (!cleaned.startsWith("+") && cleaned.length >= 10) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

export function isEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

export async function createUserSession(userId: string, reqHeaders?: Headers) {
  const cookieStore = await cookies();

  // Session rotation: if the client already has a session token, invalidate it before issuing a new one
  const existingToken = cookieStore.get(USER_COOKIE_NAME)?.value;
  if (existingToken) {
    await prisma.userSession.deleteMany({ where: { token: existingToken } }).catch(() => {});
  }

  // Prune expired sessions for this user
  await prisma.userSession
    .deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() },
      },
    })
    .catch(() => {});

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + USER_SESSION_DAYS * 24 * 60 * 60 * 1000);
  const meta = await extractClientMeta(reqHeaders);

  await prisma.userSession.create({
    data: {
      userId,
      token,
      expiresAt,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      device: meta.device,
      os: meta.os,
      browser: meta.browser,
      country: meta.country,
      city: meta.city,
      lastActiveAt: new Date(),
    },
  });

  cookieStore.set(USER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function invalidateAllUserSessions(userId: string, keepCurrentCookie = false) {
  try {
    const cookieStore = await cookies();
    const currentToken = cookieStore.get(USER_COOKIE_NAME)?.value;
    if (keepCurrentCookie && currentToken) {
      await prisma.userSession.deleteMany({
        where: {
          userId,
          token: { not: currentToken },
        },
      });
    } else {
      await prisma.userSession.deleteMany({ where: { userId } });
    }
  } catch (error) {
    console.error("Failed to invalidate user sessions:", error);
  }
}

export async function getUserSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(USER_COOKIE_NAME)?.value;
    if (!token) return null;

    const session = await prisma.userSession.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            authProvider: true,
            googleId: true,
            passwordHash: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session) return null;

    if (session.expiresAt < new Date()) {
      await prisma.userSession.delete({ where: { token } }).catch(() => {});
      return null;
    }

    if (
      session.lastActiveAt &&
      Date.now() - new Date(session.lastActiveAt).getTime() > USER_IDLE_TIMEOUT_MS
    ) {
      await prisma.userSession.delete({ where: { token } }).catch(() => {});
      return null;
    }

    // Touch last active periodically (every 5 mins) without blocking
    if (!session.lastActiveAt || Date.now() - new Date(session.lastActiveAt).getTime() > 5 * 60 * 1000) {
      prisma.userSession
        .update({
          where: { token },
          data: { lastActiveAt: new Date() },
        })
        .catch(() => {});
    }

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      phone: session.user.phone,
      avatar: session.user.avatar,
      authProvider: session.user.authProvider,
      googleId: session.user.googleId,
      hasGoogle: Boolean(session.user.googleId),
      hasPassword: Boolean(session.user.passwordHash),
      createdAt: session.user.createdAt,
    };
  } catch (error) {
    console.error("Error verifying customer user session:", error);
    return null;
  }
}

export async function destroyUserSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(USER_COOKIE_NAME)?.value;
    if (token) {
      await prisma.userSession.delete({ where: { token } }).catch(() => {});
      cookieStore.delete(USER_COOKIE_NAME);
    }
  } catch (error) {
    console.error("Error destroying customer session:", error);
  }
}
