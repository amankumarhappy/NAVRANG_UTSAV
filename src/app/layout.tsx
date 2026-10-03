import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { Toaster } from "sonner";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import eventPoster from "@/assets/posters/Navrang Utsav 2026.png";
import { site } from "@/config/site";
import "./globals.css";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-roboto", display: "swap" });

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
      <body className={roboto.variable}>
        <Header />
        <main>{children}</main>
        <Footer />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
