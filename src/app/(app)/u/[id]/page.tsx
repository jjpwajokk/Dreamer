import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarDays, Heart, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { getSocials } from "@/lib/media";
import { formatDate } from "@/lib/format";
import { Card, LinkButton } from "@/components/ui";
import { SocialLinks } from "@/components/social-links";

type Props = { params: Promise<{ id: string }> };
type PublicProfile = { id: string; display_name: string | null; state: string | null; bio: string | null; created_at: string; is_verified: boolean; people_supported: number };

async function load(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("public_profiles").select("*").eq("id", id).maybeSingle();
  return data as PublicProfile | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).id);
  return p ? { title: p.display_name ?? "Member", robots: { index: false } } : { title: "Member not found" };
}

export default async function MemberPage({ params }: Props) {
  const { id } = await params;
  const profile = await load(id);
  if (!profile) notFound();
  const session = await getSession();
  const viewer = session ? { userId: session.userId, isAdmin: session.profile?.role === "admin" } : null;
  const socials = await getSocials({ userId: id }, viewer);
  const name = profile.display_name ?? "Member";

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="overflow-hidden">
        <div className="aurora relative h-28"><div className="grid-lines absolute inset-0" aria-hidden /></div>
        <div className="-mt-10 space-y-4 p-6">
          <div className="grid h-20 w-20 place-items-center rounded-full border-4 border-surface bg-brand text-2xl font-semibold text-white">{name.slice(0, 1).toUpperCase()}</div>
          <div>
            <h1 className="flex items-center gap-2 font-display text-3xl">{name} {profile.is_verified ? <BadgeCheck className="h-6 w-6 text-brand" aria-label="Verified member" /> : null}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {profile.state ? <span className="flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden /> {profile.state}</span> : null}
              <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" aria-hidden /> Member since {formatDate(profile.created_at, true)}</span>
              {profile.people_supported ? <span className="flex items-center gap-1"><Heart className="h-4 w-4" aria-hidden /> Backed {profile.people_supported} {profile.people_supported === 1 ? "dream" : "dreams"}</span> : null}
            </div>
          </div>
          {profile.bio ? <p className="text-[15px] leading-relaxed">{profile.bio}</p> : null}
          {session ? (
            <SocialLinks view={socials} target={{ profileUserId: id }} name={name} />
          ) : (
            <div className="rounded-xl bg-bg p-4 text-sm">
              <p className="text-muted">Join free to see photos and social links, and to connect with {name}.</p>
              <LinkButton href={`/login?next=${encodeURIComponent(`/u/${id}`)}&mode=signup`} size="sm" className="mt-2">Join Dreamer</LinkButton>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
