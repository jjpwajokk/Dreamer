"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Upload } from "lucide-react";
import { Button, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { NIGERIAN_STATES } from "@/lib/format";
import { ORG_TYPES, ORG_TYPE_LABEL } from "@/lib/sectors";
import { uploadFile } from "@/lib/upload";
import type { Organisation } from "@/lib/types";
import { SocialFields } from "@/components/social-fields";
import { cleanSocials } from "@/lib/socials";
import { recordOrgDoc, saveOrganisation, submitOrganisation } from "./actions";

const DOCS = [
  ["cac_certificate", "CAC certificate", true],
  ["scuml", "SCUML certificate (if you have one)", false],
  ["board_letter", "Letter from your board or trustees", false],
  ["tax_id", "Tax ID (TIN)", false],
  ["proof_of_address", "Proof of address", false],
] as const;

export function OrgForm({ org, banks, docs }: { org: Organisation | null; banks: { name: string; code: string }[]; docs: { kind: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "brand" | "danger"; text: string } | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const socialsRef = useRef<HTMLFormElement>(null);
  const locked = org?.status === "verified";
  const [f, setF] = useState({
    name: org?.name ?? "",
    org_type: org?.org_type ?? "orphanage",
    tagline: org?.tagline ?? "",
    about: org?.about ?? "",
    impact: org?.impact ?? "",
    people_supported: org?.people_supported?.toString() ?? "",
    year_founded: org?.year_founded?.toString() ?? "",
    cac_number: org?.cac_number ?? "",
    state: org?.state ?? "",
    city: org?.city ?? "",
    address: org?.address ?? "",
    contact_name: org?.contact_name ?? "",
    contact_phone: org?.contact_phone ?? "",
    contact_email: org?.contact_email ?? "",
    website: org?.website ?? "",
    bank_code: org?.bank_code ?? "",
    account_number: org?.account_number ?? "",
    account_name: org?.account_name ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  function save() {
    setMsg(null);
    start(async () => {
      const r = await saveOrganisation(org?.id ?? null, {
        ...f,
        bank_name: banks.find((b) => b.code === f.bank_code)?.name,
        socials: socialsRef.current ? Object.fromEntries(new FormData(socialsRef.current)) : {},
      });
      if (r.error) return setMsg({ tone: "danger", text: r.error });
      setMsg({ tone: "brand", text: "Saved." });
      router.refresh();
    });
  }

  function upload(kind: string, file?: File) {
    if (!file || !org) return;
    setUploading(kind);
    start(async () => {
      const up = await uploadFile("verification", `org-${org.id}`, file);
      const r = up.path ? await recordOrgDoc(org.id, kind, up.path, file.name) : { error: up.error };
      if (r.error) setMsg({ tone: "danger", text: r.error });
      setUploading(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="font-semibold">About the organisation</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Registered name" htmlFor="o-name"><Input id="o-name" value={f.name} onChange={set("name")} maxLength={160} /></Field>
          <Field label="Type" htmlFor="o-type">
            <Select id="o-type" value={f.org_type} onChange={set("org_type")}>
              {ORG_TYPES.map((t) => <option key={t} value={t}>{ORG_TYPE_LABEL[t]}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="One line about your work" htmlFor="o-tag" hint="For example: “A loving home and a good school for 40 children in Jos.”">
          <Input id="o-tag" value={f.tagline} onChange={set("tagline")} maxLength={140} />
        </Field>
        <Field label="Your story" htmlFor="o-about" hint={`${f.about.length}/3000. Who you are, who you serve, and how.`}>
          <Textarea id="o-about" rows={6} value={f.about} onChange={set("about")} maxLength={3000} />
        </Field>
        <Field label="The good work so far (optional)" htmlFor="o-impact" hint="Results you're proud of: children graduated, patients treated, families housed…">
          <Textarea id="o-impact" rows={4} value={f.impact} onChange={set("impact")} maxLength={2000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="People you support now" htmlFor="o-people"><Input id="o-people" inputMode="numeric" value={f.people_supported} onChange={set("people_supported")} /></Field>
          <Field label="Year founded" htmlFor="o-year"><Input id="o-year" inputMode="numeric" value={f.year_founded} onChange={set("year_founded")} maxLength={4} /></Field>
          <Field label="CAC number" htmlFor="o-cac" hint="RC, BN or IT number"><Input id="o-cac" value={f.cac_number} onChange={set("cac_number")} maxLength={40} /></Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold">Where to find you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="State" htmlFor="o-state">
            <Select id="o-state" value={f.state} onChange={set("state")}>
              <option value="">Choose…</option>
              {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Town or city" htmlFor="o-city"><Input id="o-city" value={f.city} onChange={set("city")} maxLength={60} /></Field>
        </div>
        <Field label="Address" htmlFor="o-addr"><Input id="o-addr" value={f.address} onChange={set("address")} maxLength={240} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Contact person" htmlFor="o-cn"><Input id="o-cn" value={f.contact_name} onChange={set("contact_name")} maxLength={80} /></Field>
          <Field label="Phone" htmlFor="o-cp"><Input id="o-cp" type="tel" value={f.contact_phone} onChange={set("contact_phone")} maxLength={20} /></Field>
          <Field label="Email" htmlFor="o-ce"><Input id="o-ce" type="email" value={f.contact_email} onChange={set("contact_email")} maxLength={120} /></Field>
        </div>
        <Field label="Website (optional)" htmlFor="o-web"><Input id="o-web" value={f.website} onChange={set("website")} maxLength={200} placeholder="https://" /></Field>
        <form ref={socialsRef} onSubmit={(e) => e.preventDefault()}>
          <SocialFields socials={cleanSocials(org?.socials)} visibility={org?.socials_visibility} subject="your organisation" />
        </form>
      </section>

      <section className="space-y-4 rounded-2xl bg-bg p-4 sm:p-5">
        <div>
          <h2 className="font-semibold">Official bank account</h2>
          <p className="mt-1 text-xs text-muted">Organisations are paid only into an account in the organisation&apos;s registered name. Personal accounts can&apos;t be used.</p>
        </div>
        <Field label="Bank" htmlFor="o-bank">
          <Select id="o-bank" value={f.bank_code} onChange={set("bank_code")} disabled={locked}>
            <option value="">Choose…</option>
            {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account number" htmlFor="o-acct"><Input id="o-acct" inputMode="numeric" maxLength={10} value={f.account_number} disabled={locked} onChange={(e) => setF({ ...f, account_number: e.target.value.replace(/\D/g, "") })} /></Field>
          <Field label="Account name" htmlFor="o-acn"><Input id="o-acn" value={f.account_name} disabled={locked} onChange={set("account_name")} maxLength={160} /></Field>
        </div>
      </section>

      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <Button size="lg" className="w-full" disabled={pending} onClick={save}>{pending ? "Saving…" : org ? "Save changes" : "Create organisation"}</Button>

      {org ? (
        <section className="space-y-3 border-t border-line pt-8">
          <h2 className="font-semibold">Registration documents</h2>
          <p className="text-xs text-muted">Private. Only our verification team sees these.</p>
          {DOCS.map(([kind, label, required]) => (
            <div key={kind} className="flex items-center gap-3 rounded-xl border border-line p-3">
              <p className="flex-1 text-sm font-medium">{label}{required ? <span className="text-danger"> *</span> : null}</p>
              {docs.some((d) => d.kind === kind) ? <span className="flex items-center gap-1 text-sm font-medium text-brand"><CheckCircle2 className="h-4 w-4" aria-hidden /> Added</span> : null}
              <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold hover:border-ink/25">
                <Upload className="h-4 w-4" aria-hidden /> {uploading === kind ? "Uploading…" : "Add"}
                <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => upload(kind, e.target.files?.[0])} />
              </label>
            </div>
          ))}
          {["draft", "needs_info"].includes(org.status) ? (
            <Button
              className="w-full"
              disabled={pending || !docs.some((d) => d.kind === "cac_certificate")}
              onClick={() => start(async () => { const r = await submitOrganisation(org.id); setMsg(r.error ? { tone: "danger", text: r.error } : { tone: "brand", text: "Submitted. We'll review your organisation, usually within 2 working days." }); router.refresh(); })}
            >
              Submit for verification
            </Button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
