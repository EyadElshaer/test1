import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, hasAdminPermission, logAdminAudit } from "@/lib/auth";
import { sanitizeString } from "@/lib/sanitizer";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;
    if (
      !hasAdminPermission(auth.admin, "categories") &&
      !hasAdminPermission(auth.admin, "products") &&
      !hasAdminPermission(auth.admin, "filters")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    const auth = await requireAdmin("categories");
    if (!auth.authorized) return auth.response;
    const admin = auth.admin;

    const { name, slug: customSlug, description, image, displayOrder, isActive, isFeatured } =
      await req.json();

    const cleanName = typeof name === "string" ? sanitizeString(name, 100) : "";
    if (!cleanName) {
      return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    }

    const slug = customSlug?.trim()
      ? customSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
      : cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const category = await prisma.category.create({
      data: {
        name: cleanName,
        slug,
        description: description ? sanitizeString(description, 500) : null,
        image: image ? sanitizeString(image, 500) : null,
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
