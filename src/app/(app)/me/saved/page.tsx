import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PublicNeed } from "@/lib/types";
import { NeedCard } from "@/components/need-bits";
import { EmptyState, LinkButton, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  const session = await requireUser("/me/saved");
  const supabase = await createClient();
  const { data: saved } = await supabase.from("saved_needs").select("need_id").eq("user_id", session.userId).order("created_at", { ascending: false });
  const ids = (saved ?? []).map((s) => s.need_id as string);
  const { data } = ids.length ? await supabase.from("public_needs").select("*").in("id", ids) : { data: [] };
  const needs = ids.map((id) => (data ?? []).find((n) => n.id === id)).filter(Boolean) as PublicNeed[];

  return (
    <div>
      <PageTitle eyebrow="Give" title="Saved" subtitle="People you wanted to come back to." />
      {needs.length === 0 ? (
        <EmptyState title="Nothing saved yet" action={<LinkButton href="/discover">Discover</LinkButton>}>Swipe up on a card to save it here.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {needs.map((n) => <NeedCard key={n.id} need={n} />)}
        </div>
      )}
    </div>
  );
}
