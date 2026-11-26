import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { Badge, Card, EmptyState, PageTitle } from "@/components/ui";
import { RequestButtons } from "./request-buttons";

export const metadata: Metadata = { title: "Requests to connect" };
export const dynamic = "force-dynamic";

type Req = { id: string; requester_id: string; owner_id: string; need_id: string | null; org_id: string | null; message: string | null; status: string; created_at: string };

export default async function RequestsPage() {
  const session = await requireUser("/me/requests");
  const admin = createAdminClient();
  const [{ data: incoming }, { data: outgoing }] = await Promise.all([
    admin.from("media_requests").select("*").eq("owner_id", session.userId).order("created_at", { ascending: false }).limit(100),
    admin.from("media_requests").select("*").eq("requester_id", session.userId).order("created_at", { ascending: false }).limit(100),
  ]);
  const all = [...(incoming ?? []), ...(outgoing ?? [])] as Req[];
  const userIds = [...new Set(all.flatMap((r) => [r.requester_id, r.owner_id]))];
  const needIds = [...new Set(all.map((r) => r.need_id).filter(Boolean))] as string[];
  const orgIds = [...new Set(all.map((r) => r.org_id).filter(Boolean))] as string[];
  const [{ data: people }, { data: needs }, { data: orgs }] = await Promise.all([
    userIds.length ? admin.from("profiles").select("user_id, display_name, kyc_status, profile_public").in("user_id", userIds) : { data: [] },
    needIds.length ? admin.from("needs").select("id, display_name, slug, title").in("id", needIds) : { data: [] },
    orgIds.length ? admin.from("organisations").select("id, name, slug").in("id", orgIds) : { data: [] },
  ]);
  const person = (id: string) => (people ?? []).find((p) => p.user_id === id);
  const what = (r: Req) => {
    const n = (needs ?? []).find((x) => x.id === r.need_id);
    const o = (orgs ?? []).find((x) => x.id === r.org_id);
    if (n) return <Link className="underline" href={`/n/${n.slug}`}>{n.display_name}&apos;s need</Link>;
    if (o) return <Link className="underline" href={`/o/${o.slug}`}>{o.name}</Link>;
    return "profile";
  };
  const statusLabel: Record<string, string> = { pending: "Waiting", approved: "Shared", declined: "Kept private" };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageTitle eyebrow="Your privacy" title="Requests to connect" subtitle="When you keep photos or social links private, members can ask to see them. You decide, every time." />
      <section>
        <h2 className="mb-3 font-semibold">Asked of you</h2>
        {(incoming ?? []).length === 0 ? <EmptyState title="No requests yet" /> : (
          <ul className="space-y-3">
            {(incoming as Req[]).map((r) => {
              const p = person(r.requester_id);
              return (
                <li key={r.id}>
                  <Card className="space-y-2 p-4 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      {p?.profile_public ? <Link href={`/u/${r.requester_id}`} className="font-semibold hover:underline">{p?.display_name ?? "A member"}</Link> : <span className="font-semibold">{p?.display_name ?? "A member"}</span>}
                      {p?.kyc_status === "verified" ? <Badge tone="brand">Verified</Badge> : null}
                      <span className="text-muted">would like to see the private photos and links on your {what(r)}</span>
                    </div>
                    {r.message ? <p className="rounded-lg bg-bg px-3 py-2">&ldquo;{r.message}&rdquo;</p> : null}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-muted">{formatDate(r.created_at)}</span>
                      {r.status === "pending" ? <RequestButtons id={r.id} /> : <Badge>{statusLabel[r.status]}</Badge>}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-3 font-semibold">Your requests</h2>
        {(outgoing ?? []).length === 0 ? <p className="text-sm text-muted">You haven&apos;t asked anyone yet.</p> : (
          <ul className="space-y-2">
            {(outgoing as Req[]).map((r) => (
              <li key={r.id}>
                <Card className="flex flex-wrap items-center gap-2 p-3 text-sm">
                  <span>{person(r.owner_id)?.display_name ?? "A member"}: {what(r)}</span>
                  <Badge className="ml-auto">{statusLabel[r.status]}</Badge>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
