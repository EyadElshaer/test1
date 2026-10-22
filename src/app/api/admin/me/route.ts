import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    admin: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      permissions: (admin as any).permissions || null,
      mustChangePassword: admin.mustChangePassword,
    },
  });
}
