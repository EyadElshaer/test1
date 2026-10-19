import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      include: {
        _count: {
          select: {
            products: {
              where: { isPublished: true, isArchived: false },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error("Failed to load categories:", error);
    return NextResponse.json({ error: "Failed to load categories." }, { status: 500 });
  }
}
