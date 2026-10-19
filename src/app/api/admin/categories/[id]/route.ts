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
    const { name, slug, description, image, displayOrder, isActive, isFeatured } =
      await req.json();

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: name.trim(),
        slug: slug?.trim() || undefined,
        description: description?.trim() || null,
        image: image || null,
        displayOrder: parseInt(displayOrder) || 0,
        isActive: Boolean(isActive),
        isFeatured: Boolean(isFeatured),
      },
    });

    await logAdminAudit(admin.id, "CATEGORY_UPDATED", `Category updated: ${category.name}`);

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Failed to update category:", error);
    return NextResponse.json({ error: "Failed to update category." }, { status: 500 });
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

    // Check if category is still referenced by products
    const productCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category: ${productCount} product(s) are assigned to it. Reassign or delete those products first.`,
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });
    await logAdminAudit(admin.id, "CATEGORY_DELETED", `Category deleted (${id})`);

    return NextResponse.json({ success: true, message: "Category deleted successfully." });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json({ error: "Failed to delete category." }, { status: 500 });
  }
}
