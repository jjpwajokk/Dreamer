import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, PageTitle, SectionTitle } from "@/components/ui";
import { SECTORS } from "@/lib/sectors";
import { SAMPLE_GIVERS, SAMPLE_NEEDS, SAMPLE_ORGS, sampleEmail } from "@/lib/samples/data";
import { LOAD_STEPS, STEP_LABEL, sampleSummary } from "@/lib/samples/load";
import { SampleLoader, SampleRemover } from "./sample-controls";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Sample data" };

const KIND_LABEL = { verified: "Verified", escrow: "In escrow", urgent: "Time-sensitive", completed: "Paid out + update", submitted: "Waiting for review" } as const;

export default async function AdminSamples() {
  const summary = await sampleSummary(createAdminClient());
  const loaded = summary.accounts > 0;

  return (
    <div className="space-y-8">
      <PageTitle
        eyebrow="Admin"
        title="Sample data"
        subtitle="Fill the site with fictional people, givers and organisations so testers can see every feature. Photos are illustrations, not real people. Remove it all with one button before launch."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-5"><p className="tabular text-2xl font-semibold">{summary.accounts}</p><p className="text-sm text-muted">Sample accounts</p></Card>
        <Card className="p-5"><p className="tabular text-2xl font-semibold">{summary.needs}</p><p className="text-sm text-muted">Sample needs</p></Card>
        <Card className="p-5"><p className="tabular text-2xl font-semibold">{summary.orgs}</p><p className="text-sm text-muted">Sample organisations</p></Card>
      </div>

      <section>
        <SectionTitle>Load</SectionTitle>
        <Card className="p-5 sm:p-6">
          <SampleLoader steps={LOAD_STEPS.map((k) => ({ key: k, label: STEP_LABEL[k] }))} loaded={loaded} />
        </Card>
      </section>

      <section>
        <SectionTitle>Sample logins</SectionTitle>
        <p className="mb-3 text-sm text-muted">Every account uses the password set above. Emails are not real, so nothing is ever sent to them.</p>
        <div className="grid gap-4 lg:grid-cols-2">
          {Object.values(SECTORS).map((s) => (
            <Card key={s.key} className="p-5">
              <p className="mb-2 font-semibold">{s.label}: people getting support</p>
              <ul className="space-y-1.5 text-sm">
                {SAMPLE_NEEDS[s.key].map((n) => (
                  <li key={n.handle} className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-tint/[.05] px-1.5 py-0.5 text-[13px]">{sampleEmail(n.handle)}</code>
                    <Badge>{KIND_LABEL[n.kind]}</Badge>
                    {n.kind !== "submitted" ? <Link href={`/n/${n.handle}-sample`} className="text-brand hover:underline">View</Link> : null}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          <Card className="p-5">
            <p className="mb-2 font-semibold">Givers (with gift history)</p>
            <ul className="space-y-1.5 text-sm">
              {SAMPLE_GIVERS.map((g) => (
                <li key={g.handle} className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-tint/[.05] px-1.5 py-0.5 text-[13px]">{sampleEmail(g.handle)}</code>
                  <span className="text-muted">{g.name}, {g.city}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <p className="mb-2 font-semibold">Organisations (sign in as the person who runs it)</p>
            <ul className="space-y-1.5 text-sm">
              {SAMPLE_ORGS.map((o) => (
                <li key={o.handle} className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-tint/[.05] px-1.5 py-0.5 text-[13px]">{sampleEmail(`org-${o.handle}`)}</code>
                  <Badge tone={o.verified ? "brand" : "sun"}>{o.verified ? "Verified" : "Waiting for review"}</Badge>
                  {o.verified ? <Link href={`/o/${o.handle}-sample`} className="text-brand hover:underline">{o.name}</Link> : <span className="text-muted">{o.name}</span>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section>
        <SectionTitle>Remove</SectionTitle>
        <Card className="p-5 sm:p-6">
          <SampleRemover />
        </Card>
      </section>
    </div>
  );
}
