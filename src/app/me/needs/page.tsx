import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { formatNaira, progressPercent } from "@/lib/money";
import type { Need } from "@/lib/types";
import { NeedAvatar, StatusPill } from "@/components/need-bits";
import { Card, EmptyState, LinkButton, Notice, PageTitle, Progress } from "@/components/ui";
import { DraftActions } from "./need-row-actions";

export const metadata: Metadata = { title: "My needs" };

export default async function MyNeedsPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const { submitted } = await searchParams;
  const session = await requireUser("/me/needs");
  const supabase = await createClient();
  const { data } = await supabase
    .from("needs")
    .select("*")
    .or(`beneficiary_id.eq.${session.userId},created_by.eq.${session.userId}`)
    .order("created_at", { ascending: false });
  const needs = (data ?? []) as Need[];
  const ids = needs.map((n) => n.id);
  const { data: updates } = ids.length
    ? await supabase.from("updates").select("need_id, status").in("need_id", ids)
    : { data: [] as { need_id: string; status: string }[] };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <PageTitle title="My needs" action={<LinkButton href="/me/needs/new" size="sm">Post a need</LinkButton>} />
      {submitted ? (
        <div className="mb-5">
          <Notice>Submitted. Our team will check the details with the institution, usually within 48 hours. We&apos;ll let you know.</Notice>
        </div>
      ) : null}
      {needs.length === 0 ? (
        <EmptyState title="No needs yet" action={<LinkButton href="/me/needs/new">Post a need</LinkButton>}>
          Post a school fee or hospital bill need for yourself, your child, or someone you know. Every need is verified before it goes live.
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {needs.map((n) => {
            const myUpdates = (updates ?? []).filter((u) => u.need_id === n.id);
            return (
              <li key={n.id}>
                <Card className="p-5">
                  <div className="flex items-start gap-3">
                    <NeedAvatar name={n.display_name} photoPath={n.cover_photo_path} size={48} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{n.display_name}</p>
                        <StatusPill status={n.status} />
                      </div>
                      <p className="truncate text-sm text-muted">{n.title}</p>
                    </div>
                  </div>
                  {["live", "funded", "paid_out", "completed"].includes(n.status) ? (
                    <div className="mt-4">
                      <Progress percent={progressPercent(n.amount_kobo, n.raised_kobo)} />
                      <p className="mt-1 text-sm text-muted">{formatNaira(n.raised_kobo)} of {formatNaira(n.amount_kobo)}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted">Amount: {formatNaira(n.amount_kobo)}</p>
                  )}
                  <StatusHelp need={n} updateCount={myUpdates.length} pendingUpdates={myUpdates.filter((u) => u.status === "pending").length} />
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {["draft", "needs_info"].includes(n.status) ? <LinkButton href={`/me/needs/${n.id}`} size="sm">{n.status === "draft" ? "Continue" : "Add information"}</LinkButton> : null}
                    {["live", "funded", "paid_out", "completed"].includes(n.status) ? <LinkButton href={`/n/${n.slug}`} size="sm" variant="secondary">View public page</LinkButton> : null}
                    {["funded", "paid_out", "completed"].includes(n.status) ? <LinkButton href={`/me/needs/${n.id}/update`} size="sm">Post an update</LinkButton> : null}
                    <DraftActions needId={n.id} status={n.status} />
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-8 text-center text-sm text-muted">
        Questions about a need? Reply to any email from us, or <Link className="underline" href="/about">read how it works</Link>.
      </p>
    </div>
  );
}

function StatusHelp({ need, updateCount, pendingUpdates }: { need: Need; updateCount: number; pendingUpdates: number }) {
  const text: Record<string, string> = {
    draft: "Not submitted yet. Finish the steps and submit it for review.",
    submitted: `Under review since ${formatDate(need.submitted_at)}. We'll call the institution to confirm, usually within 48 hours.`,
    needs_info: `Our team needs more information: ${need.info_request ?? ""}`,
    live: `Live and verified. Share your link on WhatsApp to reach more givers.${need.expires_at ? ` Open until ${formatDate(need.expires_at)}.` : ""}`,
    funded: "Fully funded! We are paying the money directly to the institution now.",
    paid_out: `Paid to the institution on ${formatDate(need.paid_out_at)}. Please post an update so your givers can see what changed.`,
    completed: "Completed. Thank you for sharing your update.",
    rejected: `Not approved. ${need.rejection_reason ?? ""}`,
    expired: "This need expired before it was fully funded. Our team will contact you about what happens next.",
  };
  return (
    <div className="mt-3 rounded-xl bg-bg px-3 py-2 text-sm">
      {text[need.status]}
      {updateCount > 0 ? <span className="mt-1 block text-xs text-muted">{updateCount} update{updateCount === 1 ? "" : "s"} posted{pendingUpdates ? `, ${pendingUpdates} waiting for review` : ""}.</span> : null}
    </div>
  );
}
