import { SiteFooter, SiteHeader } from "@/components/site-nav";
import { getSession } from "@/lib/auth";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession().catch(() => null);
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader signedIn={Boolean(session)} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
