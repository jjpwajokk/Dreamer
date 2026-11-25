"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { Bookmark, BookOpen, Heart, MapPin, X } from "lucide-react";
import type { PublicNeed } from "@/lib/types";
import { CATEGORY_LABEL, daysLeft } from "@/lib/format";
import { formatNaira, progressPercent } from "@/lib/money";
import { NeedAvatar, VerifiedBadge } from "@/components/need-bits";
import { Progress, buttonClass } from "@/components/ui";
import { recordSwipe, toggleSave } from "@/app/discover/actions";

type Direction = "left" | "right" | "up";

export function SwipeDeck({ needs }: { needs: PublicNeed[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [toast, setToast] = useState<{ text: string; href?: string; cta?: string } | null>(null);
  const current = needs[index];
  const next = needs[index + 1];

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handle = useCallback(
    async (dir: Direction) => {
      if (!current) return;
      if (dir === "left") {
        void recordSwipe(current.id, "pass");
        setIndex((i) => i + 1);
      } else if (dir === "right") {
        void recordSwipe(current.id, "give");
        router.push(`/n/${current.slug}/give`);
      } else {
        setIndex((i) => i + 1);
        const res = await toggleSave(current.id);
        if (res.needsLogin) {
          setToast({ text: "Sign in to save people you want to come back to.", href: `/login?next=/discover`, cta: "Sign in" });
        } else if (res.saved) {
          setToast({ text: `Saved ${current.display_name}.`, href: "/me/saved", cta: "View saved" });
        }
      }
    },
    [current, router],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.closest("input, textarea, select")) return;
      if (e.key === "ArrowLeft") void handle("left");
      if (e.key === "ArrowRight") void handle("right");
      if (e.key === "ArrowUp") void handle("up");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handle]);

  if (!current) {
    return (
      <div className="flex h-[60dvh] flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-surface px-6 text-center">
        <p className="font-display text-2xl font-semibold">You&apos;ve met everyone for now</p>
        <p className="mt-2 max-w-xs text-sm text-muted">New verified needs are added every week. You can look again, or see the people you saved.</p>
        <div className="mt-5 flex gap-2">
          <button className={buttonClass("primary")} onClick={() => setIndex(0)}>Start again</button>
          <Link className={buttonClass("secondary")} href="/me/saved">Saved</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative h-[clamp(340px,calc(100dvh-23rem),600px)]">
        {next ? <CardFace need={next} key={`under-${next.id}`} under /> : null}
        <AnimatePresence initial={false}>
          <SwipeCard key={current.id} need={current} onSwipe={handle} onOpen={() => {
            void recordSwipe(current.id, "open");
            router.push(`/n/${current.slug}`);
          }} />
        </AnimatePresence>
      </div>

      <div className="mt-5 flex items-center justify-center gap-5" role="group" aria-label="Choose">
        <button
          onClick={() => handle("left")}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface shadow-sm transition hover:scale-105"
          aria-label={`Pass on ${current.display_name} for now`}
        >
          <X className="h-6 w-6 text-muted" aria-hidden />
        </button>
        <button
          onClick={() => handle("up")}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface shadow-sm transition hover:scale-105"
          aria-label={`Save ${current.display_name}`}
        >
          <Bookmark className="h-5 w-5 text-[#8a5a10]" aria-hidden />
        </button>
        <button
          onClick={() => handle("right")}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 transition hover:scale-105"
          aria-label={`Give to ${current.display_name}`}
        >
          <Heart className="h-7 w-7" aria-hidden fill="currentColor" />
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-muted">Swipe right to give · left to pass · up to save · tap to read the story</p>

      {toast ? (
        <div role="status" className="fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-xl sm:bottom-8">
          <span>{toast.text}</span>
          {toast.href ? <Link href={toast.href} className="font-semibold text-sun">{toast.cta}</Link> : null}
        </div>
      ) : null}
    </div>
  );
}

function SwipeCard({ need, onSwipe, onOpen }: { need: PublicNeed; onSwipe: (d: Direction) => void; onOpen: () => void }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-12, 12]);
  const giveOpacity = useTransform(x, [30, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -30], [1, 0]);
  const saveOpacity = useTransform(y, [-120, -30], [1, 0]);
  const [dragged, setDragged] = useState(false);

  async function onDragEnd(_: unknown, info: PanInfo) {
    const { offset, velocity } = info;
    if (offset.x > 110 || velocity.x > 600) {
      await animate(x, 600, { duration: 0.25 });
      onSwipe("right");
      x.set(0);
    } else if (offset.x < -110 || velocity.x < -600) {
      await animate(x, -600, { duration: 0.25 });
      onSwipe("left");
    } else if (offset.y < -110 || velocity.y < -600) {
      await animate(y, -700, { duration: 0.25 });
      onSwipe("up");
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
      animate(y, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
    setTimeout(() => setDragged(false), 0);
  }

  return (
    <motion.div
      className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
      style={{ x, y, rotate }}
      drag
      dragElastic={0.6}
      dragMomentum={false}
      onDragStart={() => setDragged(true)}
      onDragEnd={onDragEnd}
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      onClick={() => {
        if (!dragged) onOpen();
      }}
    >
      <CardFace need={need} />
      <motion.span style={{ opacity: giveOpacity }} className="pointer-events-none absolute left-5 top-6 rotate-[-10deg] rounded-xl border-4 border-brand px-3 py-1 text-2xl font-black tracking-wider text-brand">
        GIVE
      </motion.span>
      <motion.span style={{ opacity: passOpacity }} className="pointer-events-none absolute right-5 top-6 rotate-[10deg] rounded-xl border-4 border-muted px-3 py-1 text-2xl font-black tracking-wider text-muted">
        PASS
      </motion.span>
      <motion.span style={{ opacity: saveOpacity }} className="pointer-events-none absolute inset-x-0 bottom-28 mx-auto w-fit rounded-xl border-4 border-sun px-3 py-1 text-2xl font-black tracking-wider text-[#8a5a10]">
        SAVE
      </motion.span>
    </motion.div>
  );
}

function CardFace({ need, under = false }: { need: PublicNeed; under?: boolean }) {
  const pct = progressPercent(need.amount_kobo, need.raised_kobo);
  const left = daysLeft(need.expires_at);
  return (
    <article
      className={`absolute inset-0 flex select-none flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-xl shadow-black/5 ${under ? "scale-[0.96] opacity-70" : ""}`}
      aria-hidden={under}
    >
      <div className="relative flex flex-1 flex-col justify-between bg-gradient-to-b from-sun-soft via-[#fbf3e6] to-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <NeedAvatar name={need.display_name} photoPath={need.cover_photo_path} size={64} />
            <div>
              <h2 className="font-display text-2xl font-semibold leading-tight">{need.display_name}</h2>
              <p className="flex items-center gap-1 text-sm text-muted">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> {need.city ? `${need.city}, ` : ""}{need.state}
              </p>
            </div>
          </div>
          <VerifiedBadge verifiedAt={need.verified_at} compact />
        </div>

        <blockquote className="my-4">
          <p className="font-display text-[26px] font-medium leading-snug text-ink sm:text-3xl">&ldquo;{need.my_words}&rdquo;</p>
        </blockquote>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">{CATEGORY_LABEL[need.category]}</p>
          <p className="text-[15px] font-medium text-ink">{need.title}</p>
        </div>
      </div>

      <div className="space-y-3 border-t border-line p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-bold">{formatNaira(need.raised_kobo)} <span className="text-sm font-normal text-muted">of {formatNaira(need.amount_kobo)}</span></p>
          <p className="text-sm font-semibold text-brand">{pct}%</p>
        </div>
        <Progress percent={pct} />
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{formatNaira(need.remaining_kobo)} to go{need.giver_count ? ` · ${need.giver_count} giver${need.giver_count === 1 ? "" : "s"}` : ""}</span>
          <span className="flex items-center gap-1">
            {left !== null ? `${left} day${left === 1 ? "" : "s"} left · ` : ""}
            <BookOpen className="h-3.5 w-3.5" aria-hidden /> Tap for story
          </span>
        </div>
      </div>
    </article>
  );
}
