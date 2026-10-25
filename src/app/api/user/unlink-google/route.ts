import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const sessionUser = await getUserSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        googleId: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (!user.googleId) {
      return NextResponse.json({ error: "No Google account is currently linked." }, { status: 400 });
    }

    // Safety guard: The user must have a password or an alternative contact to avoid locking out
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error:
            "Please create a password for your account first before unlinking Google, so you can continue signing in.",
          requiresPassword: true,
        },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: null,
        authProvider: user.passwordHash ? "local" : "phone",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Google account successfully unlinked from your profile.",
    });
  } catch (error) {
    console.error("Error unlinking Google account:", error);
    return NextResponse.json({ error: "Failed to unlink Google account." }, { status: 500 });
  }
}
