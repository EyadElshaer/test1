import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession, logAdminAudit } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { category, question, answer, displayOrder, isPublished } = await req.json();

    const updated = await prisma.faqItem.update({
      where: { id },
      data: {
        category: category || "General",
        question: question.trim(),
        answer: answer.trim(),
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
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.faqItem.delete({ where: { id } });
    await logAdminAudit(admin.id, "FAQ_DELETED", `FAQ deleted: ${id}`);

    return NextResponse.json({ success: true, message: "FAQ item deleted." });
  } catch (error) {
    console.error("Failed to delete FAQ:", error);
    return NextResponse.json({ error: "Failed to delete FAQ." }, { status: 500 });
  }
}
