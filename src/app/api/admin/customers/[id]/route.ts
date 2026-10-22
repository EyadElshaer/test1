import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession, logAdminAudit } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
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
