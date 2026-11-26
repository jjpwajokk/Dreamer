import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { siteUrl, TAGLINE } from "@/lib/config";

const DESCRIPTION = "Back real, verified dreams across Nigeria: school fees, health, rent, small businesses and more. Every need is checked, and every naira goes straight to where it's needed.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  applicationName: "Dreamer",
  title: { default: "Dreamer: give to real, verified needs", template: "%s · Dreamer" },
  description: TAGLINE,
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "Dreamer",
    type: "website",
    locale: "en_NG",
    url: "/",
    title: "Dreamer: give to real, verified needs",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: "Dreamer: give to real, verified needs", description: DESCRIPTION },
  appleWebApp: { title: "Dreamer", capable: true, statusBarStyle: "black-translucent" },
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
