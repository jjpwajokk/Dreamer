import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ExternalLink, FileText, Phone } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBanks } from "@/lib/banks";
import { CATEGORY_LABEL, RELATIONSHIP_LABEL, formatDate } from "@/lib/format";
import { formatNaira, progressPercent } from "@/lib/money";
import type { Institution, Need } from "@/lib/types";
import { NeedAvatar, StatusPill, VerifiedBadge } from "@/components/need-bits";
import { Badge, Card, Notice, Progress } from "@/components/ui";
import { ChecklistForm, DecisionPanel, InstitutionPanel, PayoutPanel } from "../../admin-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review need" };

export default async function AdminNeedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: needRow } = await admin.from("needs").select("*").eq("id", id).maybeSingle();
  if (!needRow) notFound();
  const need = needRow as Need;

  const [inst, docs, checks, contributions, payouts, updates, audit, creator, banks] = await Promise.all([
    need.institution_id ? admin.from("institutions").select("*").eq("id", need.institution_id).maybeSingle() : Promise.resolve({ data: null }),
    admin.from("need_documents").select("*").eq("need_id", id).order("created_at"),
    admin.from("verification_checks").select("check, passed, note").eq("need_id", id),
    admin.from("contributions").select("*").eq("need_id", id).order("created_at", { ascending: false }),
    admin.from("payouts").select("*").eq("need_id", id).order("created_at", { ascending: false }),
    admin.from("updates").select("*").eq("need_id", id).order("created_at", { ascending: false }),
    admin.from("audit_log").select("*").eq("entity_id", id).order("created_at", { ascending: false }).limit(50),
    need.created_by ? admin.from("profiles").select("email, phone, full_name").eq("user_id", need.created_by).maybeSingle() : Promise.resolve({ data: null }),
    getBanks(),
  ]);
  const institution = inst.data as Institution | null;

  // Signed links to private documents, valid for 10 minutes.
  const docLinks = await Promise.all(
    (docs.data ?? []).map(async (d) => {
      const { data } = await admin.storage.from("need-documents").createSignedUrl(d.storage_path, 600);
      return { ...d, url: data?.signedUrl ?? null };
    }),
  );

  // Duplicate checks: same phone number, or same institution account on another need.
  const dupPhone = need.contact_phone
    ? (await admin.from("needs").select("id, display_name, status").eq("contact_phone", need.contact_phone).neq("id", id)).data ?? []
    : [];
  const sameAccountInstitutions = institution?.account_number
    ? (await admin.from("institutions").select("id").eq("account_number", institution.account_number).eq("bank_code", institution.bank_code ?? "")).data ?? []
    : [];
  const dupAccount = sameAccountInstitutions.length
    ? ((await admin.from("needs").select("id, display_name, status").in("institution_id", sameAccountInstitutions.map((i) => i.id)).neq("id", id)).data ?? [])
    : [];

  const successful = (contributions.data ?? []).filter((c) => c.status === "success");
  const paidOut = (payouts.data ?? []).filter((p) => p.status === "success").reduce((s, p) => s + p.amount_kobo, 0);
  const payable = need.raised_kobo - paidOut;

  return (
    <div className="space-y-6">
      <Link href={`/admin/needs?status=${need.status}`} className="text-sm text-muted hover:text-ink">← Back to {need.status} needs</Link>

      <div className="flex flex-wrap items-start gap-4">
        <NeedAvatar name={need.display_name} photoPath={need.cover_photo_path} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-semibold">{need.display_name}</h1>
            <StatusPill status={need.status} />
            <VerifiedBadge verifiedAt={need.verified_at} />
            {need.is_minor ? <Badge tone="sun">Under 18</Badge> : null}
          </div>
          <p className="text-muted">{need.title} · {CATEGORY_LABEL[need.category]} · {need.city ? `${need.city}, ` : ""}{need.state}</p>
        </div>
        {["live", "funded", "paid_out", "completed"].includes(need.status) ? (
          <Link href={`/n/${need.slug}`} className="inline-flex items-center gap-1 text-sm text-brand" target="_blank">Public page <ExternalLink className="h-4 w-4" aria-hidden /></Link>
        ) : null}
      </div>

      {dupPhone.length || dupAccount.length ? (
        <Notice tone="sun">
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Possible duplicates:{" "}
              {[...dupPhone.map((d) => ({ ...d, why: "same phone" })), ...dupAccount.map((d) => ({ ...d, why: "same institution account" }))].map((d, i) => (
                <span key={`${d.id}-${i}`}>
                  {i > 0 ? ", " : ""}
                  <Link className="underline" href={`/admin/needs/${d.id}`}>{d.display_name}</Link> ({d.status}, {d.why})
                </span>
              ))}
              . Shared school accounts are normal; the same phone on several needs deserves a call.
            </span>
          </span>
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold">The need</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Amount</dt><dd className="font-semibold">{formatNaira(need.amount_kobo)}</dd>
              <dt className="text-muted">Posted by</dt><dd>{RELATIONSHIP_LABEL[need.relationship] ?? need.relationship} · {creator.data?.email ?? "seed data"}</dd>
              <dt className="text-muted">Contact phone</dt><dd className="flex items-center gap-1">{need.contact_phone ? <><Phone className="h-3.5 w-3.5" aria-hidden /><a className="underline" href={`tel:${need.contact_phone}`}>{need.contact_phone}</a></> : "-"}</dd>
              <dt className="text-muted">Submitted</dt><dd>{formatDate(need.submitted_at) || "-"}</dd>
              <dt className="text-muted">Consent given</dt><dd>{need.consent_at ? formatDate(need.consent_at) : "No"}</dd>
              {need.expires_at ? <><dt className="text-muted">Expires</dt><dd>{formatDate(need.expires_at)}</dd></> : null}
            </dl>
            <p className="mt-4 rounded-xl bg-sun-soft px-3 py-2 font-display text-lg">&ldquo;{need.my_words}&rdquo;</p>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{need.story}</p>
            {need.info_request ? <p className="mt-3 text-sm text-[#8a5a10]">Info requested: {need.info_request}</p> : null}
            {need.rejection_reason ? <p className="mt-3 text-sm text-danger">Rejected: {need.rejection_reason}</p> : null}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold">Documents (private)</h2>
            {docLinks.length === 0 ? <p className="mt-2 text-sm text-muted">No documents uploaded.</p> : (
              <ul className="mt-3 space-y-2">
                {docLinks.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0" aria-hidden /><Badge>{d.kind}</Badge><span className="truncate">{d.file_name}</span></span>
                    {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-brand underline">Open</a> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold">{need.institution_id ? (institution?.type === "hospital" ? "Hospital" : "School") : "Institution"}</h2>
            {institution ? (
              <>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted">Name</dt><dd className="font-semibold">{institution.name}</dd>
                  <dt className="text-muted">Contact</dt><dd>{institution.contact_name} {institution.contact_phone ? <a className="underline" href={`tel:${institution.contact_phone}`}>{institution.contact_phone}</a> : null}</dd>
                  <dt className="text-muted">Bank</dt><dd>{institution.bank_name ?? institution.bank_code}</dd>
                  <dt className="text-muted">Account</dt><dd>{institution.account_number} · {institution.account_name}</dd>
                  <dt className="text-muted">Bank check</dt><dd>{institution.account_resolved_at ? `Confirmed ${formatDate(institution.account_resolved_at)}` : "Not yet"}</dd>
                  <dt className="text-muted">Verified</dt><dd>{institution.verified_at ? formatDate(institution.verified_at) : "Not yet"}</dd>
                </dl>
                <div className="mt-4"><InstitutionPanel institution={institution} banks={banks} /></div>
              </>
            ) : <p className="mt-2 text-sm text-muted">No institution yet.</p>}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold">Money</h2>
            <Progress percent={progressPercent(need.amount_kobo, need.raised_kobo)} className="mt-3" />
            <p className="mt-2 text-sm">{formatNaira(need.raised_kobo)} raised of {formatNaira(need.amount_kobo)} · {formatNaira(paidOut)} paid out</p>
            <h3 className="mt-4 text-sm font-semibold">Gifts ({successful.length} confirmed)</h3>
            <ul className="mt-2 divide-y divide-line text-sm">
              {(contributions.data ?? []).slice(0, 30).map((c) => (
                <li key={c.id} className="flex justify-between gap-2 py-1.5">
                  <span className="truncate">{c.is_anonymous ? "Anonymous" : c.giver_name || c.giver_email} <span className="text-muted">· {c.status}</span></span>
                  <span>{formatNaira(c.amount_kobo)}{c.fee_kobo ? <span className="text-muted"> · fee {formatNaira(c.fee_kobo)}</span> : null}</span>
                </li>
              ))}
            </ul>
            {(payouts.data ?? []).length ? (
              <>
                <h3 className="mt-4 text-sm font-semibold">Payouts</h3>
                <ul className="mt-2 divide-y divide-line text-sm">
                  {(payouts.data ?? []).map((p) => (
                    <li key={p.id} className="flex justify-between gap-2 py-1.5">
                      <span>{p.method} · {p.status}{p.failure_reason ? ` (${p.failure_reason})` : ""}{p.manual_reference ? ` · ${p.manual_reference}` : ""}</span>
                      <span>{formatNaira(p.amount_kobo)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </Card>

          {(updates.data ?? []).length ? (
            <Card className="p-5">
              <h2 className="font-semibold">Updates</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {(updates.data ?? []).map((u) => (
                  <li key={u.id}><Badge>{u.status}</Badge> {u.body.slice(0, 140)} {u.status === "pending" ? <Link href="/admin/updates" className="text-brand underline">Review</Link> : null}</li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Verification checklist</h2>
            <ChecklistForm needId={need.id} initial={checks.data ?? []} />
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Decision</h2>
            <DecisionPanel needId={need.id} status={need.status} institutionName={institution?.name ?? "the institution"} />
          </Card>
          {["funded", "expired"].includes(need.status) && payable > 0 && institution ? (
            <Card className="border-sun p-5">
              <h2 className="mb-3 font-semibold">Payout</h2>
              {need.status === "expired" ? <p className="mb-3 text-sm text-[#8a5a10]">This need expired partly funded. Only pay out if the institution agrees the partial amount helps; otherwise arrange refunds.</p> : null}
              <PayoutPanel needId={need.id} amountLabel={formatNaira(payable)} institutionName={institution.name} />
            </Card>
          ) : null}
          <Card className="p-5">
            <h2 className="font-semibold">Audit trail</h2>
            <ul className="mt-3 space-y-2 text-xs">
              {(audit.data ?? []).map((a) => (
                <li key={a.id} className="flex justify-between gap-2"><span className="font-medium">{a.action}</span><span className="text-muted">{formatDate(a.created_at, true)} {new Date(a.created_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</span></li>
              ))}
              {(audit.data ?? []).length === 0 ? <li className="text-muted">No admin actions yet.</li> : null}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
