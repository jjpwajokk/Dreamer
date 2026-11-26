import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { siteUrl, TAGLINE } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Dreamer: give to real, verified needs", template: "%s · Dreamer" },
  description: TAGLINE,
  openGraph: { siteName: "Dreamer", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#04100d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
