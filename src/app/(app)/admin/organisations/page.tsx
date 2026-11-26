import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { orgTypeLabel } from "@/lib/sectors";
import { Badge, Card, EmptyState, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organisations" };

const TABS = ["submitted", "needs_info", "verified", "draft", "rejected", "suspended"] as const;
const LABEL: Record<string, string> = { submitted: "To review", needs_info: "Waiting on them", verified: "Verified", draft: "Drafts", rejected: "Declined", suspended: "Suspended" };

export default async function AdminOrganisations({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "submitted" } = await searchParams;
  const admin = createAdminClient();
  const { data } = await admin.from("organisations").select("id, name, org_type, state, city, status, submitted_at, created_at").eq("status", status).order("submitted_at", { ascending: false, nullsFirst: false }).limit(200);
  const orgs = data ?? [];
  return (
    <div>
      <PageTitle eyebrow="Admin" title="Organisations" subtitle="Orphanages, charity homes, NGOs and foundations. Check the CAC registration, the person managing it, and that the bank account is in the organisation's own name." />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t} href={`/admin/organisations?status=${t}`} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${status === t ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-ink/20"}`}>{LABEL[t]}</Link>
        ))}
      </div>
      {orgs.length === 0 ? <EmptyState title="Nothing here" /> : (
        <ul className="space-y-2">
          {orgs.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/organisations/${o.id}`}>
                <Card className="flex flex-wrap items-center gap-3 p-4 hover:border-ink/20">
                  <p className="font-semibold">{o.name}</p>
                  <Badge>{orgTypeLabel(o.org_type)}</Badge>
                  <span className="text-sm text-muted">{[o.city, o.state].filter(Boolean).join(", ")}</span>
                  <span className="ml-auto text-xs text-muted">{o.submitted_at ? `Submitted ${formatDate(o.submitted_at)}` : `Started ${formatDate(o.created_at)}`}</span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
