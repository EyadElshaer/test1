import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { createAdminSession, logAdminAudit } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rateCheck = checkRateLimit(`admin_login_${ip}`, 6, 60 * 1000); // 6 attempts per minute
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please wait ${rateCheck.retryAfterSec} seconds before trying again.` },
        { status: 429 }
      );
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({
      where: { username: username.trim() },
    });

    if (!admin) {
      await logAdminAudit(null, "LOGIN_FAILED", `Failed login attempt for username: ${username}`, ip);
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      await logAdminAudit(admin.id, "LOGIN_FAILED", "Incorrect password", ip);
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    // Create session & set HttpOnly cookie
    await createAdminSession(admin.id, ip);

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        mustChangePassword: admin.mustChangePassword,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ error: "Authentication failed." }, { status: 500 });
  }
}
