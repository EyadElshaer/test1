import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getAdminSession, logAdminAudit } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword, confirmPassword } = await req.json();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long." },
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

    const isMatch = await bcrypt.compare(currentPassword, dbAdmin.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    await logAdminAudit(admin.id, "PASSWORD_CHANGED", "Administrator changed their password successfully");

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. You can now use your new password.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Failed to update password." }, { status: 500 });
  }
}
