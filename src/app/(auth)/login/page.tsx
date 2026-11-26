import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, HeartHandshake, Landmark, PlusCircle } from "lucide-react";
import { Notice } from "@/components/ui";
import { Wordmark } from "@/components/logo";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; mode?: string }> }) {
  const { next: rawNext, error, mode } = await searchParams;
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/welcome";
  if (await getSession()) redirect(next);

  const points = [
    { Icon: HeartHandshake, title: "Give to verified people", text: "Meet real Nigerians with checked needs and give any amount from ₦1,000." },
    { Icon: PlusCircle, title: "Share what you're working towards", text: "School, health, a home or a business: for yourself or someone you know. We verify it, then cheer it on." },
    { Icon: Landmark, title: "Held in escrow, paid directly", text: "Gifts wait securely until final checks pass, then go straight to the school, hospital, landlord or supplier." },
    { Icon: BadgeCheck, title: "Celebrate the progress", text: "Follow the people you back, with photos, receipts and milestones along the way." },
  ];

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="aurora relative hidden overflow-hidden lg:block">
        <div className="grid-lines absolute inset-0" aria-hidden />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link href="/" aria-label="Dreamer home"><Wordmark tone="light" /></Link>
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">Welcome to Dreamer</p>
            <h2 className="mt-3 font-display text-[42px] leading-[1.05]">
              Giving that you can <span className="text-gradient">see</span>.
            </h2>
            <ul className="mt-10 space-y-6">
              {points.map(({ Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <span className="glass grid h-10 w-10 shrink-0 place-items-center rounded-xl"><Icon className="h-5 w-5 text-mint" aria-hidden /></span>
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-white/65">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/45">Verified needs · Held in escrow · Paid directly to the payee</p>
        </div>
      </aside>

      <div className="flex flex-col bg-surface">
        <div className="flex h-16 items-center justify-between px-6 lg:justify-end">
          <Link href="/" className="lg:hidden" aria-label="Dreamer home"><Wordmark /></Link>
          <Link href="/discover" className="text-sm font-medium text-muted hover:text-ink">Browse needs first →</Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-[400px]">
            <h1 className="font-display text-[32px] leading-tight">Welcome back</h1>
            <p className="mt-2 text-[15px] text-muted">One free account to give, share a need, and follow every story you're part of.</p>
            {error ? (
              <div className="mt-5">
                <Notice tone="danger">That sign-in link didn&apos;t work or has expired. Please request a new one.</Notice>
              </div>
            ) : null}
            <div className="mt-8">
              <LoginForm next={next} initialMode={mode === "signup" ? "signup" : "signin"} />
            </div>
            <p className="mt-8 text-center text-xs text-muted">
              Need help? Read <Link href="/about" className="underline">how Dreamer works</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
