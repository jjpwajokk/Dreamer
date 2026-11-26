"use client";

import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { Button, Notice, Textarea } from "@/components/ui";
import { requestPhotos } from "@/app/(app)/me/photos/actions";

/** "Shared on request" note with a polite way to ask. */
export function AskAccess({
  target,
  status,
  name,
  what = "Social links",
}: {
  target: { needId?: string; orgId?: string; profileUserId?: string };
  status: "none" | "pending" | "approved" | "declined";
  name: string;
  what?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="text-[13px]">
      <p className="inline-flex items-center gap-1.5 text-muted"><Lock className="h-3.5 w-3.5" aria-hidden /> {what} are shared on request.</p>
      {status === "pending" || sent === "ok" ? (
        <p className="mt-1 text-muted">Request sent. {name} will decide.</p>
      ) : status === "declined" ? (
        <p className="mt-1 text-muted">{name} prefers to keep these private. Thanks for respecting that.</p>
      ) : asking ? (
        <div className="mt-2 space-y-2">
          <Textarea rows={2} maxLength={280} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Optional: a short, kind note" />
          <div className="flex gap-2">
            <Button size="sm" disabled={pending} onClick={() => start(async () => { const r = await requestPhotos(target, message); setSent(r.error ?? "ok"); })}>
              {pending ? "Sending…" : "Send request"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAsking(true)} className="mt-1 block font-semibold text-brand hover:underline">Ask to connect</button>
      )}
      {sent && sent !== "ok" ? <div className="mt-2"><Notice tone="danger">{sent}</Notice></div> : null}
    </div>
  );
}
