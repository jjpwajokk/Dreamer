import Link from "next/link";
import { Compass, HeartHandshake, PlusCircle, Shield, UserRound } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui";

type NavProps = { signedIn: boolean; isAdmin: boolean };

export function SiteHeader({ signedIn, isAdmin }: NavProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Dreamer home">
          <Logo className="h-8 w-8" />
          <span className="font-display text-xl font-semibold tracking-tight">Dreamer</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-medium sm:flex">
          <Link className="rounded-full px-3 py-2 hover:bg-black/5" href="/discover">Discover</Link>
          <Link className="rounded-full px-3 py-2 hover:bg-black/5" href="/me/needs/new">Post a need</Link>
          <Link className="rounded-full px-3 py-2 hover:bg-black/5" href="/about">How it works</Link>
          {signedIn ? <Link className="rounded-full px-3 py-2 hover:bg-black/5" href="/me">My giving</Link> : null}
          {isAdmin ? <Link className="rounded-full px-3 py-2 text-brand hover:bg-brand-soft" href="/admin">Admin</Link> : null}
          {signedIn ? (
            <Link className="rounded-full px-3 py-2 hover:bg-black/5" href="/me/account">Account</Link>
          ) : (
            <Link className={buttonClass("primary", "sm", "ml-2")} href="/login">Sign in</Link>
          )}
        </nav>
        <div className="sm:hidden">
          {isAdmin ? (
            <Link href="/admin" className={buttonClass("secondary", "sm")}>
              <Shield className="h-4 w-4" aria-hidden /> Admin
            </Link>
          ) : !signedIn ? (
            <Link href="/login" className={buttonClass("primary", "sm")}>Sign in</Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function BottomNav({ signedIn }: NavProps) {
  const items = [
    { href: "/discover", label: "Discover", Icon: Compass },
    { href: "/me/needs/new", label: "Post a need", Icon: PlusCircle },
    { href: "/me", label: "My giving", Icon: HeartHandshake },
    { href: signedIn ? "/me/account" : "/login", label: signedIn ? "Account" : "Sign in", Icon: UserRound },
  ];
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur sm:hidden" aria-label="Main">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link href={href} className="flex flex-col items-center gap-0.5 pt-2 text-[11px] font-medium text-muted hover:text-ink">
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 max-w-5xl px-4 pb-28 text-sm text-muted sm:pb-10">
      <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p>Dreamer. Giving is about empathy, and there is no empathy without connection.</p>
        <div className="flex gap-4">
          <Link href="/about" className="hover:text-ink">How it works</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
