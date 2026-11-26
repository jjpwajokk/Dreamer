"use client";

import { useActionState, useState } from "react";
import { Flag } from "lucide-react";
import { reportNeed, type ReportState } from "@/app/(app)/n/[slug]/actions";
import { Button, Field, Input, Notice, Textarea } from "@/components/ui";

export function ReportButton({ needId }: { needId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ReportState, FormData>(reportNeed, undefined);
  if (state?.ok) return <Notice>Thank you. Our team will look into this within 24 hours.</Notice>;
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm text-muted underline-offset-2 hover:text-ink hover:underline">
        <Flag className="h-4 w-4" aria-hidden /> Report a concern about this need
      </button>
    );
  }
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <input type="hidden" name="needId" value={needId} />
      <Field label="What's wrong?" htmlFor="reason">
        <Textarea id="reason" name="reason" required minLength={5} maxLength={1000} placeholder="Tell us what you know. Reports are private." />
      </Field>
      <Field label="Your email (optional)" htmlFor="report-email" hint="So we can follow up with you.">
        <Input id="report-email" name="email" type="email" />
      </Field>
      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      <div className="flex gap-2">
        <Button type="submit" variant="danger" size="sm" disabled={pending}>{pending ? "Sending…" : "Send report"}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
