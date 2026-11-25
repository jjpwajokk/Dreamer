import type { Metadata } from "next";
import Link from "next/link";
import { SwipeDeck } from "@/components/swipe-deck";
import { getFeed } from "@/lib/queries";
import { getSession } from "@/lib/auth";
import { healthcareEnabled } from "@/lib/config";
import { NIGERIAN_STATES, cn } from "@/lib/format";

export const metadata: Metadata = { title: "Discover" };

type Search = { category?: string; state?: string; close?: string };

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const session = await getSession();
  const needs = await getFeed({ category: sp.category, state: sp.state, close: sp.close === "1" }, { userId: session?.userId });

  const link = (patch: Partial<Search>) => {
    const merged = { ...sp, ...patch };
    const qs = new URLSearchParams(Object.entries(merged).filter(([, v]) => v) as [string, string][]).toString();
    return `/discover${qs ? `?${qs}` : ""}`;
  };
  const chip = (active: boolean) =>
    cn(
      "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition",
      active ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink hover:bg-bg",
    );

  return (
    <div className="mx-auto max-w-md px-4 pb-6 pt-4">
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link className={chip(!sp.category && sp.close !== "1")} href="/discover">Everyone</Link>
        <Link className={chip(sp.category === "education")} href={link({ category: sp.category === "education" ? undefined : "education" })}>Education</Link>
        {healthcareEnabled() ? (
          <Link className={chip(sp.category === "healthcare")} href={link({ category: sp.category === "healthcare" ? undefined : "healthcare" })}>Healthcare</Link>
        ) : null}
        <Link className={chip(sp.close === "1")} href={link({ close: sp.close === "1" ? undefined : "1" })}>Close to goal</Link>
        <details className="relative">
          <summary className={cn(chip(Boolean(sp.state)), "list-none cursor-pointer")}>{sp.state ?? "Any state"}</summary>
          <div className="absolute left-0 z-20 mt-2 grid max-h-72 w-56 grid-cols-2 gap-1 overflow-y-auto rounded-2xl border border-line bg-surface p-2 shadow-xl">
            <Link className="rounded-lg px-2 py-1 text-sm hover:bg-bg" href={link({ state: undefined })}>Any state</Link>
            {NIGERIAN_STATES.map((s) => (
              <Link key={s} className="rounded-lg px-2 py-1 text-sm hover:bg-bg" href={link({ state: s })}>{s}</Link>
            ))}
          </div>
        </details>
      </div>
      <SwipeDeck needs={needs} key={JSON.stringify(sp)} />
    </div>
  );
}
