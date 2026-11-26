import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getImpact } from "@/lib/impact";
import { formatNaira } from "@/lib/money";
import { NeedAvatar } from "@/components/need-bits";
import { Card, LinkButton } from "@/components/ui";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!z.string().uuid().safeParse(id).success || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { data: profile } = await createAdminClient().from("profiles").select("user_id, display_name").eq("id", id).maybeSingle();
  if (!profile) return null;
  const impact = await getImpact(profile.user_id);
  if (impact.giftCount === 0) return null;
  return { name: profile.display_name || "A Dreamer", impact };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await load(id);
  if (!data) return { title: "Impact" };
  const title = `${data.name} helped ${data.impact.needs.length} ${data.impact.needs.length === 1 ? "person" : "people"} on Dreamer`;
  return { title, openGraph: { title }, twitter: { card: "summary_large_image", title } };
}

/** Public, shareable impact card. Shows first names only, no amounts per person. */
export default async function ImpactCardPage({ params }: Props) {
  const { id } = await params;
  const data = await load(id);
  if (!data) notFound();
  const { name, impact } = data;
  const paid = impact.needs.filter((n) => ["paid_out", "completed"].includes(n.status)).length;
  return (
    <div className="mx-auto max-w-md">
      <Card className="overflow-hidden text-center">
        <div className="bg-gradient-to-br from-brand to-[#1f9d7f] px-6 py-8 text-white">
          <p className="text-sm uppercase tracking-widest text-white/80">Impact card</p>
          <p className="mt-3 font-display text-3xl font-semibold">{name} helped {impact.needs.length} {impact.needs.length === 1 ? "person" : "people"}</p>
          <p className="mt-2 text-white/90">{formatNaira(impact.totalKobo)} given · {paid} paid straight to the bill</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 p-6">
          {impact.needs.slice(0, 8).map((n) => (
            <div key={n.id} className="flex flex-col items-center gap-1 text-xs">
              <NeedAvatar name={n.display_name} photoPath={n.cover_photo_path} size={48} />
              {n.display_name}
            </div>
          ))}
        </div>
      </Card>
      <div className="mt-6 text-center">
        <p className="text-sm text-muted">Every need on Dreamer is verified, and the money goes straight to the school, hospital, landlord or supplier.</p>
        <LinkButton href="/discover" className="mt-4">Meet someone you can help</LinkButton>
      </div>
    </div>
  );
}
