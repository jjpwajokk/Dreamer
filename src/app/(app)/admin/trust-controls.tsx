"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Notice, Select, Textarea } from "@/components/ui";
import type { AdminResult } from "./actions";
import { publishInEscrow, setPayoutTarget } from "./actions";
import { banUser, moderatePhoto, rescanPhoto, resolveOrgAccount, reviewKyc, reviewOrganisation } from "./trust-actions";

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<AdminResult | null>(null);
  const run = (fn: () => Promise<AdminResult>) =>
    start(async () => {
      const r = await fn();
      setResult(r);
      if (r.ok) router.refresh();
    });
  const feedback = result && (result.error || result.message) ? <Notice tone={result.error ? "danger" : "brand"}>{result.error ?? result.message}</Notice> : null;
  return { pending, run, feedback };
}

export function KycReview({ userId }: { userId: string }) {
  const [note, setNote] = useState("");
  const { pending, run, feedback } = useAction();
  return (
    <div className="space-y-2">
      <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (required to send back), e.g. The ID photo is blurry. Please retake it in good light." />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => reviewKyc(userId, "verified", note))}>Verify</Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => reviewKyc(userId, "rejected", note))}>Send back</Button>
      </div>
      {feedback}
    </div>
  );
}

export function BanControl({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const { pending, run, feedback } = useAction();
  if (!open) return <button type="button" className="text-sm font-semibold text-danger hover:underline" onClick={() => setOpen(true)}>Close account for fraud…</button>;
  return (
    <div className="space-y-2 rounded-xl border border-danger/30 bg-danger/5 p-3">
      <p className="text-sm font-semibold text-danger">Permanent. {name} can never sign up again with the same email, phone, ID or bank account. Their open needs close and gifts are marked for refund.</p>
      <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason and evidence (kept in the audit log)" />
      <input className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder='Type "BAN" to confirm' />
      <div className="flex gap-2">
        <Button size="sm" variant="danger" disabled={pending || confirm !== "BAN"} onClick={() => run(() => banUser(userId, reason))}>Close account permanently</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      {feedback}
    </div>
  );
}

export function OrgReview({ orgId, status }: { orgId: string; status: string }) {
  const [note, setNote] = useState("");
  const { pending, run, feedback } = useAction();
  return (
    <div className="space-y-2">
      <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the organisation (required unless verifying)" />
      <div className="flex flex-wrap gap-2">
        {status !== "verified" ? <Button size="sm" disabled={pending} onClick={() => run(() => reviewOrganisation(orgId, "verified", note))}>Verify</Button> : null}
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => reviewOrganisation(orgId, "needs_info", note))}>Ask for more</Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => reviewOrganisation(orgId, "rejected", note))}>Decline</Button>
        {status === "verified" ? <Button size="sm" variant="danger" disabled={pending} onClick={() => run(() => reviewOrganisation(orgId, "suspended", note))}>Suspend</Button> : null}
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => resolveOrgAccount(orgId))}>Check account with bank</Button>
      </div>
      {feedback}
    </div>
  );
}

export function PhotoModeration({ mediaId, sensitive }: { mediaId: string; sensitive: boolean }) {
  const [blur, setBlur] = useState(sensitive);
  const { pending, run, feedback } = useAction();
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={blur} onChange={(e) => setBlur(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" /> Sensitive (blur until tapped)
      </label>
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" disabled={pending} onClick={() => run(() => moderatePhoto(mediaId, "approved", blur))}>Approve</Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => moderatePhoto(mediaId, "rejected", blur))}>Remove</Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => rescanPhoto(mediaId))}>AI scan</Button>
      </div>
      {feedback}
    </div>
  );
}

export function EscrowPublish({ needId }: { needId: string }) {
  const { pending, run, feedback } = useAction();
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">Put it live now and verify later. Gifts are held in the Paystack balance; payouts stay locked until you verify. If it isn&apos;t verified within 30 days, every giver is refunded automatically.</p>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => publishInEscrow(needId))}>Publish now, verify later</Button>
      {feedback}
    </div>
  );
}

export function PayoutTarget({ needId, current, hasPersonal, isOrg }: { needId: string; current: "institution" | "personal"; hasPersonal: boolean; isOrg: boolean }) {
  const [target, setTarget] = useState(current);
  const [reason, setReason] = useState("");
  const { pending, run, feedback } = useAction();
  if (isOrg) return <p className="text-sm text-muted">Organisation need: paid only to the organisation&apos;s official account.</p>;
  return (
    <div className="space-y-2">
      <Select value={target} onChange={(e) => setTarget(e.target.value as "institution" | "personal")}>
        <option value="institution">Pay the institution (default)</option>
        <option value="personal" disabled={!hasPersonal}>Pay the person&apos;s own verified account{hasPersonal ? "" : " (none added)"}</option>
      </Select>
      {target === "personal" ? <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why the personal account? (kept in the audit log)" /> : null}
      <Button size="sm" variant="secondary" disabled={pending || target === current} onClick={() => run(() => setPayoutTarget(needId, target, reason))}>Save payee choice</Button>
      {feedback}
    </div>
  );
}
