import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { createUserSession, normalizePhone, isEmail } from "@/lib/userAuth";
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
    const { identifier, password, recaptchaToken } = body;

    const trimmed = sanitizeString(identifier, 100);

    // 1. Check IP & Account Lockout Status
    const securityStatus = checkLoginSecurity(ip, trimmed || undefined, "customer");
    if (securityStatus.isLocked) {
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
    if (!trimmed) {
      return NextResponse.json(
        { error: "Please enter your email address or phone number." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Please enter your password." },
        { status: 400 }
      );
    }

    // 3. Official Google reCAPTCHA Verification (Required only after repeated failed attempts)
    if (securityStatus.requiresCaptcha) {
      const recaptchaCheck = await verifyGoogleRecaptcha(recaptchaToken);
      if (!recaptchaCheck.success) {
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

    // 4. Look up user account
    let user: any = null;
    if (isEmail(trimmed)) {
      user = await prisma.user.findUnique({
        where: { email: trimmed.toLowerCase() },
      });
    } else {
      const normalized = normalizePhone(trimmed);
      user = await prisma.user.findFirst({
        where: {
          OR: [{ phone: normalized }, { phone: trimmed }],
        },
      });
    }

    if (!user) {
      // Record failed attempt to stop blind credential stuffing
      const failResult = await recordFailedLogin(ip, trimmed, "customer");
      const status = failResult.isLocked ? 429 : 401;

      return NextResponse.json(
        {
          error: failResult.isLocked
            ? failResult.message
            : "No account found with this email or phone number.",
          isLocked: failResult.isLocked,
          requiresCaptcha: failResult.requiresCaptcha,
          remainingAttempts: failResult.remainingAttempts,
          retryAfterSeconds: failResult.retryAfterSeconds,
        },
        { status }
      );
    }

    // 5. Verify Password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Tarpit delay against brute-force dictionary attacks
      const failCount = 10 - securityStatus.remainingAttempts;
      await applyTarpitDelay(failCount);

      // Record failed login strike
      const failResult = await recordFailedLogin(ip, trimmed, "customer");
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

    // 6. Login Success -> Reset failure records immediately
    recordSuccessfulLogin(ip, trimmed, "customer");

    // 7. Backlink past guest orders if any
    const orConditions: any[] = [];
    if (user.email) orConditions.push({ customerEmail: user.email });
    if (user.phone) orConditions.push({ customerPhone: user.phone });

    if (orConditions.length > 0) {
      try {
        await prisma.order.updateMany({
          where: {
            userId: null,
            OR: orConditions,
          },
          data: {
            userId: user.id,
          },
        });
      } catch (linkErr) {
        console.warn("Could not backlink previous orders to logged-in user:", linkErr);
      }
    }

    // 8. Create user session cookie
    await createUserSession(user.id, req.headers);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt,
      },
      message: "Logged in successfully!",
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to log in. Please try again." },
      { status: 500 }
    );
  }
}
