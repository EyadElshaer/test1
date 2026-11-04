import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import {
  requireAdmin,
  hasAdminPermission,
  invalidateAllAdminSessions,
  logAdminAudit,
} from "@/lib/auth";
import { isValidId, sanitizeString } from "@/lib/sanitizer";

const VALID_PERMISSIONS = new Set([
  "orders",
  "refunds",
  "customers",
  "products",
  "categories",
  "filters",
  "payment-methods",
  "promo-codes",
  "faq",
  "settings",
  "security",
  "staff",
]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin("staff");
    if (!auth.authorized) return auth.response;
    const currentAdmin = auth.admin;
    const isSuperAdmin = currentAdmin.role === "SUPER_ADMIN";

    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid staff ID." }, { status: 400 });
    }

    const { password, role, permissions, email } = await req.json();

    const targetAdmin = await prisma.admin.findUnique({
      where: { id },
    });

    if (!targetAdmin) {
      return NextResponse.json({ error: "Admin account not found." }, { status: 404 });
    }

    // Protection: Non-superadmins cannot modify a SUPER_ADMIN account
    if (targetAdmin.role === "SUPER_ADMIN" && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only a SUPER_ADMIN can modify another SUPER_ADMIN account." },
        { status: 403 }
      );
    }

    // Non-superadmins cannot modify another admin who holds permissions the currentAdmin lacks
    if (!isSuperAdmin && targetAdmin.permissions) {
      const targetPerms = targetAdmin.permissions
        .split(",")
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean);
      for (const tp of targetPerms) {
        if (!hasAdminPermission(currentAdmin, tp)) {
          return NextResponse.json(
            { error: "Forbidden: You cannot modify an admin with higher permissions than your own." },
            { status: 403 }
          );
        }
      }
    }

    const updateData: any = {};
    let passwordChanged = false;
    if (password !== undefined && password !== "") {
      if (typeof password !== "string" || password.length < 8 || password.length > 128) {
        return NextResponse.json(
          { error: "Password must be between 8 and 128 characters long." },
          { status: 400 }
        );
      }
      updateData.passwordHash = await bcrypt.hash(password, 12);
      passwordChanged = true;
    }

    if (role && (role === "SUPER_ADMIN" || role === "ADMIN")) {
      // Privilege Escalation Prevention: Only a SUPER_ADMIN can assign the SUPER_ADMIN role
      if (role === "SUPER_ADMIN" && !isSuperAdmin) {
        return NextResponse.json(
          { error: "Forbidden: Only a SUPER_ADMIN can promote an account to SUPER_ADMIN." },
          { status: 403 }
        );
      }
      // Prevent demoting the last SUPER_ADMIN
      if (targetAdmin.role === "SUPER_ADMIN" && role === "ADMIN") {
        const superAdminCount = await prisma.admin.count({
          where: { role: "SUPER_ADMIN" },
        });
        if (superAdminCount <= 1) {
          return NextResponse.json(
            { error: "Cannot demote the last remaining SUPER_ADMIN account." },
            { status: 400 }
          );
        }
      }
      updateData.role = role;
    }

    if (permissions !== undefined) {
      const rawPermList =
        typeof permissions === "string"
          ? permissions.split(",")
          : Array.isArray(permissions)
          ? permissions
          : [];
      const normalizedPerms = rawPermList
        .map((p: unknown) => (typeof p === "string" ? p.trim().toLowerCase() : ""))
        .filter((p: string) => VALID_PERMISSIONS.has(p));

      if (!isSuperAdmin) {
        for (const perm of normalizedPerms) {
          if (!hasAdminPermission(currentAdmin, perm)) {
            return NextResponse.json(
              {
                error: `Forbidden: You cannot grant the "${perm}" permission because your account does not possess it.`,
              },
              { status: 403 }
            );
          }
        }
      }
      updateData.permissions = normalizedPerms.join(",");
    }

    if (email !== undefined) {
      updateData.email =
        email && typeof email === "string" ? sanitizeString(email, 120).toLowerCase() : null;
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

    if (passwordChanged) {
      await invalidateAllAdminSessions(id, currentAdmin.id === id);
    }

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
    const auth = await requireAdmin("staff");
    if (!auth.authorized) return auth.response;
    const currentAdmin = auth.admin;
    const isSuperAdmin = currentAdmin.role === "SUPER_ADMIN";

    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid staff ID." }, { status: 400 });
    }

    if (currentAdmin.id === id) {
      return NextResponse.json({ error: "Cannot delete your own active admin account." }, { status: 400 });
    }

    const targetAdmin = await prisma.admin.findUnique({
      where: { id },
    });

    if (!targetAdmin) {
      return NextResponse.json({ error: "Admin account not found." }, { status: 404 });
    }

    // Protection: Non-superadmins cannot delete a SUPER_ADMIN
    if (targetAdmin.role === "SUPER_ADMIN" && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only a SUPER_ADMIN can delete another SUPER_ADMIN account." },
        { status: 403 }
      );
    }

    if (!isSuperAdmin && targetAdmin.permissions) {
      const targetPerms = targetAdmin.permissions
        .split(",")
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean);
      for (const tp of targetPerms) {
        if (!hasAdminPermission(currentAdmin, tp)) {
          return NextResponse.json(
            { error: "Forbidden: You cannot delete an admin with permissions you do not possess." },
            { status: 403 }
          );
        }
      }
    }

    // Guard: Prevent deleting the last SUPER_ADMIN in the system
    if (targetAdmin.role === "SUPER_ADMIN") {
      const superAdminCount = await prisma.admin.count({
        where: { role: "SUPER_ADMIN" },
      });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last remaining SUPER_ADMIN account." },
          { status: 400 }
        );
      }
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
