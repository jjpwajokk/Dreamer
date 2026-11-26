"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { CHECK_LABEL } from "@/lib/format";
import {
  approveNeed,
  approveUpdate,
  pauseNeed,
  recordManualPayout,
  redirectGift,
  refundGift,
  rejectNeed,
  rejectUpdate,
  requestInfo,
  resolveInstitutionAccount,
  saveChecks,
  setReportStatus,
  startPaystackPayout,
  updateInstitution,
  type AdminResult,
} from "./actions";

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
  const feedback = result ? <Notice tone={result.error ? "danger" : "brand"}>{result.error ?? result.message}</Notice> : null;
  return { pending, run, feedback };
}

export function ChecklistForm({ needId, initial }: { needId: string; initial: { check: string; passed: boolean; note: string | null }[] }) {
  const keys = ["identity", "amount", "institution", "account", "story"];
  const [rows, setRows] = useState(
    keys.map((k) => {
      const found = initial.find((i) => i.check === k);
      return { check: k, passed: found?.passed ?? false, note: found?.note ?? "" };
    }),
  );
  const { pending, run, feedback } = useAction();
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.check} className="rounded-xl border border-line p-3">
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--color-brand)]"
              checked={r.passed}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, passed: e.target.checked } : x)))}
            />
            {CHECK_LABEL[r.check]}
            {r.check === "story" ? <span className="font-normal text-muted">(recommended)</span> : null}
          </label>
          <Input
            className="mt-2 h-9 text-sm"
            placeholder="Private note: who you spoke to, what you saw"
            value={r.note}
            onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))}
          />
        </div>
      ))}
      {feedback}
      <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => saveChecks(needId, rows))}>
        {pending ? "Saving…" : "Save checklist"}
      </Button>
    </div>
  );
}

export function DecisionPanel({ needId, status, institutionName }: { needId: string; status: string; institutionName: string }) {
  const [note, setNote] = useState(`Fee balance confirmed by phone with ${institutionName}; account name matches.`);
  const [message, setMessage] = useState("");
  const { pending, run, feedback } = useAction();
  if (status === "live") {
    return (
      <div className="space-y-3">
        <Field label="Pause this need (hides it from givers)" htmlFor="pause">
          <Input id="pause" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Reason shown to the person who posted it" />
        </Field>
        {feedback}
        <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => pauseNeed(needId, message))}>Pause need</Button>
      </div>
    );
  }
  if (!["submitted", "needs_info"].includes(status)) return <p className="text-sm text-muted">No decision needed at this stage.</p>;
  return (
    <div className="space-y-4">
      <Field label="Public verification note (shown on the Verified badge)" htmlFor="vnote">
        <Textarea id="vnote" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Button disabled={pending} onClick={() => run(() => approveNeed(needId, note))} className="w-full">Approve and publish</Button>
      <div className="border-t border-line pt-4">
        <Field label="Message to the person who posted it" htmlFor="msg">
          <Textarea id="msg" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Please upload a clearer photo of the invoice." />
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => requestInfo(needId, message))}>Ask for more info</Button>
          <Button variant="danger" size="sm" disabled={pending} onClick={() => run(() => rejectNeed(needId, message))}>Reject</Button>
        </div>
      </div>
      {feedback}
    </div>
  );
}

export function InstitutionPanel({
  institution,
  banks,
}: {
  institution: { id: string; name: string; contact_name: string | null; contact_phone: string | null; bank_code: string | null; bank_name: string | null; account_number: string | null; account_name: string | null };
  banks: { name: string; code: string }[];
}) {
  const [form, setForm] = useState({
    name: institution.name,
    contact_name: institution.contact_name ?? "",
    contact_phone: institution.contact_phone ?? "",
    bank_code: institution.bank_code ?? "",
    account_number: institution.account_number ?? "",
    account_name: institution.account_name ?? "",
  });
  const [editing, setEditing] = useState(false);
  const { pending, run, feedback } = useAction();
  return (
    <div className="space-y-3">
      {editing ? (
        <div className="space-y-3">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Name" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} aria-label="Contact name" placeholder="Contact name" />
            <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} aria-label="Contact phone" placeholder="Contact phone" />
          </div>
          <Select value={form.bank_code} onChange={(e) => setForm({ ...form, bank_code: e.target.value })} aria-label="Bank">
            <option value="">Bank…</option>
            {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value.replace(/\D/g, "") })} maxLength={10} aria-label="Account number" />
            <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} aria-label="Account name" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={pending} onClick={() => run(async () => {
              const r = await updateInstitution(institution.id, { ...form, bank_name: banks.find((b) => b.code === form.bank_code)?.name ?? "" });
              if (r.ok) setEditing(false);
              return r;
            })}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => resolveInstitutionAccount(institution.id))}>
            {pending ? "Checking…" : "Check account with bank"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit details</Button>
        </div>
      )}
      {feedback}
    </div>
  );
}

export function PayoutPanel({ needId, amountLabel, institutionName }: { needId: string; amountLabel: string; institutionName: string }) {
  const [bankRef, setBankRef] = useState("");
  const [confirming, setConfirming] = useState(false);
  const { pending, run, feedback } = useAction();
  return (
    <div className="space-y-4">
      {confirming ? (
        <div className="space-y-2 rounded-xl bg-sun-soft p-3 text-sm">
          <p>Send <strong>{amountLabel}</strong> to <strong>{institutionName}</strong> by Paystack Transfer?</p>
          <div className="flex gap-2">
            <Button size="sm" disabled={pending} onClick={() => run(async () => { const r = await startPaystackPayout(needId); setConfirming(false); return r; })}>
              {pending ? "Sending…" : "Yes, send it"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button className="w-full" onClick={() => setConfirming(true)}>Pay {amountLabel} by Paystack Transfer</Button>
      )}
      <div className="border-t border-line pt-4">
        <Field label="Or record a bank transfer you made yourself" htmlFor="bankref" hint="Enter the transfer reference or session ID from your bank app.">
          <Input id="bankref" value={bankRef} onChange={(e) => setBankRef(e.target.value)} />
        </Field>
        <Button className="mt-2" size="sm" variant="secondary" disabled={pending || bankRef.length < 4} onClick={() => run(() => recordManualPayout(needId, bankRef))}>
          Record manual payout
        </Button>
      </div>
      {feedback}
    </div>
  );
}

export function UpdateReview({ updateId }: { updateId: string }) {
  const [reason, setReason] = useState("");
  const { pending, run, feedback } = useAction();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => approveUpdate(updateId))}>Approve</Button>
        <Input className="h-9 max-w-xs text-sm" placeholder="Reason (if rejecting)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => rejectUpdate(updateId, reason))}>Reject</Button>
      </div>
      {feedback}
    </div>
  );
}

export function ReportReview({ reportId }: { reportId: string }) {
  const [note, setNote] = useState("");
  const { pending, run, feedback } = useAction();
  return (
    <div className="space-y-2">
      <Input className="h-9 text-sm" placeholder="Resolution note (private)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => setReportStatus(reportId, "reviewing", note))}>Mark reviewing</Button>
        <Button size="sm" disabled={pending} onClick={() => run(() => setReportStatus(reportId, "resolved", note))}>Resolved</Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setReportStatus(reportId, "dismissed", note))}>Dismiss</Button>
      </div>
      {feedback}
    </div>
  );
}

export function ExpiredGiftControls({
  contributionId,
  choice,
  targets,
}: {
  contributionId: string;
  choice: "refund" | "redirect" | null;
  targets: { id: string; label: string }[];
}) {
  const [target, setTarget] = useState("");
  const [ref, setRef] = useState("");
  const { pending, run, feedback } = useAction();
  return (
    <div className="space-y-2">
      {choice === "redirect" ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Move to" className="sm:flex-1">
            <option value="">Move to…</option>
            {targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
          <Button size="sm" disabled={pending || !target} onClick={() => run(() => redirectGift(contributionId, target))}>Move gift</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Bank reference (if refunded by hand)" aria-label="Refund reference" className="sm:flex-1" />
          <Button size="sm" variant={choice === "refund" ? "primary" : "secondary"} disabled={pending} onClick={() => run(() => refundGift(contributionId, ref))}>
            {ref ? "Record refund" : "Refund via Paystack"}
          </Button>
        </div>
      )}
      {feedback}
    </div>
  );
}
