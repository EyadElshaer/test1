import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession, logAdminAudit } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const categoryId = searchParams.get("categoryId") || "ALL";
    const status = searchParams.get("status") || "ALL";

    const where: any = {};
    if (categoryId !== "ALL") {
      where.categoryId = categoryId;
    }
    if (status === "PUBLISHED") {
      where.isPublished = true;
      where.isArchived = false;
    } else if (status === "UNPUBLISHED") {
      where.isPublished = false;
      where.isArchived = false;
    } else if (status === "ARCHIVED") {
      where.isArchived = true;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { slug: { contains: search } },
        { platform: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { displayOrder: "asc" } },
        attributeValues: true,
      },
    });

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json({ error: "Failed to load products." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      slug: customSlug,
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
      images,
      attributes,
    } = body;

    if (!title || !description || !categoryId) {
      return NextResponse.json({ error: "Title, description, and category are required." }, { status: 400 });
    }

    const orig = Number(originalPrice);
    const sale = Number(salePrice);

    if (isNaN(orig) || isNaN(sale) || orig < 0 || sale < 0) {
      return NextResponse.json({ error: "Prices must be non-negative numbers." }, { status: 400 });
    }

    if (sale > orig) {
      return NextResponse.json({ error: "Sale price cannot be greater than original regular price." }, { status: 400 });
    }

    // Server-side discount calculation: ((orig - sale) / orig) * 100
    const discountPercent = orig > 0 && sale < orig ? Math.round(((orig - sale) / orig) * 100) : 0;

    let slug = customSlug?.trim()
      ? customSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
      : title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

    // Ensure unique slug
    let uniqueSlug = slug;
    let counter = 1;
    while (await prisma.product.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    const newProduct = await prisma.$transaction(async (tx: any) => {
      const product = await tx.product.create({
        data: {
          title: title.trim(),
          slug: uniqueSlug,
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
          isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
          isArchived: false,
        },
      });

      if (Array.isArray(images) && images.length > 0) {
        for (let idx = 0; idx < images.length; idx++) {
          const img = images[idx];
          await tx.productImage.create({
            data: {
              productId: product.id,
              url: typeof img === "string" ? img : img.url,
              altText: img.altText || product.title,
              isPrimary: idx === 0,
              displayOrder: idx,
            },
          });
        }
      }

      if (Array.isArray(attributes) && attributes.length > 0) {
        for (const attr of attributes) {
          if (attr.attributeKey && attr.value) {
            await tx.productAttributeValue.create({
              data: {
                productId: product.id,
                attributeKey: attr.attributeKey,
                value: attr.value,
              },
            });
          }
        }
      }

      return product;
    });

    await logAdminAudit(admin.id, "PRODUCT_CREATED", `Product created: ${newProduct.title} (${newProduct.id})`);

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
  }
}
