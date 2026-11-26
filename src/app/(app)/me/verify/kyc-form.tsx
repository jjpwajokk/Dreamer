"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Upload } from "lucide-react";
import { Button, Field, Input, Notice, Select } from "@/components/ui";
import { NIGERIAN_STATES } from "@/lib/format";
import { uploadFile } from "@/lib/upload";
import type { Profile } from "@/lib/types";
import { recordVerificationDoc, submitKyc, type KycState } from "./actions";

const ID_TYPES = [
  ["nin", "National ID (NIN)"],
  ["voters_card", "Voter's card"],
  ["drivers_licence", "Driver's licence"],
  ["passport", "International passport"],
  ["bvn", "BVN"],
] as const;

export function KycForm({ profile, docs }: { profile: Profile | null; docs: { kind: string }[] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<KycState, FormData>(submitKyc, undefined);
  const [uploading, setUploading] = useState<string | null>(null);
  const [upError, setUpError] = useState<string | null>(null);
  const [, start] = useTransition();
  const has = (k: string) => docs.some((d) => d.kind === k);

  function upload(kind: "id_front" | "selfie" | "proof_of_address", file?: File) {
    if (!file) return;
    setUpError(null);
    setUploading(kind);
    start(async () => {
      const up = await uploadFile("verification", "kyc", file);
      if (up.path) {
        const r = await recordVerificationDoc(kind, up.path, file.name);
        if (r.error) setUpError(r.error);
      } else setUpError(up.error ?? "Upload failed.");
      setUploading(null);
      router.refresh();
    });
  }

  if (state?.ok) {
    return (
      <div className="py-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-brand" aria-hidden />
        <p className="mt-3 font-display text-2xl">Thank you, you&apos;re all set</p>
        <p className="mt-1 text-sm text-muted">We&apos;ll confirm your details, usually within a day. You can carry on using Dreamer in the meantime.</p>
      </div>
    );
  }

  const docRow = (kind: "id_front" | "selfie" | "proof_of_address", label: string, hint: string, required?: boolean) => (
    <div className="flex items-center gap-3 rounded-xl border border-line p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}{required ? "" : <span className="text-muted"> (optional)</span>}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      {has(kind) ? (
        <span className="flex items-center gap-1 text-sm font-medium text-brand"><CheckCircle2 className="h-4 w-4" aria-hidden /> Added</span>
      ) : (
        <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold hover:border-ink/25">
          <Upload className="h-4 w-4" aria-hidden /> {uploading === kind ? "Uploading…" : "Add"}
          <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => upload(kind, e.target.files?.[0])} />
        </label>
      )}
    </div>
  );

  return (
    <form action={action} className="space-y-6">
      <section className="space-y-4">
        <h2 className="font-semibold">About you</h2>
        <Field label="Full name, as on your ID" htmlFor="legal_name" hint="Private. Publicly we only ever show your first name.">
          <Input id="legal_name" name="legal_name" autoComplete="name" defaultValue={profile?.legal_name ?? profile?.full_name ?? ""} required maxLength={120} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone number" htmlFor="phone">
            <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={profile?.phone ?? ""} required placeholder="0803 123 4567" />
          </Field>
          <Field label="Date of birth" htmlFor="dob">
            <Input id="dob" name="date_of_birth" type="date" defaultValue={profile?.date_of_birth ?? ""} required />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold">Where you live and work</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="State" htmlFor="state">
            <Select id="state" name="state" defaultValue={profile?.state ?? ""} required>
              <option value="">Choose…</option>
              {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Town or city" htmlFor="city">
            <Input id="city" name="city" defaultValue={profile?.city ?? ""} required maxLength={60} />
          </Field>
        </div>
        <Field label="Home address" htmlFor="address">
          <Input id="address" name="address" autoComplete="street-address" defaultValue={profile?.address ?? ""} required maxLength={240} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="What you do" htmlFor="occupation" hint="e.g. Student, trader, nurse, retired">
            <Input id="occupation" name="occupation" defaultValue={profile?.occupation ?? ""} required maxLength={80} />
          </Field>
          <Field label="Where you work or study (optional)" htmlFor="workplace">
            <Input id="workplace" name="workplace" defaultValue={profile?.workplace ?? ""} maxLength={120} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold">Your ID</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ID type" htmlFor="id_type">
            <Select id="id_type" name="id_type" defaultValue={profile?.id_type ?? "nin"}>
              {ID_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="ID number" htmlFor="id_number" hint={profile?.id_last4 ? `On file: ending ${profile.id_last4}` : "Stored securely. Never shown to anyone."}>
            <Input id="id_number" name="id_number" inputMode="numeric" autoComplete="off" required maxLength={30} />
          </Field>
        </div>
        {docRow("id_front", "Photo of your ID", "A clear photo of the front. PDFs are fine too.", true)}
        {docRow("selfie", "A selfie", "Helps us match you to your ID.")}
        {docRow("proof_of_address", "Proof of address", "A recent utility bill or bank statement.")}
        {upError ? <Notice tone="danger">{upError}</Notice> : null}
      </section>

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending || !has("id_front")}>
        {pending ? "Saving…" : has("id_front") ? "Submit for verification" : "Add a photo of your ID to continue"}
      </Button>
    </form>
  );
}
