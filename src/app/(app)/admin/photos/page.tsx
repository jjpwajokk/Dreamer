import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedUrls } from "@/lib/media";
import { formatDate } from "@/lib/format";
import { Badge, Card, EmptyState, PageTitle } from "@/components/ui";
import { PhotoModeration } from "../trust-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Photos" };

export default async function AdminPhotos({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "pending" } = await searchParams;
  const admin = createAdminClient();
  const { data } = await admin.from("media").select("*").eq("moderation", tab === "rejected" ? "rejected" : tab === "approved" ? "approved" : "pending").order("created_at", { ascending: tab !== "pending" ? false : true }).limit(60);
  const rows = data ?? [];
  const urls = await signedUrls(rows.map((r) => r.storage_path), "media", 900);
  const aiOn = Boolean(process.env.SIGHTENGINE_API_USER && process.env.SIGHTENGINE_API_SECRET);
  return (
    <div>
      <PageTitle
        eyebrow="Admin"
        title="Photos"
        subtitle={`Every photo is reviewed before members see it. ${aiOn ? "AI screening is on: explicit images are removed automatically and graphic ones are blurred." : "AI screening is off (add SIGHTENGINE keys to switch it on)."} Blur anything medical or upsetting; remove anything explicit, unsafe or showing private details.`}
      />
      <div className="mb-4 flex gap-2">
        {[["pending", "To review"], ["approved", "Approved"], ["rejected", "Removed"]].map(([k, l]) => (
          <Link key={k} href={`/admin/photos?tab=${k}`} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${tab === k ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-ink/20"}`}>{l}</Link>
        ))}
      </div>
      {rows.length === 0 ? <EmptyState title="All caught up" /> : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r, i) => (
            <li key={r.id}>
              <Card className="space-y-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {urls[i] ? <img src={urls[i]!} alt={r.caption ?? ""} className="aspect-[4/3] w-full rounded-xl object-cover" /> : <div className="aspect-[4/3] rounded-xl bg-bg" />}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <Badge>{r.purpose}</Badge>
                  <Badge>{r.visibility === "on_request" ? "On request" : "Members"}</Badge>
                  {r.is_sensitive ? <Badge tone="sun">Sensitive</Badge> : null}
                  {r.moderation_source === "ai" ? <Badge tone="brand">AI</Badge> : null}
                  <span className="ml-auto text-muted">{formatDate(r.created_at, true)}</span>
                </div>
                {r.caption ? <p className="text-sm">{r.caption}</p> : null}
                {r.need_id ? <Link className="text-xs text-brand underline" href={`/admin/needs/${r.need_id}`}>Open need</Link> : r.org_id ? <Link className="text-xs text-brand underline" href={`/admin/organisations/${r.org_id}`}>Open organisation</Link> : null}
                <PhotoModeration mediaId={r.id} sensitive={r.is_sensitive} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
