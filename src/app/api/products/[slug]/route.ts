import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        images: { orderBy: { displayOrder: "asc" } },
        attributeValues: true,
      },
    });

    if (!product || !product.isPublished || product.isArchived) {
      return NextResponse.json({ error: "Product not found or currently unavailable." }, { status: 404 });
    }

    // Related products in the same category
    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        isPublished: true,
        isArchived: false,
      },
      take: 4,
      orderBy: { isFeatured: "desc" },
      include: {
        images: { orderBy: { displayOrder: "asc" }, take: 1 },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json({
      success: true,
      product,
      relatedProducts,
    });
  } catch (error) {
    console.error("Product detail error:", error);
    return NextResponse.json({ error: "Failed to load product details." }, { status: 500 });
  }
}
