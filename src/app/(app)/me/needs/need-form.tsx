"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, FileText, ImagePlus, Trash2, Upload } from "lucide-react";
import { Button, Card, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { NIGERIAN_STATES, RELATIONSHIP_LABEL, cn } from "@/lib/format";
import { formatNaira, parseNairaToKobo } from "@/lib/money";
import { CATEGORIES, PAYEE_LABEL, SECTORS, sector, type PayeeType } from "@/lib/sectors";
import { uploadFile } from "@/lib/upload";
import { publicMediaUrl } from "@/lib/storage";
import type { Institution, Need } from "@/lib/types";
import { recordDocument, removeDocument, saveBasics, saveInstitution, saveStory, setCoverPhoto, submitNeed } from "./actions";

type Doc = { id: string; kind: string; file_name: string | null };
type Bank = { name: string; code: string };

const STEPS = ["About", "The need", "Story", "Who gets paid", "Documents", "Submit"] as const;

export function NeedForm({
  need,
  institution,
  documents,
  banks,
}: {
  need: Need | null;
  institution: Institution | null;
  documents: Doc[];
  banks: Bank[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [needId, setNeedId] = useState<string | null>(need?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [basics, setBasics] = useState({
    relationship: need?.relationship ?? "self",
    category: need?.category ?? "education",
    display_name: need?.display_name ?? "",
    is_minor: need?.is_minor ?? false,
    state: need?.state ?? "",
    city: need?.city ?? "",
    contact_phone: need?.contact_phone ?? "",
    title: need?.title ?? "",
    amountText: need ? String(need.amount_kobo / 100) : "",
  });
  const [story, setStory] = useState({ story: need?.story ?? "", my_words: need?.my_words ?? "" });
  const [inst, setInst] = useState({
    name: institution?.name ?? "",
    type: (institution?.type ?? sector(basics.category).payeeTypes[0]) as PayeeType,
    state: institution?.state ?? "",
    address: institution?.address ?? "",
    contact_name: institution?.contact_name ?? "",
    contact_phone: institution?.contact_phone ?? "",
    bank_code: institution?.bank_code ?? "",
    account_number: institution?.account_number ?? "",
    account_name: institution?.account_name ?? "",
  });
  const [docs, setDocs] = useState<Doc[]>(documents);
  const [cover, setCover] = useState<string | null>(need?.cover_photo_path ?? null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [consent, setConsent] = useState({ truthful: false, dataConsent: false, guardian: false });

  const forSelf = basics.relationship === "self";
  const who = basics.display_name || (forSelf ? "you" : "them");

  function run(fn: () => Promise<{ ok?: boolean; error?: string; needId?: string }>, nextStep?: number) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) return setError(res.error);
      if (res.needId) setNeedId(res.needId);
      if (nextStep !== undefined) {
        setStep(nextStep);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  function saveStep(nextStep: number) {
    if (step <= 1) {
      const amount_kobo = parseNairaToKobo(basics.amountText);
      if (step === 0) {
        if (!basics.display_name || !basics.state || !basics.contact_phone) return setError("Please fill in the name, state and phone number.");
        setError(null);
        setStep(1);
        return;
      }
      return run(
        () => saveBasics(needId, { ...basics, amount_kobo: amount_kobo ?? 0 }),
        nextStep,
      );
    }
    if (step === 2) return run(() => saveStory(needId!, story), nextStep);
    if (step === 3) {
      const bank = banks.find((b) => b.code === inst.bank_code);
      return run(() => saveInstitution(needId!, { ...inst, bank_name: bank?.name }), nextStep);
    }
    setStep(nextStep);
  }

  async function onUpload(kind: string, file: File | undefined) {
    if (!file || !needId) return;
    if (file.size > 10 * 1024 * 1024) return setError("Files can be up to 10 MB.");
    setError(null);
    setUploading(kind);
    if (kind === "cover") {
      const res = await uploadFile("public-media", "covers", file);
      if (res.path) {
        const saved = await setCoverPhoto(needId, res.path);
        if (saved.error) setError(saved.error);
        else setCover(res.path);
      } else setError(res.error ?? "Upload failed.");
    } else {
      const res = await uploadFile("need-documents", needId, file);
      if (res.path) {
        const saved = await recordDocument(needId, kind, res.path, file.name);
        if (saved.error || !saved.id) setError(saved.error ?? "Upload failed.");
        else setDocs((d) => [...d, { id: saved.id!, kind, file_name: file.name }]);
      } else setError(res.error ?? "Upload failed.");
    }
    setUploading(null);
  }

  const amountKobo = parseNairaToKobo(basics.amountText);
  const sct = sector(basics.category);
  const cap = sct.capKobo;
  const payeeName = PAYEE_LABEL[inst.type as PayeeType]?.toLowerCase() ?? "payee";

  return (
    <div>
      <ol className="mb-6 flex gap-1" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <div className={cn("h-1.5 rounded-full", i <= step ? "bg-brand" : "bg-black/10")} />
            <span className={cn("mt-1 hidden text-[11px] sm:block", i === step ? "font-semibold text-ink" : "text-muted")}>{label}</span>
          </li>
        ))}
      </ol>

      {need?.status === "needs_info" && need.info_request ? (
        <div className="mb-5">
          <Notice tone="sun"><strong>Our team asked for more information:</strong> {need.info_request}</Notice>
        </div>
      ) : null}

      <Card className="space-y-5 p-5">
        {step === 0 ? (
          <>
            <h2 className="font-display text-2xl font-semibold">Who is this need for?</h2>
            <Field label="This need is for" htmlFor="relationship">
              <Select id="relationship" value={basics.relationship} onChange={(e) => setBasics({ ...basics, relationship: e.target.value })}>
                {Object.entries(RELATIONSHIP_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label={forSelf ? "Your first name" : "Their first name"} htmlFor="display_name" hint="Only the first name is ever shown publicly.">
              <Input id="display_name" value={basics.display_name} onChange={(e) => setBasics({ ...basics, display_name: e.target.value })} maxLength={40} autoComplete="given-name" />
            </Field>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--color-brand)]" checked={basics.is_minor} onChange={(e) => setBasics({ ...basics, is_minor: e.target.checked })} />
              <span>{forSelf ? "I am" : "They are"} under 18. <span className="text-muted">We&apos;ll hide the name of the school, hospital or payee on public pages, and a parent or guardian must consent.</span></span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="State" htmlFor="state">
                <Select id="state" value={basics.state} onChange={(e) => setBasics({ ...basics, state: e.target.value })}>
                  <option value="">Choose…</option>
                  {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Town or city (optional)" htmlFor="city">
                <Input id="city" value={basics.city} onChange={(e) => setBasics({ ...basics, city: e.target.value })} maxLength={60} />
              </Field>
            </div>
            <Field label="Phone number we can call" htmlFor="phone" hint="Private. Only our verification team sees it.">
              <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" value={basics.contact_phone} onChange={(e) => setBasics({ ...basics, contact_phone: e.target.value })} />
            </Field>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h2 className="font-display text-2xl font-semibold">What is the need?</h2>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Category</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {CATEGORIES.map((c) => {
                  const x = SECTORS[c];
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => {
                        setBasics({ ...basics, category: c });
                        if (!x.payeeTypes.includes(inst.type as PayeeType)) setInst({ ...inst, type: x.payeeTypes[0]! });
                      }}
                      aria-pressed={basics.category === c}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border px-3 py-3 text-left text-sm transition",
                        basics.category === c ? "border-brand bg-brand-soft ring-4 ring-brand/10" : "border-line bg-surface hover:border-ink/20",
                      )}
                    >
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: x.accent }} aria-hidden />
                      <span>
                        <span className="block font-semibold">{x.label}</span>
                        <span className="text-xs text-muted">{x.examples}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <Field label="A short title" htmlFor="title" hint={`For example: "${sct.key === "education" ? "SS2 school fees for second term" : sct.key === "healthcare" ? "Appendix surgery at General Hospital" : sct.key === "housing" ? "One year's rent for our room" : sct.key === "livelihood" ? "A new industrial sewing machine" : sct.key === "skills" ? "Six-month solar installation course" : "Food and bedding after the flood"}"`}>
              <Input id="title" value={basics.title} onChange={(e) => setBasics({ ...basics, title: e.target.value })} maxLength={80} />
            </Field>
            <Field
              label="Amount needed (₦)"
              htmlFor="amount"
              hint={`Use the exact amount on the invoice or quote. Up to ${formatNaira(cap)} for ${sct.label.toLowerCase()}.`}
              error={basics.amountText && !amountKobo ? "Enter an amount in naira, like 185000" : null}
            >
              <Input id="amount" inputMode="numeric" placeholder="185000" value={basics.amountText} onChange={(e) => setBasics({ ...basics, amountText: e.target.value })} />
            </Field>
            {amountKobo ? <p className="text-sm text-muted">That&apos;s {formatNaira(amountKobo)}.</p> : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="font-display text-2xl font-semibold">{forSelf ? "Your story" : `${who}'s story`}</h2>
            <Notice tone="sun">
              Tell it with dignity. Share what is happening and what this will make possible. You don&apos;t need to make it sad: givers respond to hope and honesty.
            </Notice>
            <Field label="The story" htmlFor="story" hint={`${story.story.length}/600 characters`}>
              <Textarea id="story" rows={7} maxLength={600} value={story.story} onChange={(e) => setStory({ ...story, story: e.target.value })} placeholder="Who you are, what the money is for, and what it will change." />
            </Field>
            <Field label={forSelf ? "One line in your own words" : `One line in ${who}'s own words`} htmlFor="my_words" hint={`${story.my_words.length}/120. This is the line givers see first. Example: "I want to be the first nurse in my family."`}>
              <Input id="my_words" maxLength={120} value={story.my_words} onChange={(e) => setStory({ ...story, my_words: e.target.value })} />
            </Field>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h2 className="font-display text-2xl font-semibold">Where should the money go?</h2>
            <p className="text-sm text-muted">We pay the {payeeName} directly, never a personal account of the person in need. We&apos;ll call them to confirm the amount and their account.</p>
            <div className="grid grid-cols-2 gap-2">
              {sct.payeeTypes.map((t) => (
                <button type="button" key={t} onClick={() => setInst({ ...inst, type: t })} className={cn("rounded-xl border px-3 py-2 text-sm font-semibold", inst.type === t ? "border-brand bg-brand-soft" : "border-line")}>
                  {PAYEE_LABEL[t]}
                </button>
              ))}
            </div>
            <Field label={`Name of the ${payeeName}`} htmlFor="inst-name">
              <Input id="inst-name" value={inst.name} onChange={(e) => setInst({ ...inst, name: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="State" htmlFor="inst-state">
                <Select id="inst-state" value={inst.state} onChange={(e) => setInst({ ...inst, state: e.target.value })}>
                  <option value="">Choose…</option>
                  {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Address (optional)" htmlFor="inst-address">
                <Input id="inst-address" value={inst.address} onChange={(e) => setInst({ ...inst, address: e.target.value })} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={inst.type === "school" ? "Bursar or contact name" : inst.type === "hospital" ? "Billing office contact" : "Contact person"} htmlFor="inst-contact">
                <Input id="inst-contact" value={inst.contact_name} onChange={(e) => setInst({ ...inst, contact_name: e.target.value })} />
              </Field>
              <Field label="Their phone number" htmlFor="inst-phone">
                <Input id="inst-phone" type="tel" inputMode="tel" value={inst.contact_phone} onChange={(e) => setInst({ ...inst, contact_phone: e.target.value })} />
              </Field>
            </div>
            <div className="rounded-xl bg-bg p-4">
              <p className="mb-3 text-sm font-semibold">Their business bank account (from the invoice or quote)</p>
              <div className="space-y-4">
                <Field label="Bank" htmlFor="bank">
                  <Select id="bank" value={inst.bank_code} onChange={(e) => setInst({ ...inst, bank_code: e.target.value })}>
                    <option value="">Choose…</option>
                    {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
                  </Select>
                </Field>
                <Field label="Account number" htmlFor="acct">
                  <Input id="acct" inputMode="numeric" maxLength={10} value={inst.account_number} onChange={(e) => setInst({ ...inst, account_number: e.target.value.replace(/\D/g, "") })} />
                </Field>
                <Field label="Account name" htmlFor="acct-name" hint="As written on the invoice. We confirm it with the bank before paying.">
                  <Input id="acct-name" value={inst.account_name} onChange={(e) => setInst({ ...inst, account_name: e.target.value })} />
                </Field>
              </div>
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <h2 className="font-display text-2xl font-semibold">Documents</h2>
            <p className="text-sm text-muted">Documents are private. Only our verification team can see them. Photos of paper documents are fine.</p>
            <UploadRow label={sct.documentLabel} required kind="invoice" docs={docs} uploading={uploading} onUpload={onUpload} onRemove={(id) => run(async () => { const r = await removeDocument(id); if (r.ok) setDocs((d) => d.filter((x) => x.id !== id)); return r; })} />
            <UploadRow label="ID (NIN slip, student ID or similar)" kind="id" docs={docs} uploading={uploading} onUpload={onUpload} onRemove={(id) => run(async () => { const r = await removeDocument(id); if (r.ok) setDocs((d) => d.filter((x) => x.id !== id)); return r; })} />
            <UploadRow label="Supporting letter from the school, doctor, landlord or referrer (optional)" kind="letter" docs={docs} uploading={uploading} onUpload={onUpload} onRemove={(id) => run(async () => { const r = await removeDocument(id); if (r.ok) setDocs((d) => d.filter((x) => x.id !== id)); return r; })} />
            <div className="rounded-xl border border-dashed border-line p-4">
              <p className="text-sm font-semibold">Profile photo (optional)</p>
              <p className="mt-1 text-xs text-muted">Faces are optional. Without a photo, we show initials. This photo is public.</p>
              <div className="mt-3 flex items-center gap-3">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicMediaUrl(cover) ?? ""} alt="" className="h-16 w-16 rounded-full object-cover" />
                ) : null}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:bg-bg">
                  <ImagePlus className="h-4 w-4" aria-hidden /> {uploading === "cover" ? "Uploading…" : cover ? "Change photo" : "Add photo"}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => onUpload("cover", e.target.files?.[0])} />
                </label>
                {cover ? <button type="button" className="text-sm text-muted underline" onClick={() => run(async () => { const r = await setCoverPhoto(needId!, null); if (r.ok) setCover(null); return r; })}>Remove</button> : null}
              </div>
            </div>
          </>
        ) : null}

        {step === 5 ? (
          <>
            <h2 className="font-display text-2xl font-semibold">Check and submit</h2>
            <dl className="divide-y divide-line rounded-xl border border-line text-sm">
              {[
                ["Name shown", basics.display_name],
                ["Need", basics.title],
                ["Amount", amountKobo ? formatNaira(amountKobo) : "-"],
                ["Paid to", inst.name],
                ["In their words", story.my_words],
                ["Documents", `${docs.length} uploaded`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="space-y-3 text-sm">
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--color-brand)]" checked={consent.truthful} onChange={(e) => setConsent({ ...consent, truthful: e.target.checked })} />
                <span>Everything here is true. I understand Dreamer will call the {payeeName} to check, and will remove the need and return gifts if anything is false.</span>
              </label>
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--color-brand)]" checked={consent.dataConsent} onChange={(e) => setConsent({ ...consent, dataConsent: e.target.checked })} />
                <span>I agree that Dreamer may use these details to verify the need and show the public parts (first name, state, story, amount) to givers, as described in the <Link href="/privacy" className="underline" target="_blank">privacy policy</Link>.</span>
              </label>
              {basics.is_minor ? (
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--color-brand)]" checked={consent.guardian} onChange={(e) => setConsent({ ...consent, guardian: e.target.checked })} />
                  <span>I am {who}&apos;s parent or legal guardian, or I have their parent or guardian&apos;s permission to post this.</span>
                </label>
              ) : null}
            </div>
          </>
        ) : null}

        {error ? <Notice tone="danger">{error}</Notice> : null}

        <div className="flex items-center justify-between gap-3 pt-2">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={() => setStep(step - 1)} disabled={pending}>Back</Button>
          ) : <span />}
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => saveStep(step + 1)} disabled={pending || (step === 4 && !docs.some((d) => d.kind === "invoice"))}>
              {pending ? "Saving…" : step === 4 && !docs.some((d) => d.kind === "invoice") ? "Upload the invoice to continue" : "Save and continue"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() =>
                run(async () => {
                  const res = await submitNeed(needId!, consent);
                  if (res.ok) router.push("/me/needs?submitted=1");
                  return res;
                })
              }
              disabled={pending || !consent.truthful || !consent.dataConsent || (basics.is_minor && !consent.guardian)}
            >
              <Check className="h-4 w-4" aria-hidden /> {pending ? "Submitting…" : "Submit for review"}
            </Button>
          )}
        </div>
      </Card>
      {needId ? <p className="mt-3 text-center text-xs text-muted">Your progress is saved as a draft. You can come back to it any time from <Link href="/me/needs" className="underline">My needs</Link>.</p> : null}
    </div>
  );
}

function UploadRow({
  label,
  kind,
  required,
  docs,
  uploading,
  onUpload,
  onRemove,
}: {
  label: string;
  kind: string;
  required?: boolean;
  docs: Doc[];
  uploading: string | null;
  onUpload: (kind: string, file: File | undefined) => void;
  onRemove: (id: string) => void;
}) {
  const mine = docs.filter((d) => d.kind === kind);
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{label}{required ? <span className="text-danger"> *</span> : null}</p>
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm font-semibold hover:bg-bg">
          <Upload className="h-4 w-4" aria-hidden /> {uploading === kind ? "Uploading…" : "Add"}
          <input type="file" accept="image/*,application/pdf" capture={undefined} className="sr-only" onChange={(e) => onUpload(kind, e.target.files?.[0])} />
        </label>
      </div>
      {mine.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {mine.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 text-sm text-muted">
              <span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0" aria-hidden /><span className="truncate">{d.file_name ?? "Document"}</span></span>
              <button type="button" onClick={() => onRemove(d.id)} aria-label={`Remove ${d.file_name ?? "document"}`}><Trash2 className="h-4 w-4" aria-hidden /></button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
