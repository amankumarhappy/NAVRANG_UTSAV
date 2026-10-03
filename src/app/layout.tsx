import type { Metadata } from "next";
import { Inter, Kalam, Yatra_One } from "next/font/google";
import { Toaster } from "sonner";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import eventPoster from "@/assets/posters/Navrang Utsav 2026.png";
import { site } from "@/config/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const yatra = Yatra_One({ subsets: ["latin"], weight: "400", variable: "--font-yatra", display: "swap" });
const kalam = Kalam({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-kalam", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "NAVRANG 26 — Dandiya Night 2026 | GEC Buxar",
  description: site.description,
  openGraph: {
    title: "NAVRANG 26 — Dandiya Night 2026",
    description: site.description,
    images: [{ url: eventPoster.src, width: eventPoster.width, height: eventPoster.height, alt: "NAVRANG Utsav 2026 Dandiya Night event poster" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${yatra.variable} ${kalam.variable}`}>
        <Header />
        <main>{children}</main>
        <Footer />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
