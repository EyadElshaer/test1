import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const filterGroups = await prisma.filterGroup.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      include: {
        options: { orderBy: { displayOrder: "asc" } },
      },
    });

    return NextResponse.json({ success: true, filterGroups });
  } catch (error) {
    console.error("Failed to load public filters:", error);
    return NextResponse.json({ error: "Failed to load filters." }, { status: 500 });
  }
}
