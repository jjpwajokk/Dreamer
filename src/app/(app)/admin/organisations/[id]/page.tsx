import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, FileText } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { orgTypeLabel } from "@/lib/sectors";
import { cleanSocials } from "@/lib/socials";
import { getGallery } from "@/lib/media";
import type { Organisation } from "@/lib/types";
import { Badge, Card, PageTitle } from "@/components/ui";
import { OrgReview } from "../../trust-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review organisation" };

export default async function AdminOrganisation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from("organisations").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const org = data as Organisation & { owner_id: string; submitted_at: string | null };
  const [{ data: owner }, { data: docs }, { data: audit }, gallery] = await Promise.all([
    admin.from("profiles").select("legal_name, display_name, email, phone, kyc_status").eq("user_id", org.owner_id).maybeSingle(),
    admin.from("verification_documents").select("kind, storage_path, file_name, created_at").eq("org_id", id).order("created_at"),
    admin.from("audit_log").select("id, action, created_at").eq("entity_id", id).order("created_at", { ascending: false }).limit(30),
    getGallery({ orgId: id, ownerId: org.owner_id }, { userId: "admin", isAdmin: true }),
  ]);
  const links = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data: s } = await admin.storage.from("verification").createSignedUrl(d.storage_path, 600);
      return { ...d, url: s?.signedUrl ?? null };
    }),
  );
  const socials = cleanSocials(org.socials);

  return (
    <div className="space-y-6">
      <Link href={`/admin/organisations?status=${org.status}`} className="text-sm text-muted hover:text-ink">← Organisations</Link>
      <PageTitle eyebrow={orgTypeLabel(org.org_type)} title={org.name} subtitle={org.tagline ?? undefined} />
      <div className="flex flex-wrap gap-2">
        <Badge tone={org.status === "verified" ? "brand" : org.status === "submitted" ? "sun" : "neutral"}>{org.status}</Badge>
        {org.status === "verified" ? <Link href={`/o/${org.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm text-brand">Public page <ExternalLink className="h-4 w-4" aria-hidden /></Link> : null}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card className="space-y-3 p-5 text-sm">
            <h2 className="font-semibold">Details</h2>
            <dl className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-muted">CAC number</dt><dd className="font-semibold">{org.cac_number ?? "-"}</dd>
              <dt className="text-muted">Founded</dt><dd>{org.year_founded ?? "-"}</dd>
              <dt className="text-muted">People supported</dt><dd>{org.people_supported?.toLocaleString("en-NG") ?? "-"}</dd>
              <dt className="text-muted">Address</dt><dd>{[org.address, org.city, org.state].filter(Boolean).join(", ")}</dd>
              <dt className="text-muted">Contact</dt><dd>{org.contact_name} · <a className="underline" href={`tel:${org.contact_phone}`}>{org.contact_phone}</a> · {org.contact_email}</dd>
              <dt className="text-muted">Website</dt><dd>{org.website ? <a className="underline" href={org.website} target="_blank" rel="noopener noreferrer nofollow">{org.website}</a> : "-"}</dd>
              <dt className="text-muted">Socials</dt><dd className="flex flex-wrap gap-2">{Object.entries(socials).map(([k, v]) => <a key={k} className="underline" href={v} target="_blank" rel="noopener noreferrer nofollow">{k}</a>)}{Object.keys(socials).length ? null : "-"}</dd>
            </dl>
            <h3 className="pt-2 font-semibold">About</h3>
            <p className="whitespace-pre-line">{org.about}</p>
            {org.impact ? <><h3 className="pt-2 font-semibold">Impact</h3><p className="whitespace-pre-line">{org.impact}</p></> : null}
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Photos ({gallery.photos.length})</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {gallery.photos.map((p) => (
                <div key={p.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.url ? <img src={p.url} alt={p.caption ?? ""} className="aspect-square w-full rounded-lg object-cover" /> : null}
                  <span className="absolute left-1 top-1 rounded bg-white/90 px-1 text-[10px] font-semibold text-night">{p.moderation}</span>
                </div>
              ))}
            </div>
            <Link href="/admin/photos" className="mt-3 inline-block text-sm text-brand underline">Moderate photos</Link>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="space-y-2 p-5 text-sm">
            <h2 className="font-semibold">Managed by</h2>
            <p>{owner?.legal_name || owner?.display_name} · {owner?.email} · {owner?.phone ?? "no phone"}</p>
            <p>ID check: <Badge tone={owner?.kyc_status === "verified" ? "brand" : "sun"}>{owner?.kyc_status ?? "none"}</Badge> <Link className="text-brand underline" href="/admin/people">People</Link></p>
          </Card>
          <Card className="space-y-2 p-5 text-sm">
            <h2 className="font-semibold">Official bank account</h2>
            <p>{org.bank_name ?? org.bank_code} · {org.account_number} · {org.account_name}</p>
            <p className="text-muted">{org.account_resolved_at ? `Bank-checked ${formatDate(org.account_resolved_at)}` : "Not checked with the bank yet"}</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Documents (private)</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              {links.map((d) => (
                <li key={d.storage_path} className="flex items-center gap-2"><FileText className="h-4 w-4" aria-hidden /><Badge>{d.kind.replace("_", " ")}</Badge>{d.url ? <a className="truncate text-brand underline" href={d.url} target="_blank" rel="noopener noreferrer">{d.file_name ?? "Open"}</a> : null}</li>
              ))}
              {links.length === 0 ? <li className="text-muted">None yet.</li> : null}
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Decision</h2>
            {org.review_note ? <p className="mb-2 text-xs text-muted">Last note: {org.review_note}</p> : null}
            <OrgReview orgId={org.id} status={org.status} />
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Audit trail</h2>
            <ul className="mt-2 space-y-1 text-xs">
              {(audit ?? []).map((a) => <li key={a.id} className="flex justify-between"><span>{a.action}</span><span className="text-muted">{formatDate(a.created_at, true)}</span></li>)}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
