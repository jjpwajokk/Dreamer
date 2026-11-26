import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, CalendarDays, Globe, MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { getGallery, getSocials } from "@/lib/media";
import { formatDate } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import { orgTypeLabel } from "@/lib/sectors";
import type { PublicNeed } from "@/lib/types";
import { Card, LinkButton } from "@/components/ui";
import { NeedCard } from "@/components/need-bits";
import { PhotoGallery } from "@/components/photo-gallery";
import { SocialLinks } from "@/components/social-links";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("public_organisations").select("*").eq("slug", slug).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const org = await load((await params).slug);
  return org ? { title: org.name, description: org.tagline ?? undefined } : { title: "Organisation not found" };
}

export default async function OrgPage({ params }: Props) {
  const { slug } = await params;
  const org = await load(slug);
  if (!org) notFound();
  const session = await getSession();
  const supabase = await createClient();
  const viewer = session ? { userId: session.userId, isAdmin: session.profile?.role === "admin" } : null;
  const [{ data: needs }, gallery, socials] = await Promise.all([
    supabase.from("public_needs").select("*").eq("org_slug", slug).order("published_at", { ascending: false }),
    getGallery({ orgId: org.id }, viewer),
    getSocials({ orgId: org.id }, viewer),
  ]);
  const list = ((needs ?? []) as PublicNeed[]).map((n) => (session ? n : { ...n, cover_photo_path: null }));

  return (
    <div>
      <Link href="/organisations" className="mb-5 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Organisations
      </Link>
      <section className="aurora relative overflow-hidden rounded-3xl px-6 py-10 text-white sm:px-10">
        <div className="grid-lines absolute inset-0" aria-hidden />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mint">{orgTypeLabel(org.org_type)}</p>
          <h1 className="mt-2 font-display text-[32px] leading-tight sm:text-[42px]">
            {org.name}
            <BadgeCheck className="ml-2 inline-block h-7 w-7 -translate-y-0.5 align-middle text-mint" aria-label="Verified organisation" />
          </h1>
          {org.tagline ? <p className="mt-2 max-w-2xl text-white/75">{org.tagline}</p> : null}
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70">
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden /> {org.city ? `${org.city}, ` : ""}{org.state}</span>
            {org.year_founded ? <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden /> Since {org.year_founded}</span> : null}
            {org.people_supported ? <span className="flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden /> {Number(org.people_supported).toLocaleString("en-NG")} people supported</span> : null}
            {org.website ? <a href={org.website.startsWith("http") ? org.website : `https://${org.website}`} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1.5 underline-offset-2 hover:underline"><Globe className="h-4 w-4" aria-hidden /> Website</a> : null}
          </div>
        </div>
      </section>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-8">
          <section>
            <h2 className="font-display text-xl">Our story</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-ink/90">{org.about}</p>
          </section>
          {org.impact ? (
            <section>
              <h2 className="font-display text-xl">The good work so far</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-ink/90">{org.impact}</p>
            </section>
          ) : null}
          <section>
            <h2 className="mb-3 font-display text-xl">Photos</h2>
            {gallery.total || gallery.photos.length ? (
              <PhotoGallery gallery={gallery} signedIn={Boolean(session)} target={{ orgId: org.id }} name={org.name} next={`/o/${slug}`} />
            ) : (
              <p className="text-sm text-muted">No photos yet.</p>
            )}
          </section>
          <section>
            <h2 className="mb-3 font-display text-xl">Current needs</h2>
            {list.length ? (
              <div className="grid gap-4 sm:grid-cols-2">{list.map((n) => <NeedCard key={n.id} need={n} />)}</div>
            ) : (
              <p className="text-sm text-muted">No open needs right now.</p>
            )}
          </section>
        </div>
        <aside className="space-y-3 lg:sticky lg:top-8">
          <Card className="space-y-3 p-5 text-sm">
            <p className="font-semibold">Verified by Dreamer</p>
            <ul className="space-y-2 text-muted">
              <li className="flex gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden /> Registered with the CAC{org.cac_number ? ` (${org.cac_number})` : ""}</li>
              <li className="flex gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden /> Paid only to its official organisation account</li>
              <li className="flex gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden /> Verified {org.verified_at ? formatDate(org.verified_at) : ""}</li>
            </ul>
            {session ? (
              <div className="border-t border-line pt-3"><SocialLinks view={socials} target={{ orgId: org.id }} name={org.name} /></div>
            ) : (
              <div className="border-t border-line pt-3 text-muted">
                <p>Join free to see photos and social links.</p>
                <LinkButton href={`/login?next=${encodeURIComponent(`/o/${slug}`)}&mode=signup`} size="sm" variant="secondary" className="mt-2">Join Dreamer</LinkButton>
              </div>
            )}
            {Number(org.raised_kobo) > 0 ? <p className="border-t border-line pt-3"><span className="font-semibold">{formatNaira(Number(org.raised_kobo))}</span> <span className="text-muted">raised on Dreamer</span></p> : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}
