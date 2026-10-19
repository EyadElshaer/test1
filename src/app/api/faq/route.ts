import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const faqs = await prisma.faqItem.findMany({
      where: { isPublished: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ success: true, faqs });
  } catch (error) {
    console.error("Failed to load FAQs:", error);
    return NextResponse.json({ error: "Failed to load FAQs." }, { status: 500 });
  }
}
