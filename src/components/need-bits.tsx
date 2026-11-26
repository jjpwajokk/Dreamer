import Image from "next/image";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { avatarTone, cn, formatDate, initials, STATUS_LABEL, type NeedStatus } from "@/lib/format";
import { publicMediaUrl } from "@/lib/storage";
import { Badge } from "@/components/ui";
import { sector } from "@/lib/sectors";

export function NeedAvatar({
  name,
  photoPath,
  size = 56,
  className,
}: {
  name: string;
  photoPath?: string | null;
  size?: number;
  className?: string;
}) {
  const url = publicMediaUrl(photoPath);
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  const tone = avatarTone(name);
  return (
    <div
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.4, background: `linear-gradient(135deg, ${tone.from}, ${tone.to})` }}
    >
      {initials(name)}
    </div>
  );
}

export function VerifiedBadge({ verifiedAt, compact = false }: { verifiedAt: string | null; compact?: boolean }) {
  if (!verifiedAt) return null;
  return (
    <Badge tone="brand" title={`Verified on ${formatDate(verifiedAt)}`}>
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
      {compact ? "Verified" : `Verified ${formatDate(verifiedAt, true)}`}
    </Badge>
  );
}

export function StatusPill({ status }: { status: NeedStatus }) {
  const tone: Record<NeedStatus, "neutral" | "brand" | "sun" | "danger"> = {
    draft: "neutral",
    submitted: "sun",
    needs_info: "sun",
    live: "brand",
    funded: "brand",
    paid_out: "brand",
    completed: "brand",
    rejected: "danger",
    expired: "neutral",
  };
  return <Badge tone={tone[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function CategoryBadge({ category, className }: { category: string; className?: string }) {
  const sct = sector(category);
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", className)}
      style={{ background: `${sct.accent}14`, color: sct.accent }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: sct.accent }} aria-hidden />
      {sct.label}
    </span>
  );
}

export function NeedCard({ need, className }: { need: import("@/lib/types").PublicNeed; className?: string }) {
  const pct = need.amount_kobo > 0 ? Math.min(100, Math.round((need.raised_kobo / need.amount_kobo) * 100)) : 0;
  const naira = (k: number) => `₦${Math.round(k / 100).toLocaleString("en-NG")}`;
  return (
    <Link
      href={`/n/${need.slug}`}
      className={cn(
        "group flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(11,20,24,.04)] transition hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-[0_12px_30px_-12px_rgba(11,20,24,.18)]",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <NeedAvatar name={need.display_name} photoPath={need.cover_photo_path} size={44} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold">
            {need.display_name}
            {need.verified_at ? <BadgeCheck className="h-4 w-4 text-brand" aria-label="Verified" /> : null}
          </p>
          <p className="truncate text-xs text-muted">{need.city ? `${need.city}, ` : ""}{need.state}</p>
        </div>
        <CategoryBadge category={need.category} />
      </div>
      <p className="mt-4 line-clamp-2 text-[15px] font-medium leading-snug">&ldquo;{need.my_words}&rdquo;</p>
      <p className="mt-1 line-clamp-1 text-sm text-muted">{need.title}</p>
      <div className="mt-auto pt-5">
        <div className="h-2 overflow-hidden rounded-full bg-black/[.06]">
          <div className="h-full rounded-full bg-gradient-to-r from-brand to-mint" style={{ width: `${pct}%` }} />
        </div>
        <div className="tabular mt-2 flex justify-between text-xs">
          <span><span className="font-semibold text-ink">{naira(need.raised_kobo)}</span> <span className="text-muted">of {naira(need.amount_kobo)}</span></span>
          <span className="text-muted">{need.giver_count} {need.giver_count === 1 ? "giver" : "givers"}</span>
        </div>
      </div>
    </Link>
  );
}
