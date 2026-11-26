import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Building2, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/config";
import { formatNaira } from "@/lib/money";
import { orgTypeLabel } from "@/lib/sectors";
import { EmptyState, LinkButton, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Organisations", description: "Verified children's homes, care homes, NGOs and community groups on Dreamer." };
export const dynamic = "force-dynamic";

type Org = { id: string; slug: string; name: string; org_type: string; tagline: string | null; state: string | null; city: string | null; people_supported: number | null; need_count: number; raised_kobo: number };

export default async function OrganisationsPage() {
  let orgs: Org[] = [];
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.from("public_organisations").select("id, slug, name, org_type, tagline, state, city, people_supported, need_count, raised_kobo").order("verified_at", { ascending: false }).limit(100);
    orgs = (data ?? []) as Org[];
  }
  return (
    <div>
      <PageTitle
        eyebrow="Support"
        title="Organisations"
        subtitle="Children's homes, care homes, NGOs and community groups doing good work across Nigeria. Every one is registered and verified."
        action={<LinkButton href="/me/organisation" variant="secondary" size="sm">Register yours</LinkButton>}
      />
      {orgs.length === 0 ? (
        <EmptyState title="The first organisations are joining" action={<LinkButton href="/me/organisation">Register your organisation</LinkButton>}>
          Run a children&apos;s home, care home or NGO? Register, get verified, and share your work with people ready to support it.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {orgs.map((o) => (
            <Link key={o.id} href={`/o/${o.slug}`} className="group flex flex-col rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(11,20,24,.18)]">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Building2 className="h-5 w-5" aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-semibold"><span className="truncate">{o.name}</span> <BadgeCheck className="h-4 w-4 shrink-0 text-brand" aria-label="Verified" /></p>
                  <p className="text-xs text-muted">{orgTypeLabel(o.org_type)}</p>
                </div>
              </div>
              {o.tagline ? <p className="mt-3 line-clamp-2 text-sm">{o.tagline}</p> : null}
              <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-xs text-muted">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden /> {o.city ? `${o.city}, ` : ""}{o.state}</span>
                {o.people_supported ? <span>{o.people_supported.toLocaleString("en-NG")} people supported</span> : null}
                {o.raised_kobo > 0 ? <span>{formatNaira(o.raised_kobo)} raised</span> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
