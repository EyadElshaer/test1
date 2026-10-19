import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession, logAdminAudit } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error("Failed to load categories:", error);
    return NextResponse.json({ error: "Failed to load categories." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, slug: customSlug, description, image, displayOrder, isActive, isFeatured } =
      await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    }

    const slug = customSlug?.trim()
      ? customSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
      : name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        image: image || null,
        displayOrder: parseInt(displayOrder) || 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        isFeatured: Boolean(isFeatured),
      },
    });

    await logAdminAudit(admin.id, "CATEGORY_CREATED", `Category created: ${category.name}`);

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Failed to create category:", error);
    return NextResponse.json({ error: "Failed to create category." }, { status: 500 });
  }
}
