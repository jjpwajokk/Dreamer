"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Banknote,
  BookOpenCheck,
  Bookmark,
  Building2,
  Compass,
  Fingerprint,
  Images,
  Flag,
  HeartHandshake,
  Home,
  LayoutDashboard,
  ListChecks,
  LogIn,
  LogOut,
  Megaphone,
  Menu,
  PlusCircle,
  ReceiptText,
  FlaskConical,
  ScrollText,
  Settings,
  Sparkles,
  Timer,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Wordmark } from "@/components/logo";
import { cn } from "@/lib/format";

export type NavUser = { signedIn: boolean; isAdmin: boolean; name: string | null; email: string | null; testMode: boolean };

type Item = { href: string; label: string; Icon: LucideIcon; match?: (p: string) => boolean; badge?: string };
type Group = { title: string; items: Item[] };

function groups(user: NavUser): Group[] {
  const out: Group[] = [
    {
      title: "Give",
      items: [
        { href: "/discover", label: "Discover needs", Icon: Compass, match: (p) => p.startsWith("/discover") || p.startsWith("/n/") },
        { href: "/organisations", label: "Organisations", Icon: Building2, match: (p) => p.startsWith("/organisations") || p.startsWith("/o/") },
        ...(user.signedIn
          ? [
              { href: "/me", label: "My impact", Icon: HeartHandshake, match: (p: string) => p === "/me" || p.startsWith("/impact") },
              { href: "/me/saved", label: "Saved", Icon: Bookmark },
            ]
          : []),
      ],
    },
    {
      title: "Get support",
      items: [
        { href: "/me/needs/new", label: "Share a need", Icon: PlusCircle, match: (p) => p === "/me/needs/new" },
        ...(user.signedIn
          ? [
              { href: "/me/needs", label: "My needs", Icon: ListChecks, match: (p: string) => p.startsWith("/me/needs") && p !== "/me/needs/new" },
              { href: "/me/organisation", label: "My organisation", Icon: Building2 },
            ]
          : []),
      ],
    },
    ...(user.signedIn
      ? [
          {
            title: "You",
            items: [
              { href: "/me/account", label: "Profile & socials", Icon: UserRound },
              { href: "/me/verify", label: "Get verified", Icon: Fingerprint },
              { href: "/me/requests", label: "Requests to connect", Icon: Users },
            ],
          },
        ]
      : []),
  ];
  if (user.isAdmin) {
    out.push({
      title: "Admin",
      items: [
        { href: "/admin", label: "Overview", Icon: LayoutDashboard, match: (p) => p === "/admin" },
        { href: "/admin/needs?status=submitted", label: "Needs", Icon: BadgeCheck, match: (p) => p.startsWith("/admin/needs") },
        { href: "/admin/people", label: "People", Icon: Fingerprint },
        { href: "/admin/organisations", label: "Organisations", Icon: Building2 },
        { href: "/admin/photos", label: "Photos", Icon: Images },
        { href: "/admin/payouts", label: "Payouts", Icon: Banknote },
        { href: "/admin/updates", label: "Updates", Icon: Megaphone },
        { href: "/admin/expired", label: "Expired needs", Icon: Timer },
        { href: "/admin/reports", label: "Reports", Icon: Flag },
        { href: "/admin/ledger", label: "Ledger", Icon: ReceiptText },
        { href: "/admin/samples", label: "Sample data", Icon: FlaskConical },
        { href: "/admin/audit", label: "Audit log", Icon: ScrollText },
      ],
    });
  }
  out.push({
    title: "Dreamer",
    items: [
      ...(user.signedIn ? [{ href: "/welcome", label: "Getting started", Icon: Sparkles }] : []),
      { href: "/about", label: "How it works", Icon: BookOpenCheck },
      { href: "/", label: "Home", Icon: Home, match: (p: string) => p === "/" },
    ],
  });
  return out;
}

function isActive(item: Item, path: string) {
  if (item.match) return item.match(path);
  const base = item.href.split("?")[0]!;
  return path === base || path.startsWith(`${base}/`);
}

function NavLinks({ user, onNavigate }: { user: NavUser; onNavigate?: () => void }) {
  const path = usePathname() ?? "/";
  return (
    <nav aria-label="Main" className="space-y-6">
      {groups(user).map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">{g.title}</p>
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active = isActive(item, path);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium transition",
                      active ? "bg-white/[.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]" : "text-white/65 hover:bg-white/[.05] hover:text-white",
                    )}
                  >
                    <item.Icon className={cn("h-[18px] w-[18px]", active ? "text-mint" : "text-white/45 group-hover:text-white/80")} aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function AccountBlock({ user }: { user: NavUser }) {
  if (!user.signedIn) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
        <p className="text-sm font-semibold text-white">Join Dreamer</p>
        <p className="mt-1 text-xs leading-relaxed text-white/55">One account to give, share a need, and follow every story.</p>
        <Link href="/login" className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg bg-white text-sm font-semibold text-night hover:bg-white/90">
          <LogIn className="h-4 w-4" aria-hidden /> Sign in
        </Link>
      </div>
    );
  }
  const label = user.name || user.email || "Account";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.04] p-2">
      <Link href="/me/account" className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/[.05]">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-mint to-brand text-sm font-bold text-night">
          {label.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">{label}</span>
          <span className="block truncate text-xs text-white/50">{user.isAdmin ? "Administrator" : "Member"}</span>
        </span>
        <Settings className="ml-auto h-4 w-4 text-white/40" aria-hidden />
      </Link>
      <form action="/auth/signout" method="post">
        <button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-[13px] text-white/55 hover:bg-white/[.05] hover:text-white">
          <LogOut className="h-4 w-4" aria-hidden /> Sign out
        </button>
      </form>
    </div>
  );
}

export function Sidebar({ user }: { user: NavUser }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col bg-night lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/" aria-label="Dreamer home">
          <Wordmark tone="light" />
        </Link>
      </div>
      <div className="scrollbar-none flex-1 overflow-y-auto px-3 pb-4 pt-2">
        <NavLinks user={user} />
      </div>
      <div className="space-y-3 p-3">
        {user.isAdmin && user.testMode ? (
          <p className="rounded-lg bg-sun/15 px-3 py-1.5 text-center text-[11px] font-semibold text-sun">Payments in test mode</p>
        ) : null}
        <AccountBlock user={user} />
      </div>
    </aside>
  );
}

export function MobileBar({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line/80 bg-surface/85 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/" aria-label="Dreamer home">
          <Wordmark />
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface"
          aria-label="Open menu"
          aria-expanded={open}
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-night/60 backdrop-blur-sm" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="animate-rise absolute inset-y-0 left-0 flex w-[86%] max-w-[320px] flex-col bg-night">
            <div className="flex h-14 items-center justify-between px-4">
              <Wordmark tone="light" />
              <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl text-white/70 hover:bg-white/10" aria-label="Close menu">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2">
              <NavLinks user={user} onNavigate={() => setOpen(false)} />
            </div>
            <div className="safe-bottom p-3">
              <AccountBlock user={user} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function BottomTabs({ user }: { user: NavUser }) {
  const path = usePathname() ?? "/";
  const items: Item[] = [
    { href: "/discover", label: "Discover", Icon: Compass, match: (p) => p.startsWith("/discover") || p.startsWith("/n/") },
    { href: "/me/needs/new", label: "Post", Icon: PlusCircle, match: (p) => p === "/me/needs/new" },
    { href: "/me", label: "Impact", Icon: HeartHandshake, match: (p) => p === "/me" },
    user.isAdmin
      ? { href: "/admin", label: "Admin", Icon: LayoutDashboard, match: (p) => p.startsWith("/admin") }
      : user.signedIn
        ? { href: "/me/needs", label: "My needs", Icon: ListChecks, match: (p) => p.startsWith("/me/needs") && p !== "/me/needs/new" }
        : { href: "/login", label: "Sign in", Icon: LogIn },
  ];
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 backdrop-blur-xl lg:hidden" aria-label="Quick">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map((item) => {
          const active = isActive(item, path);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex flex-col items-center gap-0.5 pt-2 text-[11px] font-medium", active ? "text-brand" : "text-muted hover:text-ink")}
              >
                <item.Icon className="h-5 w-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
