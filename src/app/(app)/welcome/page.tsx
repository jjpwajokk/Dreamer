import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bookmark,
  Compass,
  HeartHandshake,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  PlusCircle,
  ReceiptText,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Getting started" };

type Tile = { href: string; title: string; text: string; Icon: LucideIcon };

function TileGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map(({ href, title, text, Icon }) => (
        <Link
          key={href}
          href={href}
          className="group flex flex-col rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-[0_12px_30px_-12px_rgba(11,20,24,.18)]"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="h-5 w-5" aria-hidden /></span>
          <span className="mt-4 font-semibold">{title}</span>
          <span className="mt-1 text-sm text-muted">{text}</span>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
            Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
          </span>
        </Link>
      ))}
    </div>
  );
}

export default async function WelcomePage() {
  const session = await getSession();
  const name = session?.profile?.display_name;
  const isAdmin = session?.profile?.role === "admin";

  const giver: Tile[] = [
    { href: "/discover", title: "Discover needs", text: "Meet verified people one at a time, or browse everyone by sector and state.", Icon: Compass },
    { href: "/me/saved", title: "Saved", text: "People you swiped up on to come back to later.", Icon: Bookmark },
    { href: "/me", title: "My impact", text: "Every gift you have made, where the money went, and the updates you received.", Icon: HeartHandshake },
  ];
  const asker: Tile[] = [
    { href: "/me/needs/new", title: "Post a need", text: "For yourself or someone you know. Takes about 10 minutes. Have the invoice ready.", Icon: PlusCircle },
    { href: "/me/needs", title: "My needs", text: "Track verification, see what was raised, and post your thank-you update.", Icon: ListChecks },
    { href: "/me/account", title: "Account", text: "Your name, email and notification settings.", Icon: Settings },
  ];
  const admin: Tile[] = [
    { href: "/admin", title: "Admin overview", text: "Queues, money in, payouts due and fee revenue at a glance.", Icon: LayoutDashboard },
    { href: "/admin/needs?status=submitted", title: "Verification", text: "Check documents, call the payee, then publish or ask for more information.", Icon: BadgeCheck },
    { href: "/admin/payouts", title: "Payouts", text: "Pay funded needs straight to the verified school, hospital or supplier.", Icon: Banknote },
    { href: "/admin/updates", title: "Updates", text: "Approve thank-you updates before givers see them.", Icon: Megaphone },
    { href: "/admin/ledger", title: "Ledger", text: "Every naira in and out, including platform fees.", Icon: ReceiptText },
  ];

  const steps = [
    { n: "1", title: "Find someone", text: "Each person has been verified by our team. Swipe right to give, left to pass, up to save." },
    { n: "2", title: "Choose how much", text: "From ₦1,000. Choose to add the 5% platform fee or take it from your gift. You see exactly what they receive." },
    { n: "3", title: "Pay securely", text: "Card, bank transfer or USSD through Paystack. Money goes to the institution, never a personal account." },
    { n: "4", title: "See the change", text: "When the need is met we pay the bill and the person posts an update. You get it by email and in My impact." },
  ];

  return (
    <div className="space-y-10">
      <section className="aurora relative overflow-hidden rounded-3xl px-6 py-10 text-white sm:px-10 sm:py-12">
        <div className="grid-lines absolute inset-0" aria-hidden />
        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">Getting started</p>
          <h1 className="mt-2 font-display text-[34px] leading-tight sm:text-[44px]">
            {name ? `Welcome, ${name}.` : "Welcome to Dreamer."}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/70 sm:text-base">
            Dreamer connects people with real, verified needs to people who want to help. Here is what you can do and where everything lives.
            The menu on the left (or the menu button on your phone) takes you anywhere.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/discover" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-night hover:bg-white/90">
              <Compass className="h-4 w-4" aria-hidden /> Start giving
            </Link>
            <Link href="/me/needs/new" className="glass inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white hover:bg-white/10">
              <PlusCircle className="h-4 w-4" aria-hidden /> Ask for help
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl">How giving works</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n}>
              <Card className="h-full p-5">
                <span className="tabular grid h-8 w-8 place-items-center rounded-full bg-ink text-sm font-semibold text-white">{s.n}</span>
                <p className="mt-3 font-semibold">{s.title}</p>
                <p className="mt-1 text-sm text-muted">{s.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="font-display text-xl">If you want to give</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Find these under <strong className="text-ink">Give</strong> in the menu.</p>
        <TileGrid tiles={giver} />
      </section>

      <section>
        <h2 className="font-display text-xl">If you need help</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Find these under <strong className="text-ink">Ask for help</strong> in the menu. You&apos;ll need the invoice or quote, and the payee&apos;s bank details from it.</p>
        <TileGrid tiles={asker} />
      </section>

      {isAdmin ? (
        <section>
          <h2 className="font-display text-xl">Your admin tools</h2>
          <p className="mb-4 mt-1 text-sm text-muted">Find these under <strong className="text-ink">Admin</strong> in the menu. Every action you take is recorded in the audit log.</p>
          <TileGrid tiles={admin} />
        </section>
      ) : null}
    </div>
  );
}
