import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import {
  requireAdmin,
  createAdminSession,
  invalidateAllAdminSessions,
  logAdminAudit,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(undefined, { allowMustChangePassword: true });
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

    const ip = getClientIp(req);
    const rate = checkRateLimit(`admin_pw_change_${admin.id}_${ip}`, 5, 15 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many password change attempts. Please try again later." },
        { status: 429 }
      );
    }

    const { currentPassword, newPassword, confirmPassword } = await req.json();

    if (
      !newPassword ||
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      newPassword.length > 128
    ) {
      return NextResponse.json(
        { error: "New password must be between 8 and 128 characters long." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation do not match." },
        { status: 400 }
      );
    }

    // Verify current password
    const dbAdmin = await prisma.admin.findUnique({
      where: { id: admin.id },
    });

    if (!dbAdmin) {
      return NextResponse.json({ error: "Admin not found." }, { status: 404 });
    }

    if (!currentPassword || typeof currentPassword !== "string") {
      return NextResponse.json({ error: "Current password is required." }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(currentPassword, dbAdmin.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    // Redact INITIAL_ADMIN_SETUP.json if present so no plaintext initial credentials remain on disk
    try {
      const setupPath = path.join(process.cwd(), "INITIAL_ADMIN_SETUP.json");
      if (fs.existsSync(setupPath)) {
        const currentContent = JSON.parse(fs.readFileSync(setupPath, "utf-8"));
        currentContent.initialPassword = "[CHANGED_BY_ADMIN_IN_DASHBOARD]";
        currentContent.mustChangePassword = false;
        fs.writeFileSync(setupPath, JSON.stringify(currentContent, null, 2), "utf-8");
      }
    } catch {
      // Ignore file errors
    }

    // Invalidate all existing sessions for this admin and issue a rotated session cookie
    await invalidateAllAdminSessions(admin.id, false);
    await createAdminSession(admin.id, ip, req.headers);

    await logAdminAudit(
      admin.id,
      "PASSWORD_CHANGED",
      "Administrator changed their password and invalidated previous sessions",
      ip
    );

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. You can now use your new password.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Failed to update password." }, { status: 500 });
  }
}
