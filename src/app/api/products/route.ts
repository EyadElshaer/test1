import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { extractConfigurations } from "@/lib/configurations";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category") || "ALL";
    const sort = searchParams.get("sort") || "featured";
    const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : null;
    const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : null;
    const discountedOnly = searchParams.get("discounted") === "true";
    const availability = searchParams.get("availability") || "ALL";
    const platform = searchParams.get("platform") || "ALL";
    const productType = searchParams.get("productType") || "ALL";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "16"));
    const skip = (page - 1) * limit;

    const where: any = {
      isPublished: true,
      isArchived: false,
    };

    if (category !== "ALL") {
      where.OR = [
        { category: { slug: category } },
        { categoryId: category },
      ];
    }

    if (platform !== "ALL") {
      where.platform = platform;
    }

    if (productType !== "ALL") {
      where.productType = productType;
    }

    if (availability === "IN_STOCK") {
      where.availability = "IN_STOCK";
    }

    if (discountedOnly) {
      where.discountPercent = { gt: 0 };
    }

    if (minPrice !== null || maxPrice !== null) {
      where.salePrice = {};
      if (minPrice !== null) where.salePrice.gte = minPrice;
      if (maxPrice !== null) where.salePrice.lte = maxPrice;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { shortDescription: { contains: search } },
        { description: { contains: search } },
        { platform: { contains: search } },
        { compatibility: { contains: search } },
        { productType: { contains: search } },
      ];
    }

    // Dynamic attribute filtering (e.g. ?attr_region=Global)
    const attributeConditions: { attributeKey: string; value: string }[] = [];
    searchParams.forEach((val, key) => {
      if (key.startsWith("attr_") && val) {
        const attrKey = key.replace("attr_", "");
        attributeConditions.push({ attributeKey: attrKey, value: val });
      }
    });

    if (attributeConditions.length > 0) {
      where.AND = attributeConditions.map((cond) => ({
        attributeValues: {
          some: {
            attributeKey: cond.attributeKey,
            value: cond.value,
          },
        },
      }));
    }

    // Order By
    let orderBy: any = [{ displayOrder: "asc" }, { createdAt: "desc" }];
    if (sort === "price-asc") {
      orderBy = { salePrice: "asc" };
    } else if (sort === "price-desc") {
      orderBy = { salePrice: "desc" };
    } else if (sort === "newest") {
      orderBy = { createdAt: "desc" };
    } else if (sort === "name") {
      orderBy = { title: "asc" };
    } else if (sort === "featured") {
      orderBy = [{ isFeatured: "desc" }, { displayOrder: "asc" }, { createdAt: "desc" }];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { orderBy: { displayOrder: "asc" } },
          attributeValues: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    const mappedProducts = products.map((prod: any) => ({
      ...prod,
      configurations: extractConfigurations(prod),
    }));

    return NextResponse.json({
      success: true,
      products: mappedProducts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Public products fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch products." }, { status: 500 });
  }
}
