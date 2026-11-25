import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PublicNeed } from "@/lib/types";
import { formatNaira, progressPercent } from "@/lib/money";
import { NeedAvatar, StatusPill } from "@/components/need-bits";
import { Card, EmptyState, LinkButton, PageTitle, Progress } from "@/components/ui";

export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  const session = await requireUser("/me/saved");
  const supabase = await createClient();
  const { data: saved } = await supabase.from("saved_needs").select("need_id").eq("user_id", session.userId).order("created_at", { ascending: false });
  const ids = (saved ?? []).map((s) => s.need_id as string);
  const { data } = ids.length ? await supabase.from("public_needs").select("*").in("id", ids) : { data: [] };
  const needs = ids.map((id) => (data ?? []).find((n) => n.id === id)).filter(Boolean) as PublicNeed[];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <PageTitle title="Saved" subtitle="People you wanted to come back to." />
      {needs.length === 0 ? (
        <EmptyState title="Nothing saved yet" action={<LinkButton href="/discover">Discover</LinkButton>}>Swipe up on a card to save it here.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {needs.map((n) => (
            <li key={n.id}>
              <Link href={`/n/${n.slug}`}>
                <Card className="flex items-center gap-4 p-4 transition hover:border-brand/40">
                  <NeedAvatar name={n.display_name} photoPath={n.cover_photo_path} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><p className="font-semibold">{n.display_name}</p><StatusPill status={n.status} /></div>
                    <p className="truncate text-sm text-muted">&ldquo;{n.my_words}&rdquo;</p>
                    <Progress percent={progressPercent(n.amount_kobo, n.raised_kobo)} className="mt-2" />
                    <p className="mt-1 text-xs text-muted">{formatNaira(n.remaining_kobo)} to go</p>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
