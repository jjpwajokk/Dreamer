import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { siteUrl, TAGLINE } from "@/lib/config";

const DESCRIPTION = "Verified needs, held in escrow, paid directly to the payee. Back real dreams across Nigeria: school fees, health, rent, small businesses and more.";

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#060c0b" },
  ],
  colorScheme: "light dark",
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
