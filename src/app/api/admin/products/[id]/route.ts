import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession, logAdminAudit } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { displayOrder: "asc" } },
        attributeValues: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Failed to load product:", error);
    return NextResponse.json({ error: "Failed to load product." }, { status: 500 });
  }
}

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
    const body = await req.json();
    const {
      title,
      slug,
      shortDescription,
      description,
      originalPrice,
      salePrice,
      categoryId,
      platform,
      productType,
      compatibility,
      deliveryInstructions,
      availability,
      stockQuantity,
      isFeatured,
      isPublished,
      isArchived,
      displayOrder,
      images,
      attributes,
    } = body;

    const orig = Number(originalPrice);
    const sale = Number(salePrice);

    if (isNaN(orig) || isNaN(sale) || orig < 0 || sale < 0) {
      return NextResponse.json({ error: "Prices must be non-negative numbers." }, { status: 400 });
    }

    if (sale > orig) {
      return NextResponse.json({ error: "Sale price cannot exceed original price." }, { status: 400 });
    }

    const discountPercent = orig > 0 && sale < orig ? Math.round(((orig - sale) / orig) * 100) : 0;

    const updated = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id },
        data: {
          title: title.trim(),
          slug: slug?.trim() || undefined,
          shortDescription: shortDescription?.trim() || null,
          description: description.trim(),
          originalPrice: orig,
          salePrice: sale,
          discountPercent,
          categoryId,
          platform: platform?.trim() || null,
          productType: productType?.trim() || null,
          compatibility: compatibility?.trim() || null,
          deliveryInstructions: deliveryInstructions?.trim() || null,
          availability: availability || "IN_STOCK",
          stockQuantity: parseInt(stockQuantity) || 999,
          isFeatured: Boolean(isFeatured),
          isPublished: Boolean(isPublished),
          isArchived: isArchived !== undefined ? Boolean(isArchived) : false,
          displayOrder: parseInt(displayOrder) || 0,
        },
      });

      if (Array.isArray(images)) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        for (let idx = 0; idx < images.length; idx++) {
          const img = images[idx];
          await tx.productImage.create({
            data: {
              productId: id,
              url: typeof img === "string" ? img : img.url,
              altText: img.altText || prod.title,
              isPrimary: idx === 0,
              displayOrder: idx,
            },
          });
        }
      }

      if (Array.isArray(attributes)) {
        await tx.productAttributeValue.deleteMany({ where: { productId: id } });
        for (const attr of attributes) {
          if (attr.attributeKey && attr.value) {
            await tx.productAttributeValue.create({
              data: {
                productId: id,
                attributeKey: attr.attributeKey,
                value: attr.value,
              },
            });
          }
        }
      }

      return prod;
    });

    await logAdminAudit(admin.id, "PRODUCT_UPDATED", `Product updated: ${updated.title} (${updated.id})`);

    return NextResponse.json({ success: true, product: updated });
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json({ error: "Failed to update product." }, { status: 500 });
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
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { orderItems: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    // If product has been ordered in history, preserve historical order records and archive it
    if (existing.orderItems.length > 0) {
      await prisma.product.update({
        where: { id },
        data: {
          isArchived: true,
          isPublished: false,
        },
      });
      await logAdminAudit(
        admin.id,
        "PRODUCT_ARCHIVED",
        `Product ${existing.title} (${id}) archived because it is referenced in past orders.`
      );
      return NextResponse.json({
        success: true,
        message: "Product has been archived to preserve historical order records.",
      });
    }

    // Otherwise safely delete
    await prisma.product.delete({ where: { id } });
    await logAdminAudit(admin.id, "PRODUCT_DELETED", `Product ${existing.title} (${id}) deleted permanently.`);

    return NextResponse.json({ success: true, message: "Product deleted successfully." });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json({ error: "Failed to delete product." }, { status: 500 });
  }
}
