import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  Flame,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Cpu,
  Layers,
  KeyRound,
  Lock,
  Check,
} from "lucide-react";

// Ensure page always fetches the latest live products from PostgreSQL without stale cache
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  // 1. Fetch all published products with their images and categories
  const allProducts = await prisma.product.findMany({
    where: {
      isPublished: true,
      isArchived: false,
    },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    include: {
      category: { select: { name: true, slug: true } },
      images: { orderBy: { displayOrder: "asc" } },
      attributeValues: true,
    },
  });

  // Separate into featured and regular products
  const featuredProducts = allProducts.filter((p) => p.isFeatured);
  const regularProducts = allProducts.filter((p) => !p.isFeatured);

  // Products to show in main catalog section:
  // If there are featured products, show regular ones here; if none are featured, show all.
  const displayCatalogProducts =
    featuredProducts.length > 0 && regularProducts.length > 0
      ? regularProducts
      : allProducts;

  // 2. Fetch active categories
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    include: {
      _count: {
        select: { products: { where: { isPublished: true, isArchived: false } } },
      },
    },
  });

  // 3. Fetch store settings
  const settingsRecords = await prisma.storeSetting.findMany();
  const settings: Record<string, string> = {};
  for (const s of settingsRecords) {
    settings[s.key] = s.value;
  }

  const customHeading = settings.hero_heading;
  const customSubheading = settings.hero_subheading;

  return (
    <div className="space-y-20 sm:space-y-24 pb-16">
      {/* HERO SECTION - Refined, clean, centered, no product card on the right */}
      <section className="relative min-h-[70vh] sm:min-h-[75vh] flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {/* Ambient Subtle Glow - Lightweight on GPU */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[700px] h-[300px] bg-gradient-to-tr from-blue-600/15 via-cyan-500/10 to-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto w-full text-center relative z-10 space-y-5 sm:space-y-8">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold bg-blue-500/10 text-cyan-300 border border-blue-500/30 backdrop-blur-md shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="line-clamp-1 sm:line-clamp-none">Official PremiKeys Storefront • Verified Digital Licenses</span>
          </div>

          {/* Premium Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.15] sm:leading-[1.08]">
            {customHeading ? (
              customHeading
            ) : (
              <>
                Genuine Digital Software &amp; Licenses,{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300">
                  Delivered Instantly
                </span>
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {customSubheading ||
              "Upgrade your PC with 100% authentic lifetime activation keys for Windows 11, Microsoft Office, and professional software suites. Instant fulfillment and verified order processing."}
          </p>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/products"
              className="w-full sm:w-auto px-9 py-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 hover:from-blue-500 hover:to-cyan-400 shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Explore All Products</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              href="/my-orders"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold text-sm text-slate-200 btn-secondary flex items-center justify-center gap-2 transition-all"
            >
              <span>Track Your Order</span>
            </Link>
          </div>

          {/* Value Highlights Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-8 border-t border-white/10 max-w-3xl mx-auto text-left">
            <div className="p-3 sm:p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="text-lg font-black text-white">100%</div>
              <div className="text-xs text-slate-400">Genuine Licenses</div>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="text-lg font-black text-cyan-400">24/7</div>
              <div className="text-xs text-slate-400">Instant Delivery</div>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="text-lg font-black text-emerald-400">Verified</div>
              <div className="text-xs text-slate-400">Key Release</div>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="text-lg font-black text-rose-400">0 Hidden</div>
              <div className="text-xs text-slate-400">Extra Fees</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS (Updates live when checkbox in admin dashboard is checked) */}
      {featuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-widest">
                <Flame className="w-4 h-4 fill-current" />
                <span>Featured Licenses</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Top Rated &amp; Recommended
              </h2>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all"
            >
              <span>See All Products</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                slug={product.slug}
                shortDescription={product.shortDescription}
                salePrice={product.salePrice}
                originalPrice={product.originalPrice}
                discountPercent={product.discountPercent}
                platform={product.platform}
                productType={product.productType}
                availability={product.availability}
                category={product.category}
                images={product.images}
                attributeValues={product.attributeValues}
              />
            ))}
          </div>
        </section>
      )}

      {/* ALL PRODUCTS / STORE CATALOG SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest">
              <Cpu className="w-4 h-4" />
              <span>Available Products</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Genuine Software Catalog
            </h2>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all"
          >
            <span>See All Products</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {displayCatalogProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayCatalogProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                slug={product.slug}
                shortDescription={product.shortDescription}
                salePrice={product.salePrice}
                originalPrice={product.originalPrice}
                discountPercent={product.discountPercent}
                platform={product.platform}
                productType={product.productType}
                availability={product.availability}
                category={product.category}
                images={product.images}
                attributeValues={product.attributeValues}
              />
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-12 text-center space-y-4">
            <p className="text-slate-400 text-sm">No products available at the moment.</p>
            <Link href="/products" className="btn-secondary px-6 py-2.5 rounded-xl text-xs font-semibold inline-block">
              See All Products
            </Link>
          </div>
        )}

        {/* Prominent "See All Products" Action Button */}
        <div className="mt-12 text-center">
          <Link
            href="/products"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5"
          >
            <span>See All Products</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* HOW ORDERING & MANUAL PAYMENT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-3xl p-8 sm:p-12 relative overflow-hidden border border-blue-500/20">
          <div className="max-w-2xl mb-10">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
              Simple 4-Step Process
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-1">
              How Ordering &amp; Manual Payment Works
            </h2>
            <p className="text-sm text-slate-300 mt-2">
              We operate on verified manual payment transfers (InstaPay, Vodafone Cash, Bank Wire). Every order is verified by our team before software key release.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3 relative group hover:border-cyan-400/30 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center border border-blue-500/30 text-lg">
                1
              </div>
              <h3 className="font-bold text-white text-base">Select Software License</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose your Windows, Office, or software product and click to view full details and options.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3 relative group hover:border-cyan-400/30 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center border border-blue-500/30 text-lg">
                2
              </div>
              <h3 className="font-bold text-white text-base">Transfer Total Amount</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Send the exact order amount via your preferred method (InstaPay, Vodafone Cash, or Bank).
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3 relative group hover:border-cyan-400/30 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center border border-blue-500/30 text-lg">
                3
              </div>
              <h3 className="font-bold text-white text-base">Upload Receipt Proof</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Take a clear screenshot of your transfer confirmation and upload it during checkout.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3 relative group hover:border-cyan-400/30 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center border border-emerald-500/30 text-lg">
                4
              </div>
              <h3 className="font-bold text-white text-base">Verified Key Release</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Our team reviews your payment and unlocks your genuine license key in your My Orders tracking portal!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-900/40 via-[#0a102b] to-indigo-950/40 border border-blue-500/30 p-8 sm:p-14 text-center space-y-6 shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black text-white">
              Ready to Activate Genuine Software?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Find genuine Windows 11 activations, Microsoft Office suites, and professional software licenses with verified manual InstaPay / Vodafone Cash payments.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/products"
              className="w-full sm:w-auto px-9 py-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-xl shadow-blue-500/25 transition-all"
            >
              See All Products
            </Link>
            <Link
              href="/faq"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold text-sm text-slate-300 btn-secondary transition-all"
            >
              Frequently Asked Questions
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
