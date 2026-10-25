import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const sessionUser = await getUserSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    // If the user already has a password set, verify their current password
    if (user.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Please enter your current password to confirm this change." },
          { status: 400 }
        );
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { error: "Current password does not match. Please try again." },
          { status: 400 }
        );
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
      },
    });

    return NextResponse.json({
      success: true,
      message: user.passwordHash
        ? "Password updated successfully!"
        : "Password created successfully! You can now log in using your password.",
    });
  } catch (error) {
    console.error("Error setting/changing user password:", error);
    return NextResponse.json({ error: "Failed to update password." }, { status: 500 });
  }
}
