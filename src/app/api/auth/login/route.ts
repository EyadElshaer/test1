import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { createUserSession, normalizePhone, isEmail } from "@/lib/userAuth";

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !identifier.trim()) {
      return NextResponse.json(
        { error: "Please enter your email address or phone number." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json({ error: "Please enter your password." }, { status: 400 });
    }

    const trimmed = identifier.trim();
    let user: any = null;

    if (isEmail(trimmed)) {
      user = await prisma.user.findUnique({
        where: { email: trimmed.toLowerCase() },
      });
    } else {
      const normalized = normalizePhone(trimmed);
      // Search by normalized phone or exact string
      user = await prisma.user.findFirst({
        where: {
          OR: [{ phone: normalized }, { phone: trimmed }],
        },
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email or phone number." },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect password. Please try again." },
        { status: 401 }
      );
    }

    // Link any unassigned past orders matching phone or email to this user
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

    // Create persistent session cookie (stays logged in)
    await createUserSession(user.id);

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
