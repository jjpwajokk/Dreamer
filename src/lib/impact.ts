import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicNeed, PublicUpdate } from "@/lib/types";

export type Impact = {
  totalKobo: number;
  giftCount: number;
  needs: (PublicNeed & { given_kobo: number })[];
  updates: (PublicUpdate & { display_name: string; slug: string })[];
};

/** Everything a giver has given, by user id. Server-only (service role). */
export async function getImpact(userId: string): Promise<Impact> {
  const admin = createAdminClient();
  const { data: gifts } = await admin
    .from("contributions")
    .select("need_id, amount_kobo, paid_at")
    .eq("giver_id", userId)
    .eq("status", "success")
    .order("paid_at", { ascending: false });
  const list = gifts ?? [];
  const byNeed = new Map<string, number>();
  for (const g of list) byNeed.set(g.need_id, (byNeed.get(g.need_id) ?? 0) + g.amount_kobo);
  const ids = [...byNeed.keys()];
  if (ids.length === 0) return { totalKobo: 0, giftCount: 0, needs: [], updates: [] };
  const [{ data: needs }, { data: updates }] = await Promise.all([
    admin.from("public_needs").select("*").in("id", ids),
    admin.from("public_updates").select("*").in("need_id", ids).order("published_at", { ascending: false }).limit(30),
  ]);
  const needList = ids
    .map((id) => (needs ?? []).find((n) => n.id === id))
    .filter(Boolean)
    .map((n) => ({ ...(n as PublicNeed), given_kobo: byNeed.get((n as PublicNeed).id) ?? 0 }));
  return {
    totalKobo: list.reduce((s, g) => s + g.amount_kobo, 0),
    giftCount: list.length,
    needs: needList,
    updates: (updates ?? []).map((u) => {
      const n = needList.find((x) => x.id === u.need_id)!;
      return { ...(u as PublicUpdate), display_name: n?.display_name ?? "", slug: n?.slug ?? "" };
    }),
  };
}
