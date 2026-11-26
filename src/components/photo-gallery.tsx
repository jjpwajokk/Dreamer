"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, ImageIcon, Lock, X } from "lucide-react";
import { cn } from "@/lib/format";
import { Button, Notice, Textarea } from "@/components/ui";
import { requestPhotos } from "@/app/(app)/me/photos/actions";
import type { Gallery } from "@/lib/media";

export function PhotoGallery({
  gallery,
  signedIn,
  target,
  name,
  next,
}: {
  gallery: Gallery;
  signedIn: boolean;
  target: { needId?: string; orgId?: string };
  name: string;
  next: string;
}) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!signedIn) {
    if (!gallery.total) return null;
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><ImageIcon className="h-5 w-5" aria-hidden /></span>
        <p className="flex-1 text-sm text-muted">
          {name} shared {gallery.total} photo{gallery.total === 1 ? "" : "s"}. To respect everyone&apos;s privacy, photos are for members.
        </p>
        <Link href={`/login?next=${encodeURIComponent(next)}&mode=signup`} className="text-sm font-semibold text-brand hover:underline">Join free</Link>
      </div>
    );
  }
  if (!gallery.photos.length && !gallery.lockedCount) return null;
  const current = gallery.photos.find((p) => p.id === open);

  return (
    <div className="space-y-3">
      {gallery.photos.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {gallery.photos.map((p) => {
            const blurred = p.sensitive && !revealed.has(p.id);
            return (
              <div key={p.id} className="relative aspect-square overflow-hidden rounded-2xl bg-bg">
                {p.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt={p.caption ?? `Photo from ${name}`} className={cn("h-full w-full object-cover transition", blurred && "scale-110 blur-xl")} />
                ) : null}
                {blurred ? (
                  <button type="button" onClick={() => setRevealed((s) => new Set(s).add(p.id))} className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/25 text-sm font-semibold text-white">
                    <Eye className="h-5 w-5" aria-hidden /> Sensitive photo. Tap to view
                  </button>
                ) : (
                  <button type="button" onClick={() => setOpen(p.id)} className="absolute inset-0" aria-label={`Open photo${p.caption ? `: ${p.caption}` : ""}`} />
                )}
                {gallery.isOwner && p.moderation !== "approved" ? (
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-night">{p.moderation === "pending" ? "In review" : "Not approved"}</span>
                ) : null}
                {gallery.isOwner && p.visibility === "on_request" ? (
                  <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-night" title="Shown on request"><Lock className="h-3.5 w-3.5" aria-hidden /></span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {gallery.lockedCount > 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
          <p className="flex items-center gap-2 font-medium"><Lock className="h-4 w-4 text-brand" aria-hidden /> {gallery.lockedCount} more photo{gallery.lockedCount === 1 ? "" : "s"} shared on request</p>
          {gallery.requestStatus === "pending" || sent ? (
            <p className="mt-1 text-muted">Request sent. {name} will decide, and you&apos;ll see the photos here if they say yes.</p>
          ) : gallery.requestStatus === "declined" ? (
            <p className="mt-1 text-muted">{name} prefers to keep these private. Thank you for respecting that.</p>
          ) : asking ? (
            <div className="mt-3 space-y-2">
              <Textarea rows={2} maxLength={280} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Optional: a short, kind note" />
              <div className="flex gap-2">
                <Button size="sm" disabled={pending} onClick={() => start(async () => { const r = await requestPhotos(target, message); setSent(r.error ?? "ok"); })}>
                  {pending ? "Sending…" : "Send request"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setAsking(true)} className="mt-1 font-semibold text-brand hover:underline">Ask to see them</button>
          )}
          {sent && sent !== "ok" ? <div className="mt-2"><Notice tone="danger">{sent}</Notice></div> : null}
        </div>
      ) : null}

      {current?.url ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <button type="button" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white" aria-label="Close"><X className="h-5 w-5" aria-hidden /></button>
          <figure className="max-h-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.url} alt={current.caption ?? ""} className="max-h-[80vh] rounded-xl object-contain" />
            {current.caption ? <figcaption className="mt-2 text-center text-sm text-white/80">{current.caption}</figcaption> : null}
          </figure>
        </div>
      ) : null}
    </div>
  );
}
