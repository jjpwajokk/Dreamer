import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/logo";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[.06] bg-night/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Dreamer home">
          <Wordmark tone="light" />
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-medium text-white/70 md:flex" aria-label="Main">
          <Link className="rounded-lg px-3 py-2 hover:text-white" href="/discover">Discover</Link>
          <Link className="rounded-lg px-3 py-2 hover:text-white" href="/#how">How it works</Link>
          <Link className="rounded-lg px-3 py-2 hover:text-white" href="/#sectors">Sectors</Link>
          <Link className="rounded-lg px-3 py-2 hover:text-white" href="/#trust">Trust</Link>
          <Link className="rounded-lg px-3 py-2 hover:text-white" href="/about">About</Link>
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/me" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-semibold text-night hover:bg-white/90">
              Open app <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden h-9 items-center rounded-lg px-3 text-sm font-semibold text-white/80 hover:text-white sm:inline-flex">
                Sign in
              </Link>
              <Link href="/discover" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-semibold text-night hover:bg-white/90">
                Start giving <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const cols = [
    { title: "Give", links: [["Discover needs", "/discover"], ["How giving works", "/#how"], ["Fees", "/#fees"]] },
    { title: "Get help", links: [["Post a need", "/me/needs/new"], ["What we verify", "/#trust"], ["Sectors", "/#sectors"]] },
    { title: "Dreamer", links: [["About", "/about"], ["Privacy", "/privacy"], ["Terms", "/terms"]] },
  ] as const;
  return (
    <footer className="bg-night text-white/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Wordmark tone="light" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Giving is about empathy, and there is no empathy without connection. Verified needs, paid straight to the institution, with the update that shows what changed.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">{c.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/[.06]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Dreamer. Made in Nigeria, for Africa.</p>
          <p>Payments by Paystack · Built on bank-grade security</p>
        </div>
      </div>
    </footer>
  );
}
