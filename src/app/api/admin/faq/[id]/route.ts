import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, logAdminAudit } from "@/lib/auth";
import { isValidId, sanitizeString, sanitizeText } from "@/lib/sanitizer";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin("faq");
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid FAQ ID." }, { status: 400 });
    }
    const { category, question, answer, displayOrder, isPublished } = await req.json();

    const updated = await prisma.faqItem.update({
      where: { id },
      data: {
        category: category ? sanitizeString(category, 100) : "General",
        question: sanitizeString(question, 500),
        answer: sanitizeText(answer, 5000),
        displayOrder: parseInt(displayOrder) || 0,
        isPublished: Boolean(isPublished),
      },
    });

    await logAdminAudit(admin.id, "FAQ_UPDATED", `FAQ updated: ${updated.question}`);

    return NextResponse.json({ success: true, faq: updated });
  } catch (error) {
    console.error("Failed to update FAQ:", error);
    return NextResponse.json({ error: "Failed to update FAQ." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin("faq");
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid FAQ ID." }, { status: 400 });
    }
    await prisma.faqItem.delete({ where: { id } });
    await logAdminAudit(admin.id, "FAQ_DELETED", `FAQ deleted: ${id}`);

    return NextResponse.json({ success: true, message: "FAQ item deleted." });
  } catch (error) {
    console.error("Failed to delete FAQ:", error);
    return NextResponse.json({ error: "Failed to delete FAQ." }, { status: 500 });
  }
}
