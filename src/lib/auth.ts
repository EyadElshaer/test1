import { cookies } from "next/headers";
import crypto from "crypto";
import prisma from "@/lib/prisma";

const COOKIE_NAME = process.env.ADMIN_SESSION_COOKIE || "premikeys_admin_session";
const SESSION_EXPIRY_HOURS = 24;

export async function createAdminSession(adminId: string, ipAddress?: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.adminSession.create({
    data: {
      adminId,
      token,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  await logAdminAudit(adminId, "LOGIN", "Admin logged in successfully", ipAddress);

  return token;
}

export async function getAdminSession() {
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
            mustChangePassword: true,
          },
        },
      },
    });

    if (!session) return null;

    if (session.expiresAt < new Date()) {
      // Session expired, delete it
      await prisma.adminSession.delete({ where: { token } }).catch(() => {});
      return null;
    }

    return session.admin;
  } catch (error) {
    console.error("Error verifying admin session:", error);
    return null;
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
