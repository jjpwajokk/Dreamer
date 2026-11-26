import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";
import { formatNaira } from "@/lib/money";
import { sector } from "@/lib/sectors";
import { Badge, Card, EmptyState, PageTitle } from "@/components/ui";
import { ExpiredGiftControls } from "../admin-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Expired needs" };

export default async function ExpiredNeeds() {
  const admin = createAdminClient();
  const [{ data: needs }, { data: live }] = await Promise.all([
    admin
      .from("needs")
      .select("id, display_name, title, category, raised_kobo, amount_kobo, expires_at, expiry_notice_at, contributions(id, giver_name, giver_email, amount_kobo, status, expiry_choice, expiry_choice_at, is_anonymous)")
      .eq("status", "expired")
      .gt("raised_kobo", 0)
      .order("expires_at", { ascending: true }),
    admin.from("needs").select("id, display_name, title, category, amount_kobo, raised_kobo").eq("status", "live").order("published_at", { ascending: false }).limit(200),
  ]);

  const targetsFor = (category: string, amount: number) =>
    (live ?? [])
      .filter((n) => n.amount_kobo - n.raised_kobo >= amount)
      .sort((a, b) => Number(b.category === category) - Number(a.category === category))
      .map((n) => ({ id: n.id as string, label: `${n.display_name} · ${sector(n.category).label} · ${formatNaira(n.amount_kobo - n.raised_kobo)} left` }));

  return (
    <div>
      <PageTitle
        eyebrow="Admin"
        title="Expired needs"
        subtitle="Needs that closed before they were fully funded. Each giver chooses a refund or a redirect by email. Act on their choice here; after 14 days with no answer, refund."
      />
      {!needs?.length ? (
        <EmptyState title="Nothing to settle">When a need expires with gifts on it, it shows up here.</EmptyState>
      ) : (
        <div className="space-y-5">
          {needs.map((n) => {
            const gifts = ((n.contributions ?? []) as {
              id: string; giver_name: string | null; giver_email: string; amount_kobo: number; status: string;
              expiry_choice: "refund" | "redirect" | null; expiry_choice_at: string | null; is_anonymous: boolean;
            }[]).filter((g) => g.status === "success");
            return (
              <Card key={n.id} className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-bg px-5 py-4">
                  <div>
                    <Link href={`/admin/needs/${n.id}`} className="font-semibold hover:underline">{n.display_name}</Link>
                    <p className="text-sm text-muted">{n.title} · {sector(n.category).label}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="tabular font-semibold">{formatNaira(n.raised_kobo)} of {formatNaira(n.amount_kobo)}</p>
                    <p className="text-xs text-muted">
                      Expired {n.expires_at ? formatDate(n.expires_at) : ""} · {n.expiry_notice_at ? `givers emailed ${formatDate(n.expiry_notice_at)}` : "givers not emailed yet"}
                    </p>
                  </div>
                </div>
                <ul className="divide-y divide-line">
                  {gifts.map((g) => (
                    <li key={g.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto_minmax(0,380px)] md:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{g.giver_name || g.giver_email}</p>
                        <p className="truncate text-xs text-muted">{g.giver_email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tabular text-sm font-semibold">{formatNaira(g.amount_kobo)}</span>
                        {g.expiry_choice ? (
                          <Badge tone="brand">Chose {g.expiry_choice}</Badge>
                        ) : (
                          <Badge tone="sun">No answer yet</Badge>
                        )}
                      </div>
                      <ExpiredGiftControls contributionId={g.id} choice={g.expiry_choice} targets={targetsFor(n.category, g.amount_kobo)} />
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
