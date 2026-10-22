import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import CartDrawer from "@/components/CartDrawer";
import CookieNotice from "@/components/CookieNotice";

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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#030712] text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-black">
        <AuthProvider>
          <CartProvider>
            <AnnouncementBanner />
            <Header />
            <main className="flex-1 w-full">{children}</main>
            <CartDrawer />
            <CookieNotice />
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
