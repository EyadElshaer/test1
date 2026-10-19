import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import prisma from "@/lib/prisma";
import ProductDetailClient from "./ProductDetailClient";
import ProductCard from "@/components/ProductCard";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { images: { orderBy: { displayOrder: "asc" }, take: 1 } },
  });

  if (!product) return { title: "Product Not Found | PremiKeys" };

  return {
    title: `${product.title} | PremiKeys`,
    description: product.shortDescription || `Buy genuine ${product.title} digital activation key from PremiKeys.`,
    openGraph: {
      title: `${product.title} | PremiKeys`,
      description: product.shortDescription || `Genuine digital activation key for ${product.title}.`,
      images: product.images[0] ? [{ url: product.images[0].url }] : [],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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
    notFound();
  }

  // Related products
  const related = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: product.id },
      isPublished: true,
      isArchived: false,
    },
    take: 4,
    include: {
      category: { select: { name: true, slug: true } },
      images: { orderBy: { displayOrder: "asc" } },
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Breadcrumb Navigation */}
      <nav className="text-xs text-slate-400 flex items-center gap-2">
        <Link href="/" className="hover:text-white">
          Home
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-white">
          Products
        </Link>
        <span>/</span>
        <Link
          href={`/products?category=${product.category.slug}`}
          className="hover:text-white text-slate-300"
        >
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-cyan-400 truncate max-w-xs">{product.title}</span>
      </nav>

      {/* Interactive Client Product Details (Gallery, Quantity, Add to Cart, Buy Now) */}
      <ProductDetailClient product={product} />

      {/* Related Products */}
      {related.length > 0 && (
        <div className="space-y-6 pt-10 border-t border-white/10">
          <div>
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
              Similar Activations
            </span>
            <h2 className="text-2xl font-bold text-white mt-1">Related Products</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((item) => (
              <ProductCard
                key={item.id}
                id={item.id}
                title={item.title}
                slug={item.slug}
                shortDescription={item.shortDescription}
                salePrice={item.salePrice}
                originalPrice={item.originalPrice}
                discountPercent={item.discountPercent}
                platform={item.platform}
                productType={item.productType}
                availability={item.availability}
                category={item.category}
                images={item.images}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
