import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { requireAdmin, hasAdminPermission, logAdminAudit } from "@/lib/auth";
import { sanitizeString } from "@/lib/sanitizer";

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

export async function GET() {
  try {
    const auth = await requireAdmin("staff");
    if (!auth.authorized) return auth.response;

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
    const auth = await requireAdmin("staff");
    if (!auth.authorized) return auth.response;
    const currentAdmin = auth.admin;

    const isSuperAdmin = currentAdmin.role === "SUPER_ADMIN";

    const { username, password, email, role, permissions } = await req.json();

    const rawUsername = typeof username === "string" ? sanitizeString(username, 50) : "";
    if (!rawUsername || rawUsername.length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(rawUsername)) {
      return NextResponse.json(
        { error: "Username must be at least 3 alphanumeric characters long." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8 || password.length > 128) {
      return NextResponse.json(
        { error: "Password must be between 8 and 128 characters long." },
        { status: 400 }
      );
    }

    const cleanUsername = rawUsername.toLowerCase();

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

    // Parse and validate requested permissions
    const rawPermList =
      typeof permissions === "string"
        ? permissions.split(",")
        : Array.isArray(permissions)
          ? permissions
          : [];
    const normalizedPerms = rawPermList
      .map((p: unknown) => (typeof p === "string" ? p.trim().toLowerCase() : ""))
      .filter((p: string) => VALID_PERMISSIONS.has(p));

    // Horizontal/Vertical Privilege Escalation Prevention:
    // A non-SUPER_ADMIN staff manager cannot grant permissions they do not possess themselves
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

    const passwordHash = await bcrypt.hash(password, 12);
    const cleanPermissions = normalizedPerms.join(",");

    // Privilege Escalation Prevention: Only a SUPER_ADMIN can create another SUPER_ADMIN
    if (role === "SUPER_ADMIN" && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only a SUPER_ADMIN can create another SUPER_ADMIN account." },
        { status: 403 }
      );
    }
    const assignedRole = isSuperAdmin && role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";

    const cleanEmail =
      email && typeof email === "string" && email.trim()
        ? sanitizeString(email, 120).toLowerCase()
        : `${cleanUsername}@premikeys.local`;

    const newAdmin = await prisma.admin.create({
      data: {
        username: cleanUsername,
        passwordHash,
        email: cleanEmail,
        role: assignedRole,
        permissions: assignedRole === "SUPER_ADMIN" ? "*" : cleanPermissions,
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
      `Admin account "${newAdmin.username}" (role: ${newAdmin.role}, permissions: ${newAdmin.permissions || "NONE"}) created by ${currentAdmin.username}.`
    );

    return NextResponse.json({ success: true, admin: newAdmin });
  } catch (error) {
    console.error("Failed to create staff account:", error);
    return NextResponse.json({ error: "Failed to create staff account." }, { status: 500 });
  }
}
