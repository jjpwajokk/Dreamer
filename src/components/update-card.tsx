import Image from "next/image";
import { Sparkles } from "lucide-react";
import type { PublicUpdate } from "@/lib/types";
import { formatDate, milestoneLabel } from "@/lib/format";
import { publicMediaUrl } from "@/lib/storage";
import { Badge, Card } from "@/components/ui";

export function UpdateCard({ update, heading }: { update: PublicUpdate; heading?: React.ReactNode }) {
  return (
    <Card className="p-4">
      {heading ? <div className="mb-2">{heading}</div> : null}
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge tone="sun"><Sparkles className="h-3.5 w-3.5" aria-hidden /> {milestoneLabel(update.milestone)}</Badge>
        <span className="text-xs text-muted">{formatDate(update.published_at)}</span>
      </div>
      <p className="whitespace-pre-line text-[15px] leading-relaxed">{update.body}</p>
      {update.photo_paths.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {update.photo_paths.map((p) => {
            const url = publicMediaUrl(p);
            return url ? (
              <Image key={p} src={url} alt="Photo shared with the update" width={400} height={400} className="aspect-square w-full rounded-xl object-cover" />
            ) : null;
          })}
        </div>
      ) : null}
    </Card>
  );
}
