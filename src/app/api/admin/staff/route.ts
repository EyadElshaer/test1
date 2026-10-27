import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getAdminSession, logAdminAudit } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staffMembers = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, staff: staffMembers });
  } catch (error) {
    console.error("Failed to fetch staff:", error);
    return NextResponse.json({ error: "Failed to load staff accounts." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentAdmin = await getAdminSession();
    if (!currentAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only SUPER_ADMIN or admins with staff permission can create staff
    const isSuperAdmin = currentAdmin.role === "SUPER_ADMIN";
    const allowedPerms = (currentAdmin as any).permissions?.split(",").map((p: string) => p.trim()) || [];
    if (!isSuperAdmin && !allowedPerms.includes("staff")) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to create staff accounts." },
        { status: 403 }
      );
    }

    const { username, password, email, role, permissions } = await req.json();

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters long." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check if username already taken
    const existing = await prisma.admin.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json(
        { error: `An admin account with username "${cleanUsername}" already exists.` },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const cleanPermissions = typeof permissions === "string" ? permissions.trim() : Array.isArray(permissions) ? permissions.join(",") : "";

    // Privilege Escalation Prevention: Only a SUPER_ADMIN can create another SUPER_ADMIN
    const assignedRole = isSuperAdmin && role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";

    const newAdmin = await prisma.admin.create({
      data: {
        username: cleanUsername,
        passwordHash,
        email: email ? email.trim().toLowerCase() : null,
        role: assignedRole,
        permissions: cleanPermissions || null,
        mustChangePassword: false,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        permissions: true,
        createdAt: true,
      },
    });

    await logAdminAudit(
      currentAdmin.id,
      "STAFF_CREATED",
      `Admin account "${newAdmin.username}" (role: ${newAdmin.role}, permissions: ${newAdmin.permissions || "ALL"}) created by ${currentAdmin.username}.`
    );

    return NextResponse.json({ success: true, admin: newAdmin });
  } catch (error) {
    console.error("Failed to create staff account:", error);
    return NextResponse.json({ error: "Failed to create staff account." }, { status: 500 });
  }
}
