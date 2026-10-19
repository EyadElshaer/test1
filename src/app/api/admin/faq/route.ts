import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession, logAdminAudit } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const faqs = await prisma.faqItem.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, faqs });
  } catch (error) {
    console.error("Failed to load FAQs:", error);
    return NextResponse.json({ error: "Failed to load FAQs." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { category, question, answer, displayOrder, isPublished } = await req.json();

    if (!question || !answer) {
      return NextResponse.json({ error: "Question and answer are required." }, { status: 400 });
    }

    const faq = await prisma.faqItem.create({
      data: {
        category: category || "General",
        question: question.trim(),
        answer: answer.trim(),
        displayOrder: parseInt(displayOrder) || 0,
        isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
      },
    });

    await logAdminAudit(admin.id, "FAQ_CREATED", `FAQ created: ${faq.question}`);

    return NextResponse.json({ success: true, faq });
  } catch (error) {
    console.error("Failed to create FAQ:", error);
    return NextResponse.json({ error: "Failed to create FAQ." }, { status: 500 });
  }
}
