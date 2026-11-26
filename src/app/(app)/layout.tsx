import { BottomTabs, MobileBar, Sidebar, type NavUser } from "@/components/app-nav";
import { getSession } from "@/lib/auth";
import { paystackIsLive } from "@/lib/config";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession().catch(() => null);
  const user: NavUser = {
    signedIn: Boolean(session),
    isAdmin: session?.profile?.role === "admin",
    name: session?.profile?.display_name ?? null,
    email: session?.email ?? null,
    testMode: !paystackIsLive(),
  };
  return (
    <div className="min-h-dvh">
      <Sidebar user={user} />
      <div className="lg:pl-[264px]">
        <MobileBar user={user} />
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</main>
      </div>
      <BottomTabs user={user} />
    </div>
  );
}
