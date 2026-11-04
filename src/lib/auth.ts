import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { extractClientMeta } from "@/lib/clientMeta";

const COOKIE_NAME = process.env.ADMIN_SESSION_COOKIE || "premikeys_admin_session";
const SESSION_EXPIRY_HOURS = 12; // 12-hour absolute session expiration
const SESSION_IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4-hour inactivity timeout

export interface AuthenticatedAdmin {
  id: string;
  username: string;
  email: string | null;
  role: string;
  permissions: string | null;
  mustChangePassword: boolean;
}

export async function createAdminSession(
  adminId: string,
  ipAddress?: string,
  reqHeaders?: Headers
) {
  const cookieStore = await cookies();

  // Session rotation: if the client already holds an admin session cookie, destroy the old session first
  const existingToken = cookieStore.get(COOKIE_NAME)?.value;
  if (existingToken) {
    await prisma.adminSession.deleteMany({ where: { token: existingToken } }).catch(() => {});
  }

  // Prune any expired sessions for this admin
  await prisma.adminSession
    .deleteMany({
      where: {
        adminId,
        expiresAt: { lt: new Date() },
      },
    })
    .catch(() => {});

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);
  const meta = reqHeaders ? await extractClientMeta(reqHeaders) : null;

  await prisma.adminSession.create({
    data: {
      adminId,
      token,
      expiresAt,
      ipAddress: ipAddress || meta?.ipAddress || null,
      userAgent: meta?.userAgent || null,
      device: meta?.device || null,
      os: meta?.os || null,
      browser: meta?.browser || null,
      country: meta?.country || null,
      city: meta?.city || null,
      lastActiveAt: new Date(),
    },
  });

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  await logAdminAudit(adminId, "LOGIN", "Admin logged in successfully", ipAddress || meta?.ipAddress);

  return token;
}

export async function getAdminSession(): Promise<AuthenticatedAdmin | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const session = await prisma.adminSession.findUnique({
      where: { token },
      include: {
        admin: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            permissions: true,
            mustChangePassword: true,
          },
        },
      },
    });

    if (!session) return null;

    const now = new Date();

    // 1. Check absolute session expiration
    if (session.expiresAt < now) {
      await prisma.adminSession.delete({ where: { token } }).catch(() => {});
      return null;
    }

    // 2. Check inactivity timeout (4 hours)
    if (
      session.lastActiveAt &&
      now.getTime() - new Date(session.lastActiveAt).getTime() > SESSION_IDLE_TIMEOUT_MS
    ) {
      await prisma.adminSession.delete({ where: { token } }).catch(() => {});
      return null;
    }

    // Touch lastActiveAt periodically (every 2 minutes)
    if (
      !session.lastActiveAt ||
      now.getTime() - new Date(session.lastActiveAt).getTime() > 2 * 60 * 1000
    ) {
      prisma.adminSession
        .update({
          where: { token },
          data: { lastActiveAt: now },
        })
        .catch(() => {});
    }

    return session.admin;
  } catch (error) {
    console.error("Error verifying admin session:", error);
    return null;
  }
}

/**
 * Checks whether an admin possesses a specific section permission.
 * SUPER_ADMIN always has full permissions.
 * Standard ADMIN (staff) must explicitly have the permission in their comma-separated list (or "*").
 * Empty or null permissions on a non-SUPER_ADMIN account grant ZERO section permissions.
 */
export function hasAdminPermission(
  admin: Pick<AuthenticatedAdmin, "role" | "permissions"> | null | undefined,
  permission?: string
): boolean {
  if (!admin) return false;
  if (!permission) return true;
  if (admin.role === "SUPER_ADMIN") return true;
  if (!admin.permissions || !admin.permissions.trim()) return false;

  const list = admin.permissions
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  if (list.includes("*")) return true;
  return list.includes(permission.toLowerCase());
}

/**
 * Centralized server-side authorization guard for all `/api/admin/*` endpoints.
 * Enforces:
 * 1. Valid authenticated session (401 if missing/expired)
 * 2. Mandatory initial password change (403 if mustChangePassword is true)
 * 3. Granular Role-Based Access Control (403 if staff lacks requiredPermission)
 */
export async function requireAdmin(
  requiredPermission?: string,
  options?: { allowMustChangePassword?: boolean }
): Promise<
  | { authorized: true; admin: AuthenticatedAdmin; response?: undefined }
  | { authorized: false; admin?: null; response: NextResponse }
> {
  const admin = await getAdminSession();
  if (!admin) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (admin.mustChangePassword && !options?.allowMustChangePassword) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error: "Forbidden: You must change your initial password before accessing administrative resources.",
          mustChangePassword: true,
        },
        { status: 403 }
      ),
    };
  }

  if (requiredPermission && !hasAdminPermission(admin, requiredPermission)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: `Forbidden: Insufficient permissions (${requiredPermission} required).` },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, admin };
}

/**
 * Invalidates all active sessions for a given admin (e.g., on password change or security reset).
 */
export async function invalidateAllAdminSessions(adminId: string, keepCurrentCookie = false) {
  try {
    const cookieStore = await cookies();
    const currentToken = cookieStore.get(COOKIE_NAME)?.value;
    if (keepCurrentCookie && currentToken) {
      await prisma.adminSession.deleteMany({
        where: {
          adminId,
          token: { not: currentToken },
        },
      });
    } else {
      await prisma.adminSession.deleteMany({ where: { adminId } });
    }
  } catch (error) {
    console.error("Failed to invalidate admin sessions:", error);
  }
}

export async function destroyAdminSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) {
      const session = await prisma.adminSession.findUnique({ where: { token } });
      if (session) {
        await logAdminAudit(session.adminId, "LOGOUT", "Admin logged out");
      }
      await prisma.adminSession.delete({ where: { token } }).catch(() => {});
      cookieStore.delete(COOKIE_NAME);
    }
  } catch (error) {
    console.error("Error destroying session:", error);
  }
}

export async function logAdminAudit(
  adminId: string | null,
  action: string,
  details?: string,
  ipAddress?: string
) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        details: typeof details === "object" ? JSON.stringify(details) : details,
        ipAddress,
      },
    });
  } catch (err) {
    console.error("Failed to write admin audit log:", err);
  }
}
