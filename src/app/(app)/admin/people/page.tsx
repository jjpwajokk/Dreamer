import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { Badge, Card, EmptyState, PageTitle } from "@/components/ui";
import { BanControl, KycReview } from "../trust-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "People" };

const TABS = [
  ["submitted", "To review"],
  ["verified", "Verified"],
  ["rejected", "Sent back"],
  ["banned", "Closed accounts"],
] as const;

export default async function AdminPeople({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { tab = "submitted", q } = await searchParams;
  const admin = createAdminClient();
  let query = admin.from("profiles").select("*").order("kyc_submitted_at", { ascending: false, nullsFirst: false }).limit(100);
  if (tab === "banned") query = query.not("banned_at", "is", null);
  else query = query.eq("kyc_status", tab).is("banned_at", null);
  if (q) query = query.or(`email.ilike.%${q.replace(/[%,()]/g, "")}%,legal_name.ilike.%${q.replace(/[%,()]/g, "")}%,display_name.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data } = await query;
  const people = data ?? [];

  // Signed links (10 minutes) to each person's private ID documents.
  const ids = people.map((p) => p.user_id);
  const { data: docs } = ids.length
    ? await admin.from("verification_documents").select("owner_id, kind, storage_path").in("owner_id", ids).is("org_id", null)
    : { data: [] as { owner_id: string; kind: string; storage_path: string }[] };
  const links = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data: s } = await admin.storage.from("verification").createSignedUrl(d.storage_path, 600);
      return { ...d, url: s?.signedUrl ?? null };
    }),
  );

  return (
    <div>
      <PageTitle eyebrow="Admin" title="People" subtitle="Light ID checks for people who share needs, run organisations or give large amounts. ID numbers are never stored, only a fingerprint and the last 4 characters." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/people?tab=${k}`} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${tab === k ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-ink/20"}`}>{label}</Link>
        ))}
        <form className="ml-auto">
          <input type="hidden" name="tab" value={tab} />
          <input name="q" defaultValue={q} placeholder="Search name or email" className="h-9 rounded-lg border border-line bg-surface px-3 text-sm" />
        </form>
      </div>
      {people.length === 0 ? <EmptyState title="Nobody here" /> : (
        <ul className="space-y-3">
          {people.map((p) => (
            <li key={p.id}>
              <Card className="grid gap-4 p-5 lg:grid-cols-[1fr_320px]">
                <div className="space-y-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{p.legal_name || p.full_name || p.display_name || "Unnamed"}</p>
                    <Badge tone={p.kyc_status === "verified" ? "brand" : p.kyc_status === "submitted" ? "sun" : "neutral"}>{p.kyc_status}</Badge>
                    {p.kyc_provider_ref ? <Badge tone="brand">Auto-checked</Badge> : null}
                    {p.banned_at ? <Badge tone="danger">Closed {formatDate(p.banned_at)}</Badge> : null}
                  </div>
                  <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1">
                    <dt className="text-muted">Email</dt><dd className="truncate">{p.email}</dd>
                    <dt className="text-muted">Phone</dt><dd>{p.phone ?? "-"}</dd>
                    <dt className="text-muted">Date of birth</dt><dd>{p.date_of_birth ? formatDate(p.date_of_birth) : "-"}</dd>
                    <dt className="text-muted">ID</dt><dd>{p.id_type ? `${p.id_type.toUpperCase()} ending ${p.id_last4}` : "-"}</dd>
                    <dt className="text-muted">Lives in</dt><dd>{[p.address, p.city, p.state].filter(Boolean).join(", ") || "-"}</dd>
                    <dt className="text-muted">Work</dt><dd>{[p.occupation, p.workplace].filter(Boolean).join(" at ") || "-"}</dd>
                    <dt className="text-muted">Submitted</dt><dd>{p.kyc_submitted_at ? formatDate(p.kyc_submitted_at) : "-"}</dd>
                  </dl>
                  {p.kyc_note ? <p className="text-xs text-muted">Note: {p.kyc_note}</p> : null}
                  {p.ban_reason ? <p className="text-xs text-danger">Reason: {p.ban_reason}</p> : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {links.filter((l) => l.owner_id === p.user_id).map((l) =>
                      l.url ? <a key={l.storage_path} href={l.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-brand hover:border-brand">{l.kind.replace("_", " ")}</a> : null,
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  {!p.banned_at && p.kyc_status === "submitted" ? <KycReview userId={p.user_id} /> : null}
                  {!p.banned_at && p.role !== "admin" ? <BanControl userId={p.user_id} name={p.display_name ?? "This person"} /> : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
