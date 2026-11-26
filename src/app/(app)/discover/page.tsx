import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGrid, Layers } from "lucide-react";
import { SwipeDeck } from "@/components/swipe-deck";
import { NeedCard } from "@/components/need-bits";
import { EmptyState, LinkButton, PageTitle } from "@/components/ui";
import { getFeed } from "@/lib/queries";
import { getSession } from "@/lib/auth";
import { NIGERIAN_STATES, cn } from "@/lib/format";
import { CATEGORIES, SECTORS } from "@/lib/sectors";

export const metadata: Metadata = { title: "Discover needs" };

type Search = { category?: string; state?: string; close?: string; view?: string };

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const session = await getSession();
  const needs = await getFeed({ category: sp.category, state: sp.state, close: sp.close === "1" }, { userId: session?.userId });
  const grid = sp.view === "grid";

  const link = (patch: Partial<Search>) => {
    const merged = { ...sp, ...patch };
    const qs = new URLSearchParams(Object.entries(merged).filter(([, v]) => v) as [string, string][]).toString();
    return `/discover${qs ? `?${qs}` : ""}`;
  };
  const chip = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
      active ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:border-ink/25",
    );
  const viewBtn = (active: boolean) =>
    cn("inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition", active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink");

  return (
    <div>
      <PageTitle
        eyebrow="Give"
        title="Discover needs"
        subtitle="Every person here has been checked by our team. Your gift is paid straight to their school, hospital, landlord or supplier."
        action={
          <div className="inline-flex rounded-xl bg-black/[.05] p-1" role="group" aria-label="View">
            <Link href={link({ view: undefined })} className={viewBtn(!grid)} aria-pressed={!grid}><Layers className="h-4 w-4" aria-hidden /> One at a time</Link>
            <Link href={link({ view: "grid" })} className={viewBtn(grid)} aria-pressed={grid}><LayoutGrid className="h-4 w-4" aria-hidden /> Browse all</Link>
          </div>
        }
      />

      <div className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Link className={chip(!sp.category && sp.close !== "1" && !sp.state)} href={link({ category: undefined, close: undefined, state: undefined })}>Everyone</Link>
        {CATEGORIES.map((c) => (
          <Link key={c} className={chip(sp.category === c)} href={link({ category: sp.category === c ? undefined : c })}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: sp.category === c ? "#fff" : SECTORS[c].accent }} aria-hidden />
            {SECTORS[c].label}
          </Link>
        ))}
        <Link className={chip(sp.close === "1")} href={link({ close: sp.close === "1" ? undefined : "1" })}>Close to goal</Link>
        <details className="relative">
          <summary className={cn(chip(Boolean(sp.state)), "cursor-pointer list-none")}>{sp.state ?? "Any state"}</summary>
          <div className="absolute right-0 z-20 mt-2 grid max-h-72 w-60 grid-cols-2 gap-1 overflow-y-auto rounded-2xl border border-line bg-surface p-2 shadow-xl sm:left-0 sm:right-auto">
            <Link className="rounded-lg px-2 py-1 text-sm hover:bg-bg" href={link({ state: undefined })}>Any state</Link>
            {NIGERIAN_STATES.map((s) => (
              <Link key={s} className="rounded-lg px-2 py-1 text-sm hover:bg-bg" href={link({ state: s })}>{s}</Link>
            ))}
          </div>
        </details>
      </div>

      {grid ? (
        needs.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {needs.map((n) => <NeedCard key={n.id} need={n} />)}
          </div>
        ) : (
          <EmptyState title="No one matches these filters yet" action={<LinkButton href="/discover?view=grid" variant="secondary">Clear filters</LinkButton>}>
            New needs are verified every day. Try another sector or state.
          </EmptyState>
        )
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
          <div className="mx-auto w-full max-w-md">
            <SwipeDeck needs={needs} key={JSON.stringify(sp)} />
          </div>
          <aside className="hidden space-y-3 lg:block">
            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="text-sm font-semibold">How to use this</p>
              <ul className="mt-3 space-y-2.5 text-sm text-muted">
                <li><kbd className="rounded border border-line bg-bg px-1.5 text-xs">→</kbd> or swipe right to give</li>
                <li><kbd className="rounded border border-line bg-bg px-1.5 text-xs">←</kbd> or swipe left to pass, with no judgement</li>
                <li><kbd className="rounded border border-line bg-bg px-1.5 text-xs">↑</kbd> or swipe up to save for later</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
              <p className="font-semibold text-ink">Prefer to scan?</p>
              <p className="mt-1">Switch to <Link className="font-medium text-brand hover:underline" href={link({ view: "grid" })}>Browse all</Link> to see everyone at once.</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
