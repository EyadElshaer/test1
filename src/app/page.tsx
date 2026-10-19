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
} from "lucide-react";

export default async function HomePage() {
  // 1. Fetch featured products from actual database
  const featuredProducts = await prisma.product.findMany({
    where: {
      isPublished: true,
      isArchived: false,
      isFeatured: true,
    },
    take: 4,
    orderBy: { displayOrder: "asc" },
    include: {
      category: { select: { name: true, slug: true } },
      images: { orderBy: { displayOrder: "asc" } },
    },
  });

  // 2. Fetch recently added software licenses
  const recentProducts = await prisma.product.findMany({
    where: {
      isPublished: true,
      isArchived: false,
    },
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true, slug: true } },
      images: { orderBy: { displayOrder: "asc" } },
    },
  });

  // 3. Fetch active categories
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    include: {
      _count: {
        select: { products: { where: { isPublished: true, isArchived: false } } },
      },
    },
  });

  // 4. Fetch store settings
  const settingsRecords = await prisma.storeSetting.findMany();
  const settings: Record<string, string> = {};
  for (const s of settingsRecords) {
    settings[s.key] = s.value;
  }

  const heroHeading = settings.hero_heading || "Official Genuine Software & Windows Licenses";
  const heroSubheading =
    settings.hero_subheading ||
    "Instant digital activation keys for Windows 11 Pro, Microsoft Office 2024, Kaspersky Security, and premium professional software licenses with verified manual fulfillment.";

  return (
    <div className="space-y-24 pb-16">
      {/* HERO SECTION */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Cinematic Ambient Glow Background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/20 via-cyan-500/15 to-rose-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left Column: Headlines & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-cyan-300 border border-blue-500/30 backdrop-blur-md shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Official PremiKeys Storefront • Verified Digital License Fulfillment</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] font-mono">
              {heroHeading.split("&")[0]}
              {heroHeading.includes("&") && (
                <>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-rose-400">
                    & {heroHeading.split("&")[1]}
                  </span>
                </>
              )}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              {heroSubheading}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              <Link
                href="/products"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 hover:from-blue-500 hover:to-cyan-400 shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Shop Software Licenses</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>

              <Link
                href="/my-orders"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl font-semibold text-sm text-slate-200 btn-secondary flex items-center justify-center gap-2 transition-all"
              >
                <span>Track Existing Order</span>
              </Link>
            </div>

            {/* Micro Highlights */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10 max-w-lg mx-auto lg:mx-0 text-left">
              <div>
                <div className="text-xl font-black text-white font-mono">100%</div>
                <div className="text-[11px] text-slate-400">Genuine Licenses</div>
              </div>
              <div>
                <div className="text-xl font-black text-cyan-400 font-mono">InstaPay</div>
                <div className="text-[11px] text-slate-400">Direct Manual Pay</div>
              </div>
              <div>
                <div className="text-xl font-black text-rose-400 font-mono">0 Hidden</div>
                <div className="text-[11px] text-slate-400">Extra Fees</div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Showcase */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-md aspect-square rounded-3xl p-1 bg-gradient-to-b from-cyan-500/30 via-blue-600/20 to-transparent shadow-2xl shadow-blue-900/40">
              <div className="w-full h-full rounded-[22px] overflow-hidden bg-[#0a1024] relative flex flex-col justify-between p-6 border border-white/10">
                {/* Transparent Logo (No rounded box, no text) */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="relative h-10 w-28">
                    <Image
                      src="/images/premikeys-logo.png"
                      alt="PremiKeys"
                      fill
                      sizes="112px"
                      className="object-contain"
                    />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    DIGITAL VAULT
                  </span>
                </div>

                {/* Central Featured Key Showcase */}
                <div className="relative z-10 my-auto text-center space-y-4">
                  <div className="relative mx-auto w-44 h-44 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                    <Image
                      src="https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=600&q=80"
                      alt="Windows 11 Pro Key"
                      fill
                      sizes="176px"
                      className="object-cover"
                    />
                    <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-md py-1 px-2 rounded-lg text-[10px] font-mono text-cyan-300 border border-white/10">
                      XXXXX-XXXXX-XXXXX-XXXXX
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">
                      Bestselling License
                    </span>
                    <h3 className="text-xl font-bold text-white">Windows 11 Pro Retail</h3>
                    <p className="text-xs text-slate-400">Instant Lifetime Digital Activation</p>
                  </div>
                </div>

                {/* Bottom Trust Line */}
                <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/10 text-xs">
                  <span className="text-slate-400">Verified Platform</span>
                  <span className="font-bold text-white">380 EGP <span className="line-through text-slate-500 font-normal text-[11px]">650 EGP</span></span>
                </div>

                {/* Background Artwork Effect */}
                <div className="absolute inset-0 bg-radial-gradient from-blue-600/10 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest">
              <Layers className="w-4 h-4" />
              <span>Explore Software Collections</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Curated Software & License Suites
            </h2>
          </div>
          <Link
            href="/products"
            className="text-xs font-semibold text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            <span>View All Categories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="glass-card rounded-2xl p-6 group block hover:border-cyan-400/40 relative overflow-hidden transition-all duration-300 gpu-layer"
            >
              <div className="relative h-28 w-full rounded-xl overflow-hidden mb-4 bg-slate-900 border border-white/5">
                {cat.image ? (
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Cpu className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              </div>

              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                  {cat.name}
                </h3>
                <span className="text-xs font-semibold text-slate-400 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                  {cat._count.products}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                {cat.description || "Browse genuine software and activation licenses."}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      {featuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-widest">
                <Flame className="w-4 h-4 fill-current" />
                <span>Featured Licenses</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Top Rated Operating Systems & Software
              </h2>
            </div>
            <Link
              href="/products"
              className="text-xs font-semibold text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <span>Explore Entire Catalog</span>
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
              />
            ))}
          </div>
        </section>
      )}

      {/* HOW ORDERING & MANUAL PAYMENT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-3xl p-8 sm:p-12 relative overflow-hidden border border-blue-500/20">
          <div className="max-w-2xl mb-10">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
              Simple 4-Step Process
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-1">
              How Ordering & Manual Payment Works
            </h2>
            <p className="text-sm text-slate-300 mt-2">
              We operate on verified manual payment transfers (InstaPay, Vodafone Cash, Bank Wire, Crypto). Every order is verified by our team before software key release.
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
                Choose your Windows, Office, or software product and click Buy Now or Add to Cart.
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

      {/* RECENTLY ADDED CATALOG HIGHLIGHT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest">
              <Cpu className="w-4 h-4" />
              <span>Catalog Highlights</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Latest Additions & Licenses
            </h2>
          </div>
          <Link
            href="/products"
            className="text-xs font-semibold text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            <span>Browse Full Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recentProducts.map((product) => (
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
            />
          ))}
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-900/60 via-[#0a102b] to-indigo-950/60 border border-blue-500/30 p-8 sm:p-14 text-center space-y-6 shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black text-white font-mono">
              Ready to Activate Genuine Software?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Find genuine Windows 11 activations, Microsoft Office suites, and professional software licenses with verified manual InstaPay / Vodafone Cash payments.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/products"
              className="w-full sm:w-auto px-9 py-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-xl shadow-blue-500/30 transition-all"
            >
              Browse All Licenses
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
