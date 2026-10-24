import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { createUserSession, normalizePhone, isEmail } from "@/lib/userAuth";
import { sanitizeString } from "@/lib/sanitizer";
import { getClientIp } from "@/lib/security";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    // Rate limit: max 5 account registrations per 15 minutes per IP
    const rateCheck = checkRateLimit(`register_${ip}`, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many registration attempts. Please wait ${Math.ceil(
            (rateCheck.retryAfterSec || 60) / 60
          )} minutes before trying again.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, identifier, email, phone, password } = body;

    const cleanName = sanitizeString(name, 70);
    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json({ error: "Please enter your full name (minimum 2 characters)." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: "Password exceeds maximum allowable length." },
        { status: 400 }
      );
    }

    // Determine email and phone from fields or generic identifier
    let parsedEmail = email ? sanitizeString(email, 100).toLowerCase() : null;
    let parsedPhone = phone ? normalizePhone(sanitizeString(phone, 30)) : null;

    if (identifier && typeof identifier === "string" && identifier.trim()) {
      const trimmed = sanitizeString(identifier, 100);
      if (isEmail(trimmed)) {
        parsedEmail = trimmed.toLowerCase();
      } else {
        parsedPhone = normalizePhone(trimmed);
      }
    }

    if (!parsedEmail && !parsedPhone) {
      return NextResponse.json(
        { error: "Please provide either a valid email address or phone number." },
        { status: 400 }
      );
    }

    // Check if user already exists
    if (parsedEmail) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email: parsedEmail },
      });
      if (existingByEmail) {
        return NextResponse.json(
          { error: "An account with this email address already exists. Please log in." },
          { status: 400 }
        );
      }
    }

    if (parsedPhone) {
      const existingByPhone = await prisma.user.findUnique({
        where: { phone: parsedPhone },
      });
      if (existingByPhone) {
        return NextResponse.json(
          { error: "An account with this phone number already exists. Please log in." },
          { status: 400 }
        );
      }
    }

    // Hash password securely with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        name: cleanName,
        email: parsedEmail,
        phone: parsedPhone,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    // Automatically link any past guest orders placed with this email or phone
    const orConditions: any[] = [];
    if (parsedEmail) orConditions.push({ customerEmail: parsedEmail });
    if (parsedPhone) orConditions.push({ customerPhone: parsedPhone });

    if (orConditions.length > 0) {
      try {
        await prisma.order.updateMany({
          where: {
            userId: null,
            OR: orConditions,
          },
          data: {
            userId: newUser.id,
          },
        });
      } catch (linkErr) {
        console.warn("Could not backlink previous orders to new user:", linkErr);
      }
    }

    // Create persistent session cookie (stays logged in) with device/location meta
    await createUserSession(newUser.id, req.headers);

    return NextResponse.json({
      success: true,
      user: newUser,
      message: "Account created successfully!",
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
