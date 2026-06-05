import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import RefCodeCapture from "@/components/RefCodeCapture";
import StructuredData from "@/components/StructuredData";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-sans",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://wearebornbare.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "born bare — nothing but sleep.",
    template: "%s — born bare",
  },
  description:
    "Bamboo nappies for better sleep. Honest materials, kinder to skin, gentler on the planet. Join the waitlist.",
  openGraph: {
    type: "website",
    siteName: "born bare",
    title: "born bare — nothing but sleep.",
    description:
      "Bamboo nappies for better sleep. Honest materials, kinder to skin, gentler on the planet.",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "born bare — nothing but sleep.",
    description:
      "Bamboo nappies for better sleep. Honest materials, kinder to skin, gentler on the planet.",
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en-GB"
      className={`${serif.variable} ${sans.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-bare text-earth">
        <StructuredData />
        <RefCodeCapture />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
