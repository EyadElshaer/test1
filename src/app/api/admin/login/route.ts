import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { createAdminSession, logAdminAudit } from "@/lib/auth";
import { sanitizeString } from "@/lib/sanitizer";
import { verifyGoogleRecaptcha } from "@/lib/recaptcha";
import {
  getClientIp,
  checkLoginSecurity,
  recordFailedLogin,
  recordSuccessfulLogin,
  applyTarpitDelay,
} from "@/lib/security";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const body = await req.json();
    const { username, password, recaptchaToken } = body;

    const cleanUsername = sanitizeString(username, 50);

    // 1. Initial IP & Account Lockout Check
    const securityStatus = checkLoginSecurity(ip, cleanUsername || undefined, "admin");
    if (securityStatus.isLocked) {
      await logAdminAudit(
        null,
        "ADMIN_LOGIN_BLOCKED",
        `Blocked attempt from restricted IP: ${ip} (Target: ${cleanUsername})`,
        ip
      );

      return NextResponse.json(
        {
          error: securityStatus.message,
          isLocked: true,
          retryAfterSeconds: securityStatus.retryAfterSeconds,
          remainingAttempts: 0,
        },
        { status: 429 }
      );
    }

    // 2. Validate input fields
    if (!cleanUsername || !password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    // 3. Official Google reCAPTCHA Verification (Required only after repeated failed attempts)
    if (securityStatus.requiresCaptcha) {
      const recaptchaCheck = await verifyGoogleRecaptcha(recaptchaToken);
      if (!recaptchaCheck.success) {
        await logAdminAudit(
          null,
          "ADMIN_RECAPTCHA_FAILED",
          recaptchaCheck.error || "Google reCAPTCHA verification failed",
          ip
        );

        return NextResponse.json(
          {
            error: recaptchaCheck.error || "Please complete the 'I'm not a robot' verification checkbox.",
            requiresCaptcha: true,
            recaptchaFailed: true,
            remainingAttempts: securityStatus.remainingAttempts,
          },
          { status: 403 }
        );
      }
    }

    // 4. Find Admin in Database
    const admin = await prisma.admin.findUnique({
      where: { username: cleanUsername },
    });

    if (!admin) {
      const failResult = await recordFailedLogin(ip, cleanUsername, "admin");
      await logAdminAudit(null, "LOGIN_FAILED", `Failed admin login: user "${cleanUsername}" not found`, ip);

      const status = failResult.isLocked ? 429 : 401;
      return NextResponse.json(
        {
          error: failResult.isLocked ? failResult.message : "Invalid username or password.",
          isLocked: failResult.isLocked,
          requiresCaptcha: failResult.requiresCaptcha,
          remainingAttempts: failResult.remainingAttempts,
          retryAfterSeconds: failResult.retryAfterSeconds,
        },
        { status }
      );
    }

    // 5. Verify Password
    const isMatch = await bcrypt.compare(password, admin.passwordHash);

    if (!isMatch) {
      const failCount = 5 - securityStatus.remainingAttempts;
      await applyTarpitDelay(failCount);

      const failResult = await recordFailedLogin(ip, cleanUsername, "admin");
      await logAdminAudit(admin.id, "LOGIN_FAILED", `Incorrect password for admin user "${cleanUsername}"`, ip);

      const status = failResult.isLocked ? 429 : 401;
      return NextResponse.json(
        {
          error: failResult.message,
          isLocked: failResult.isLocked,
          requiresCaptcha: failResult.requiresCaptcha,
          remainingAttempts: failResult.remainingAttempts,
          retryAfterSeconds: failResult.retryAfterSeconds,
        },
        { status }
      );
    }

    // 6. Successful Authentication -> Clear security strikes
    recordSuccessfulLogin(ip, cleanUsername, "admin");

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
