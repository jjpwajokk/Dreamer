import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, milestoneLabel } from "@/lib/format";
import { publicMediaUrl } from "@/lib/storage";
import { Badge, Card, EmptyState, PageTitle } from "@/components/ui";
import { UpdateReview } from "../admin-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Updates" };

export default async function AdminUpdates() {
  const admin = createAdminClient();
  const { data } = await admin.from("updates").select("*, need:needs(id, display_name, slug)").eq("status", "pending").order("created_at");
  const updates = data ?? [];
  return (
    <div>
      <PageTitle eyebrow="Admin" title="Updates to review" subtitle="Check photos for private details (ID numbers, full names of minors) before approving." />
      {updates.length === 0 ? <EmptyState title="All caught up" /> : (
        <ul className="space-y-3">
          {updates.map((u) => {
            const need = Array.isArray(u.need) ? u.need[0] : u.need;
            return (
              <li key={u.id}>
                <Card className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/needs/${need?.id}`} className="font-semibold hover:underline">{need?.display_name}</Link>
                    <Badge tone="sun">{milestoneLabel(u.milestone)}</Badge>
                    <span className="text-xs text-muted">{formatDate(u.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-line text-sm">{u.body}</p>
                  {u.photo_paths?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {(u.photo_paths as string[]).map((p) => (
                        <a key={p} href={publicMediaUrl(p) ?? "#"} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={publicMediaUrl(p) ?? ""} alt="" className="h-24 w-24 rounded-xl object-cover" />
                        </a>
                      ))}
                    </div>
                  ) : null}
                  <UpdateReview updateId={u.id} />
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
