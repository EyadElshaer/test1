import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, logAdminAudit } from "@/lib/auth";
import { sanitizeString, sanitizeText } from "@/lib/sanitizer";

export async function GET() {
  try {
    const auth = await requireAdmin("faq");
    if (!auth.authorized) return auth.response;

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
    const auth = await requireAdmin("faq");
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

    const { category, question, answer, displayOrder, isPublished } = await req.json();

    const cleanQuestion = typeof question === "string" ? sanitizeString(question, 500) : "";
    const cleanAnswer = typeof answer === "string" ? sanitizeText(answer, 5000) : "";

    if (!cleanQuestion || !cleanAnswer) {
      return NextResponse.json({ error: "Question and answer are required." }, { status: 400 });
    }

    const faq = await prisma.faqItem.create({
      data: {
        category: category ? sanitizeString(category, 100) : "General",
        question: cleanQuestion,
        answer: cleanAnswer,
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
