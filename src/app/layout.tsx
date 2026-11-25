import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav, SiteFooter, SiteHeader } from "@/components/site-nav";
import { getSession } from "@/lib/auth";
import { paystackIsLive, siteUrl, supabaseConfigured, TAGLINE } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Dreamer: give to a real, verified need", template: "%s · Dreamer" },
  description: TAGLINE,
  openGraph: { siteName: "Dreamer", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#0e5e4e",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession().catch(() => null);
  const signedIn = Boolean(session);
  const isAdmin = session?.profile?.role === "admin";
  return (
    <html lang="en-NG">
      <body className="min-h-dvh">
        {!supabaseConfigured() ? (
          <div className="bg-sun-soft px-4 py-2 text-center text-sm text-[#6e470b]">
            Setup needed: add your Supabase keys (see README) to bring Dreamer to life.
          </div>
        ) : !paystackIsLive() ? (
          <div className="bg-ink px-4 py-1.5 text-center text-xs font-medium text-white/90">
            Test mode: payments use Paystack test keys. No real money moves.
          </div>
        ) : null}
        <SiteHeader signedIn={signedIn} isAdmin={isAdmin} />
        <main>{children}</main>
        <SiteFooter />
        <BottomNav signedIn={signedIn} isAdmin={isAdmin} />
      </body>
    </html>
  );
}
