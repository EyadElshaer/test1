import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getAdminSession, logAdminAudit } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { password } = await req.json();

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: "Customer account not found." }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    // Invalidate sessions so old logins are refreshed
    await prisma.userSession.deleteMany({
      where: { userId: id },
    }).catch(() => {});

    await logAdminAudit(
      admin.id,
      "CUSTOMER_PASSWORD_RESET",
      `Admin "${admin.username}" changed password for customer "${user.name}" (${user.email || user.phone || id}).`
    );

    return NextResponse.json({
      success: true,
      message: `Password for "${user.name}" has been successfully changed.`,
    });
  } catch (error) {
    console.error("Failed to change customer password:", error);
    return NextResponse.json({ error: "Failed to change customer password." }, { status: 500 });
  }
}
