import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import CartDrawer from "@/components/CartDrawer";
import CookieNotice from "@/components/CookieNotice";
import GoogleOneTap from "@/components/GoogleOneTap";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#030712",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://premikeys.com"),
  title: {
    default: "PremiKeys | Genuine Software and Licences",
    template: "%s | PremiKeys",
  },
  description:
    "Official store for genuine Windows 11 activation keys, Microsoft Office suites, cybersecurity tools, and professional software licenses with verified manual payment fulfillment.",
  keywords: [
    "windows 11 pro key",
    "office 2024 license",
    "windows 10 key",
    "software licenses",
    "kaspersky total security",
    "microsoft office",
    "genuine activation keys",
    "premikeys",
  ],
  authors: [{ name: "PremiKeys" }],
  openGraph: {
    title: "PremiKeys | Genuine Software and Licences",
    description:
      "Instant digital activations for Windows 11 Pro, Microsoft Office, and verified software licenses with manual InstaPay and wallet payments.",
    siteName: "PremiKeys",
    images: [{ url: "/images/premikeys-logo.png", width: 800, height: 800, alt: "PremiKeys" }],
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
        <html lang="en" className="dark" data-theme="dark">
          <body className="min-h-screen bg-[#02050f] text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-black relative">
            {/* Ambient iOS 26 Liquid Glass Mesh Wallpaper (marked for Glisse optical refraction) */}
            <div
              data-glisse-backdrop=""
              aria-hidden="true"
              className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none"
            >
              <div className="liquid-ambient-orb absolute -top-[10%] left-[8%] w-[460px] h-[460px] rounded-full bg-gradient-to-br from-blue-600/25 via-cyan-400/15 to-transparent blur-[110px]" />
              <div
                className="liquid-ambient-orb absolute top-[28%] -right-[8%] w-[520px] h-[520px] rounded-full bg-gradient-to-bl from-indigo-600/20 via-purple-500/15 to-cyan-500/10 blur-[120px]"
                style={{ animationDelay: "-6s" }}
              />
              <div
                className="liquid-ambient-orb absolute -bottom-[12%] left-[25%] w-[560px] h-[420px] rounded-full bg-gradient-to-tr from-cyan-500/20 via-blue-600/15 to-transparent blur-[120px]"
                style={{ animationDelay: "-12s" }}
              />
            </div>

            <AuthProvider>
              <GoogleOneTap />
              <CartProvider>
                <AnnouncementBanner />
                <Header />
                <main className="flex-1 w-full relative z-10">{children}</main>
                <CartDrawer />
                <CookieNotice />
                <Footer />
              </CartProvider>
            </AuthProvider>
          </body>
        </html>
        );
}
