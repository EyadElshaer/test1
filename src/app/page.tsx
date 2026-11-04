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
        {/* HERO SECTION - iOS 26 Liquid Glass Aesthetic */}
        <section className="relative min-h-[72vh] sm:min-h-[78vh] flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 pt-6 pb-12">
          {/* Ambient Iridescent Glows */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] sm:w-[820px] h-[360px] bg-gradient-to-tr from-blue-600/25 via-cyan-400/20 to-purple-600/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-5xl mx-auto w-full text-center relative z-10">
              {/* Outer Liquid Glass Showcase Frame */}
              <div className="glass-panel rounded-[36px] sm:rounded-[44px] p-6 sm:p-12 lg:p-14 space-y-6 sm:space-y-8 relative overflow-hidden">
                {/* Specular Top Light Rim */}
                <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

                {/* Trust Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold glass-pill text-cyan-200">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span className="line-clamp-1 sm:line-clamp-none">Official PremiKeys Storefront • Verified Digital Licenses</span>
                </div>

                {/* Premium Headline */}
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] sm:leading-[1.06] drop-shadow-sm">
                  {customHeading ? (
                    customHeading
                  ) : (
                    <>
                      Genuine Digital Software &amp; Licenses,{" "}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-300">
                        Delivered Instantly
                      </span>
                    </>
                  )}
                </h1>

                  {/* Subtitle */}
                  <p className="text-base sm:text-lg text-slate-200/90 max-w-2xl mx-auto leading-relaxed">
                    {customSubheading ||
                      "Upgrade your PC with 100% authentic lifetime activation keys for Windows 11, Microsoft Office, and professional software suites. Instant fulfillment and verified order processing."}
                  </p>

                {/* Primary CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
                  <Link
                    href="/products"
                    className="w-full sm:w-auto px-9 py-4 rounded-full font-bold text-sm text-white btn-primary flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Explore All Products</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>

                      <Link
                        href="/my-orders"
                        className="w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-sm text-white btn-secondary flex items-center justify-center gap-2"
                      >
                        <span>Track Your Order</span>
                      </Link>
                    </div>

                      {/* Value Highlights Bar - iOS Liquid Glass Capsules */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-6 border-t border-white/15 max-w-3xl mx-auto text-left">
                        <div className="p-3.5 sm:p-4 rounded-2xl glass-pill">
                          <div className="text-lg font-black text-white">100%</div>
                          <div className="text-xs text-slate-300">Genuine Licenses</div>
                        </div>
                        <div className="p-3.5 sm:p-4 rounded-2xl glass-pill">
                          <div className="text-lg font-black text-cyan-300">24/7</div>
                          <div className="text-xs text-slate-300">Instant Delivery</div>
                        </div>
                        <div className="p-3.5 sm:p-4 rounded-2xl glass-pill">
                          <div className="text-lg font-black text-emerald-300">Verified</div>
                          <div className="text-xs text-slate-300">Key Release</div>
                        </div>
                        <div className="p-3.5 sm:p-4 rounded-2xl glass-pill">
                          <div className="text-lg font-black text-rose-300">0 Hidden</div>
                          <div className="text-xs text-slate-300">Extra Fees</div>
                        </div>
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
                    <div className="glass-panel rounded-[36px] p-8 sm:p-12 relative overflow-hidden">
                      <div className="max-w-2xl mb-10">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-cyan-300 glass-pill uppercase tracking-widest mb-2">
                            Simple 4-Step Process
                          </span>
                          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-1">
                            How Ordering &amp; Manual Payment Works
                          </h2>
                            <p className="text-sm text-slate-200/90 mt-2">
                              We operate on verified manual payment transfers (InstaPay, Vodafone Cash, Bank Wire). Every order is verified by our team before software key release.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
                            {/* Step 1 */}
                                <div className="p-6 rounded-3xl glass-card space-y-3 relative group">
                                  <div className="w-10 h-10 rounded-2xl glass-pill text-cyan-300 font-mono font-bold flex items-center justify-center text-lg">
                                    1
                                  </div>
                                  <h3 className="font-bold text-white text-base">Select Software License</h3>
                                    <p className="text-xs text-slate-300/90 leading-relaxed">
                                      Choose your Windows, Office, or software product and click to view full details and options.
                                    </p>
                                </div>

                                {/* Step 2 */}
                                    <div className="p-6 rounded-3xl glass-card space-y-3 relative group">
                                      <div className="w-10 h-10 rounded-2xl glass-pill text-cyan-300 font-mono font-bold flex items-center justify-center text-lg">
                                        2
                                      </div>
                                      <h3 className="font-bold text-white text-base">Transfer Total Amount</h3>
                                        <p className="text-xs text-slate-300/90 leading-relaxed">
                                          Send the exact order amount via your preferred method (InstaPay, Vodafone Cash, or Bank).
                                        </p>
                                    </div>

                                    {/* Step 3 */}
                                        <div className="p-6 rounded-3xl glass-card space-y-3 relative group">
                                          <div className="w-10 h-10 rounded-2xl glass-pill text-cyan-300 font-mono font-bold flex items-center justify-center text-lg">
                                            3
                                          </div>
                                          <h3 className="font-bold text-white text-base">Upload Receipt Proof</h3>
                                            <p className="text-xs text-slate-300/90 leading-relaxed">
                                              Take a clear screenshot of your transfer confirmation and upload it during checkout.
                                            </p>
                                        </div>

                                        {/* Step 4 */}
                                            <div className="p-6 rounded-3xl glass-card space-y-3 relative group">
                                              <div className="w-10 h-10 rounded-2xl glass-pill text-emerald-300 font-mono font-bold flex items-center justify-center text-lg">
                                                4
                                              </div>
                                              <h3 className="font-bold text-white text-base">Verified Key Release</h3>
                                                <p className="text-xs text-slate-300/90 leading-relaxed">
                                                  Our team reviews your payment and unlocks your genuine license key in your My Orders tracking portal!
                                                </p>
                                            </div>
                                          </div>
                                        </div>
                                      </section>

                                      {/* FINAL CALL TO ACTION */}
                                      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                          <div className="relative rounded-[36px] overflow-hidden glass-panel p-8 sm:p-14 text-center space-y-6">
                                            <div className="max-w-2xl mx-auto space-y-3">
                                              <h2 className="text-3xl sm:text-5xl font-black text-white">
                                                Ready to Activate Genuine Software?
                                              </h2>
                                                <p className="text-slate-200/90 text-sm sm:text-base leading-relaxed">
                                                  Find genuine Windows 11 activations, Microsoft Office suites, and professional software licenses with verified manual InstaPay / Vodafone Cash payments.
                                                </p>
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                                              <Link
                                                href="/products"
                                                className="w-full sm:w-auto px-9 py-4 rounded-full font-bold text-sm text-white btn-primary"
                                              >
                                                See All Products
                                              </Link>
                                              <Link
                                                href="/faq"
                                                className="w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-sm text-white btn-secondary"
                                              >
                                                Frequently Asked Questions
                                              </Link>
                                            </div>
                                          </div>
                                      </section>
                                    </div>
                                    );
}
