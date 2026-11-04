import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { requireAdmin, logAdminAudit } from "@/lib/auth";
import { isValidId, sanitizeString } from "@/lib/sanitizer";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin("customers");
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid customer ID." }, { status: 400 });
    }
    const { password, name, email, phone } = await req.json();

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Customer account not found." }, { status: 404 });
    }

    const updateData: any = {};
    const auditChanges: string[] = [];

    // Password change
    if (password !== undefined && password !== null && password !== "") {
      if (typeof password !== "string" || password.length < 8 || password.length > 128) {
        return NextResponse.json(
          { error: "Password must be between 8 and 128 characters long." },
          { status: 400 }
        );
      }
      const passwordHash = await bcrypt.hash(password, 12);
      updateData.passwordHash = passwordHash;
      auditChanges.push("Password reset");

      // Invalidate existing sessions so the new password takes immediate effect
      await prisma.userSession.deleteMany({
        where: { userId: id },
      }).catch(() => {});
    }

    if (name && typeof name === "string" && name.trim()) {
      const cleanName = sanitizeString(name, 80);
      if (cleanName) {
        updateData.name = cleanName;
        auditChanges.push(`Name changed to "${cleanName}"`);
      }
    }

    if (email !== undefined) {
      const cleanEmail = email && typeof email === "string" ? email.trim().toLowerCase() : null;
      if (cleanEmail) {
        // Check uniqueness
        const dup = await prisma.user.findFirst({
          where: { email: cleanEmail, NOT: { id } },
        });
        if (dup) {
          return NextResponse.json({ error: "This email address is already taken by another account." }, { status: 409 });
        }
      }
      updateData.email = cleanEmail;
      auditChanges.push(`Email set to "${cleanEmail || 'None'}"`);
    }

    if (phone !== undefined) {
      const cleanPhone = phone && typeof phone === "string" ? phone.trim() : null;
      if (cleanPhone) {
        const dup = await prisma.user.findFirst({
          where: { phone: cleanPhone, NOT: { id } },
        });
        if (dup) {
          return NextResponse.json({ error: "This phone number is already taken by another account." }, { status: 409 });
        }
      }
      updateData.phone = cleanPhone;
      auditChanges.push(`Phone set to "${cleanPhone || 'None'}"`);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No changes provided." }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    await logAdminAudit(
      admin.id,
      "CUSTOMER_UPDATED",
      `Admin "${admin.username}" updated customer account "${existingUser.name}" (${existingUser.email || existingUser.phone || id}). Changes: ${auditChanges.join(", ")}.`
    );

    return NextResponse.json({
      success: true,
      message: password
        ? `Password for "${existingUser.name}" has been successfully changed.`
        : `Customer account updated successfully.`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
      },
    });
  } catch (error) {
    console.error("Failed to update customer account:", error);
    return NextResponse.json({ error: "Failed to update customer account." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin("customers");
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid customer ID." }, { status: 400 });
    }
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Customer account not found." }, { status: 404 });
    }

    // Sessions cascade delete, orders get userId = null
    await prisma.user.delete({
      where: { id },
    });

    await logAdminAudit(
      admin.id,
      "CUSTOMER_DELETED",
      `Customer account for "${existingUser.name}" (${existingUser.email || existingUser.phone || "No contact"}) was deleted by ${admin.username}.`
    );

    return NextResponse.json({
      success: true,
      message: `Customer account "${existingUser.name}" deleted successfully.`,
    });
  } catch (error) {
    console.error("Failed to delete customer:", error);
    return NextResponse.json({ error: "Failed to delete customer account." }, { status: 500 });
  }
}

