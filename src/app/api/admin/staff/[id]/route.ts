import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getAdminSession, logAdminAudit } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentAdmin = await getAdminSession();
    if (!currentAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = currentAdmin.role === "SUPER_ADMIN";
    const allowedPerms = (currentAdmin as any).permissions?.split(",").map((p: string) => p.trim()) || [];
    if (!isSuperAdmin && !allowedPerms.includes("staff")) {
      return NextResponse.json({ error: "Forbidden: You do not have staff management permission." }, { status: 403 });
    }

    const { id } = await params;
    const { password, role, permissions, email } = await req.json();

    const targetAdmin = await prisma.admin.findUnique({
      where: { id },
    });

    if (!targetAdmin) {
      return NextResponse.json({ error: "Admin account not found." }, { status: 404 });
    }

    const updateData: any = {};
    if (password && typeof password === "string" && password.length >= 6) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    if (role && (role === "SUPER_ADMIN" || role === "ADMIN")) {
      updateData.role = role;
    }
    if (permissions !== undefined) {
      updateData.permissions = typeof permissions === "string" ? permissions.trim() : Array.isArray(permissions) ? permissions.join(",") : "";
    }
    if (email !== undefined) {
      updateData.email = email ? email.trim().toLowerCase() : null;
    }

    const updated = await prisma.admin.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        permissions: true,
        updatedAt: true,
      },
    });

    await logAdminAudit(
      currentAdmin.id,
      "STAFF_UPDATED",
      `Admin "${updated.username}" updated by ${currentAdmin.username}.`
    );

    return NextResponse.json({ success: true, admin: updated });
  } catch (error) {
    console.error("Failed to update staff:", error);
    return NextResponse.json({ error: "Failed to update staff." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentAdmin = await getAdminSession();
    if (!currentAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = currentAdmin.role === "SUPER_ADMIN";
    const allowedPerms = (currentAdmin as any).permissions?.split(",").map((p: string) => p.trim()) || [];
    if (!isSuperAdmin && !allowedPerms.includes("staff")) {
      return NextResponse.json({ error: "Forbidden: You do not have staff management permission." }, { status: 403 });
    }

    const { id } = await params;

    if (currentAdmin.id === id) {
      return NextResponse.json({ error: "Cannot delete your own active admin account." }, { status: 400 });
    }

    const targetAdmin = await prisma.admin.findUnique({
      where: { id },
    });

    if (!targetAdmin) {
      return NextResponse.json({ error: "Admin account not found." }, { status: 404 });
    }

    // Delete sessions then admin
    await prisma.adminSession.deleteMany({
      where: { adminId: id },
    });

    await prisma.admin.delete({
      where: { id },
    });

    await logAdminAudit(
      currentAdmin.id,
      "STAFF_DELETED",
      `Admin account "${targetAdmin.username}" was deleted by ${currentAdmin.username}.`
    );

    return NextResponse.json({
      success: true,
      message: `Admin account "${targetAdmin.username}" deleted successfully.`,
    });
  } catch (error) {
    console.error("Failed to delete staff:", error);
    return NextResponse.json({ error: "Failed to delete staff account." }, { status: 500 });
  }
}
